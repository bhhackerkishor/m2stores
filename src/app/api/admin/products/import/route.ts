import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Category } from "@/models/Category";
import { Brand } from "@/models/Brand";
import { parseCsv, toCsv } from "@/lib/csv";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

/** Export catalog as CSV (admin). */
export async function GET() {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "reports.export" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Export permission required"), { status: 403 });
    }
    await connectDB();
    const products: any[] = await Product.find().populate("categoryId", "slug").populate("brandId", "slug").limit(10000).lean();
    const headers = ["slug", "name", "categorySlug", "brandSlug", "basePrice", "salePrice", "baseSKU", "status", "tags"];
    const rows = products.map((p) => [
      p.slug, p.name, (p.categoryId as any)?.slug || "", (p.brandId as any)?.slug || "",
      p.basePrice, p.salePrice || "", p.baseSKU || "", p.status, (p.tags || []).join("|"),
    ]);
    return new NextResponse(toCsv(headers, rows), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="m2stores-products-${new Date().toISOString().slice(0, 10)}.csv"` },
    });
  } catch (error: any) {
    logger.error("Product export error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Export failed"), { status: 500 });
  }
}

/**
 * Import catalog from CSV. Validates every row before writing; returns per-row
 * errors without partial silent failures (valid rows upsert, invalid reported).
 * Expected headers: slug,name,categorySlug,brandSlug,basePrice,salePrice,baseSKU,status,tags
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "products.write" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Products write permission required"), { status: 403 });
    }
    const text = await request.text();
    if (!text.trim()) return NextResponse.json(errorResponse("VALIDATION_ERROR", "Empty CSV body"), { status: 400 });
    const { headers, rows, errors: parseErrors } = parseCsv(text);
    const required = ["slug", "name", "categorySlug", "basePrice"];
    const missing = required.filter((r) => !headers.includes(r));
    if (missing.length > 0) {
      return NextResponse.json(errorResponse("VALIDATION_ERROR", `Missing headers: ${missing.join(", ")}`), { status: 400 });
    }
    await connectDB();
    const idx = (h: string) => headers.indexOf(h);
    let created = 0;
    let updated = 0;
    const errors: Array<{ row: number; message: string }> = parseErrors.map((m) => ({ row: 0, message: m }));

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const lineNo = i + 2;
      try {
        const slug = (r[idx("slug")] || "").trim().toLowerCase();
        const name = (r[idx("name")] || "").trim();
        const categorySlug = (r[idx("categorySlug")] || "").trim().toLowerCase();
        const basePrice = parseFloat(r[idx("basePrice")] || "");
        if (!slug || !name || !categorySlug || Number.isNaN(basePrice) || basePrice < 0) {
          throw new Error("slug, name, categorySlug and basePrice>=0 are required");
        }
        const category: any = await Category.findOne({ slug: categorySlug }).lean();
        if (!category) throw new Error(`unknown categorySlug '${categorySlug}'`);
        let brandId: any = undefined;
        const brandSlug = idx("brandSlug") >= 0 ? (r[idx("brandSlug")] || "").trim().toLowerCase() : "";
        if (brandSlug) {
          const brand: any = await Brand.findOne({ slug: brandSlug }).lean();
          if (!brand) throw new Error(`unknown brandSlug '${brandSlug}'`);
          brandId = brand._id;
        }
        const saleRaw = idx("salePrice") >= 0 ? (r[idx("salePrice")] || "").trim() : "";
        const salePrice = saleRaw ? parseFloat(saleRaw) : undefined;
        if (saleRaw && (Number.isNaN(salePrice!) || salePrice! < 0)) throw new Error("invalid salePrice");
        const statusRaw = (idx("status") >= 0 ? r[idx("status")] : "DRAFT").trim().toUpperCase() || "DRAFT";
        if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusRaw)) throw new Error("status must be DRAFT/PUBLISHED/ARCHIVED");
        const doc: any = {
          name,
          description: name,
          categoryId: category._id,
          basePrice,
          status: statusRaw,
        };
        if (brandId) doc.brandId = brandId;
        if (salePrice !== undefined) doc.salePrice = salePrice;
        if (idx("baseSKU") >= 0 && (r[idx("baseSKU")] || "").trim()) doc.baseSKU = (r[idx("baseSKU")] || "").trim().toUpperCase();
        if (idx("tags") >= 0 && (r[idx("tags")] || "").trim()) doc.tags = (r[idx("tags")] || "").split("|").map((t) => t.trim()).filter(Boolean);

        const res = await Product.findOneAndUpdate({ slug }, { $set: doc, $setOnInsert: { slug } }, { upsert: true, new: true, setDefaultsOnInsert: true, rawResult: true } as any);
        if ((res as any)?.lastErrorObject?.updatedExisting) updated++;
        else created++;
      } catch (e: any) {
        errors.push({ row: lineNo, message: e?.message || "Row failed" });
      }
    }

    return NextResponse.json(successResponse({ created, updated, failed: errors.length, errors: errors.slice(0, 100) }));
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Product import error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Import failed"), { status: 500 });
  }
}
