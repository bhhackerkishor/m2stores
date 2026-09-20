import { connectDB } from "@/lib/db";
import { Wishlist } from "@/models/Wishlist";
import { Product } from "@/models/Product";
import { InventoryState } from "@/models/Inventory";
import { InventoryService } from "./inventory.service";
import { CartService, Identity } from "./cart.service";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

async function resolveSku(productId?: string, sku?: string) {
  await connectDB();
  if (sku) {
    const norm = sku.toUpperCase();
    if (!productId) {
      const inv: any = await InventoryState.findOne({ sku: norm }).lean();
      if (!inv) throw new AppError(`SKU ${norm} not found`, 404, "SKU_NOT_FOUND");
      const product = await Product.findById(inv.productId);
      return { product, sku: norm };
    }
    const product = await Product.findById(productId);
    return { product, sku: norm };
  }
  const product: any = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
  if (product.hasVariants) {
    const first = (product.variants || []).find((v: any) => v.isActive);
    if (!first) throw new AppError("No active variants", 400, "NO_VARIANTS");
    return { product, sku: String(first.sku).toUpperCase() };
  }
  if (product.baseSKU) return { product, sku: String(product.baseSKU).toUpperCase() };
  const inv: any = await InventoryState.findOne({ productId: product._id }).lean();
  if (inv) return { product, sku: inv.sku };
  throw new AppError("SKU is required", 400, "SKU_REQUIRED");
}

async function getOrCreate(identity: Identity) {
  await connectDB();
  if (identity.userId) {
    let w = await Wishlist.findOne({ userId: identity.userId });
    if (!w) w = await Wishlist.create({ userId: identity.userId });
    return w;
  }
  let w = await Wishlist.findOne({ guestSessionId: identity.guestSessionId });
  if (!w) w = await Wishlist.create({ guestSessionId: identity.guestSessionId });
  return w;
}

export class WishlistService {
  static async view(identity: Identity) {
    const w = await getOrCreate(identity);
    const items: any[] = [];
    for (const it of w.items as any[]) {
      const product: any = await Product.findById(it.productId).lean();
      if (!product || product.status !== "PUBLISHED") continue;
      const variant = (product.variants || []).find((v: any) => String(v.sku).toUpperCase() === it.sku);
      const unitPrice = variant?.salePrice || variant?.price || product.salePrice || product.basePrice;

      const inv: any = await InventoryState.findOne({ productId: product._id, sku: it.sku })
        .select("stock reservedStock lowStockThreshold")
        .lean();
      const stock = inv?.stock ?? 0;
      const reserved = inv?.reservedStock ?? 0;
      const available = Math.max(0, stock - reserved);
      const isActive = variant ? variant.isActive : true;

      items.push({
        productId: String(product._id),
        sku: it.sku,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0]?.url,
        unitPrice,
        mrp: variant?.price || product.basePrice,
        inStock: available > 0,
        stock,
        available,
        isActive,
        addedAt: it.addedAt,
      });
    }
    return { items, total: items.length };
  }

  static async add(identity: Identity, input: { productId?: string; sku?: string }) {
    const { product, sku } = await resolveSku(input.productId, input.sku);
    if (!product || (product as any).status !== "PUBLISHED") throw new AppError("Product not available", 404, "NOT_FOUND");
    const w = await getOrCreate(identity);
    if (!w.items.some((i: any) => i.sku === sku)) {
      (w.items as any[]).push({ productId: (product as any)._id, sku, addedAt: new Date() });
      await w.save();
    }
    logger.info("Added to wishlist", "wishlist", { sku });
    return this.view(identity);
  }

  static async remove(identity: Identity, sku: string) {
    const norm = sku.toUpperCase();
    const w = await getOrCreate(identity);
    w.items = (w.items as any[]).filter((i: any) => i.sku !== norm) as any;
    await w.save();
    return this.view(identity);
  }

  static async moveToCart(identity: Identity, sku: string, quantity = 1) {
    const norm = sku.toUpperCase();
    const w = await getOrCreate(identity);
    const found = (w.items as any[]).find((i: any) => i.sku === norm);
    if (!found) throw new AppError("Item not in wishlist", 404, "NOT_FOUND");
    const cartView = await CartService.add(identity, { productId: String(found.productId), sku: norm, quantity });
    w.items = (w.items as any[]).filter((i: any) => i.sku !== norm) as any;
    await w.save();
    return cartView;
  }

  static async mergeGuestIntoUser(guestSessionId: string, userId: string) {
    await connectDB();
    if (!guestSessionId) return { merged: 0 };
    const guest = await Wishlist.findOne({ guestSessionId });
    if (!guest || guest.items.length === 0) return { merged: 0 };
    let user = await Wishlist.findOne({ userId });
    if (!user) user = await Wishlist.create({ userId });
    const existingSkus = new Set((user.items as any[]).map((i: any) => i.sku));
    let merged = 0;
    for (const g of guest.items as any[]) {
      if (!existingSkus.has(g.sku)) {
        (user.items as any[]).push({ productId: g.productId, sku: g.sku, addedAt: new Date() });
        merged++;
      }
    }
    await user.save();
    await Wishlist.deleteOne({ _id: guest._id });
    return { merged };
  }
}
