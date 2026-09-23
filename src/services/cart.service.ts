import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { connectDB } from "@/lib/db";
import { Cart } from "@/models/Cart";
import { Product } from "@/models/Product";
import { InventoryState } from "@/models/Inventory";
import { PricingService } from "./pricing.service";
import { InventoryService } from "./inventory.service";
import { AppError, InsufficientStockError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getSessionFromCookie } from "@/lib/auth-server";

export const GUEST_COOKIE = "m2s_guest";
export const MAX_QTY_PER_ITEM = 10;

export interface Identity {
  userId?: string;
  guestSessionId?: string;
  isGuest: boolean;
}

export async function resolveIdentity(): Promise<Identity> {
  const session = await getSessionFromCookie().catch(() => null);
  const cookieStore = await cookies();
  let guestSessionId = cookieStore.get(GUEST_COOKIE)?.value;
  if (!guestSessionId) {
    guestSessionId = randomUUID();
    cookieStore.set(GUEST_COOKIE, guestSessionId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 60 * 60 });
  }
  if (session?.userId) return { userId: session.userId, guestSessionId, isGuest: false };
  return { guestSessionId, isGuest: true };
}

export async function getOrCreateCart(identity: Identity): Promise<InstanceType<typeof Cart>> {
  await connectDB();
  if (identity.userId) {
    const existing = await Cart.findOne({ userId: identity.userId });
    if (existing) return existing;
    try {
      return await Cart.create({ userId: identity.userId });
    } catch (e: any) {
      // Lost the upsert race — another request created it first.
      if (e?.code === 11000 || e?.code === 11001) {
        const raced = await Cart.findOne({ userId: identity.userId });
        if (raced) return raced;
      }
      throw e;
    }
  }
  const guestId = identity.guestSessionId;
  if (!guestId) throw new AppError("Guest session missing", 400, "NO_GUEST_SESSION");
  const existing = await Cart.findOne({ guestSessionId: guestId });
  if (existing) return existing;
  try {
    return await Cart.create({ guestSessionId: guestId });
  } catch (e: any) {
    if (e?.code === 11000 || e?.code === 11001) {
      const raced = await Cart.findOne({ guestSessionId: guestId });
      if (raced) return raced;
    }
    throw e;
  }
}

async function resolveSku(productId?: string, sku?: string) {
  await connectDB();
  if (sku) {
    const norm = sku.toUpperCase();
    // Find owning product if productId missing
    if (!productId) {
      const inv = await InventoryState.findOne({ sku: norm }).lean() as any;
      if (!inv) throw new AppError(`SKU ${norm} not found`, 404, "SKU_NOT_FOUND");
      return { product: await Product.findById(inv.productId), sku: norm };
    }
    const product = await Product.findById(productId);
    if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
    return { product, sku: norm };
  }
  // sku missing -> resolve from product
  const product: any = await Product.findById(productId);
  if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
  if (product.hasVariants) {
    // Require explicit variant SKU; fall back to first active variant for convenience
    const first = (product.variants || []).find((v: any) => v.isActive);
    if (!first) throw new AppError("No active variants for this product", 400, "NO_VARIANTS");
    return { product, sku: String(first.sku).toUpperCase() };
  }
  if (product.baseSKU) return { product, sku: String(product.baseSKU).toUpperCase() };
  const inv: any = await InventoryState.findOne({ productId: product._id }).lean();
  if (inv) return { product, sku: inv.sku };
  throw new AppError("SKU is required for this product", 400, "SKU_REQUIRED");
}

export class CartService {
  static async add(identity: Identity, input: { productId?: string; sku?: string; quantity?: number }) {
    const qty = Math.min(MAX_QTY_PER_ITEM, Math.max(1, input.quantity || 1));
    const { product, sku } = await resolveSku(input.productId, input.sku);
    if (!product || (product as any).status !== "PUBLISHED") {
      throw new AppError("Product not found or not available", 404, "NOT_FOUND");
    }
    // Variant must be active if applicable
    if ((product as any).hasVariants) {
      const variant = ((product as any).variants || []).find((v: any) => String(v.sku).toUpperCase() === sku);
      if (!variant || variant.isActive === false) {
        throw new AppError("Selected variant is not available", 400, "VARIANT_UNAVAILABLE");
      }
    }
    const cart = await getOrCreateCart(identity);
    const existing = cart.items.find((i: any) => i.sku === sku);
    const newTotal = Math.min(MAX_QTY_PER_ITEM, (existing?.quantity || 0) + qty);
    const avail = await InventoryService.getAvailable(String((product as any)._id), sku);
    if (avail.available < 1) throw new InsufficientStockError("This item is currently out of stock");
    if (newTotal > avail.available) {
      throw new InsufficientStockError(`Only ${avail.available} units available for ${sku}`);
    }
    if (existing) existing.quantity = newTotal;
    else cart.items.push({ productId: (product as any)._id, sku, quantity: newTotal, addedAt: new Date() } as any);
    await cart.save();
    logger.info("Added to cart", "cart", { sku, quantity: newTotal });
    return this.view(identity);
  }

  static async updateQty(identity: Identity, sku: string, quantity: number) {
    const norm = sku.toUpperCase();
    const cart = await getOrCreateCart(identity);
    const idx = cart.items.findIndex((i: any) => i.sku === norm);
    if (idx < 0) throw new AppError("Item not in cart", 404, "NOT_FOUND");
    if (quantity <= 0) {
      cart.items.splice(idx, 1);
      await cart.save();
      return this.view(identity);
    }
    const capped = Math.min(MAX_QTY_PER_ITEM, quantity);
    const item = cart.items[idx] as any;
    const avail = await InventoryService.getAvailable(String(item.productId), norm);
    if (capped > avail.available) {
      throw new InsufficientStockError(`Only ${avail.available} units available for ${norm}`);
    }
    item.quantity = capped;
    await cart.save();
    return this.view(identity);
  }

  static async remove(identity: Identity, sku: string) {
    const norm = sku.toUpperCase();
    const cart = await getOrCreateCart(identity);
    cart.items = cart.items.filter((i: any) => i.sku !== norm) as any;
    await cart.save();
    return this.view(identity);
  }

  static async clear(identity: Identity) {
    const cart = await getOrCreateCart(identity);
    cart.items = [] as any;
    cart.appliedCouponCode = "";
    await cart.save();
    return this.view(identity);
  }

  static async applyCoupon(identity: Identity, code: string) {
    const cart = await getOrCreateCart(identity);
    const view = await this.view(identity);
    const check = await PricingService.validateCoupon(code, identity.userId, view.pricing.subtotal);
    if (!check.valid) throw new AppError(check.message, 400, "COUPON_INVALID");
    cart.appliedCouponCode = code.toUpperCase();
    await cart.save();
    return this.view(identity);
  }

  static async removeCoupon(identity: Identity) {
    const cart = await getOrCreateCart(identity);
    cart.appliedCouponCode = "";
    await cart.save();
    return this.view(identity);
  }

  /**
   * Server-validated cart view. Never trusts client prices.
   * Returns enriched items + pricing + issues (out-of-stock, price changes, unpublished).
   */
  static async view(identity: Identity, opts?: { useCOD?: boolean }) {
    const cart = await getOrCreateCart(identity);
    const enriched: any[] = [];
    const issues: Array<{ sku: string; type: string; message: string; available?: number }> = [];

    for (const item of cart.items as any[]) {
      const product: any = await Product.findById(item.productId).lean();
      if (!product || product.status !== "PUBLISHED") {
        issues.push({ sku: item.sku, type: "UNAVAILABLE", message: `${item.sku} is no longer available` });
        continue;
      }
      const variant = (product.variants || []).find((v: any) => String(v.sku).toUpperCase() === item.sku);
      if (product.hasVariants && (!variant || variant.isActive === false)) {
        issues.push({ sku: item.sku, type: "VARIANT_UNAVAILABLE", message: `Variant ${item.sku} is no longer available` });
        continue;
      }
      const unitPrice = variant?.salePrice || variant?.price || product.salePrice || product.basePrice;
      const mrp = variant?.price || product.basePrice;
      const avail = await InventoryService.getAvailable(String(product._id), item.sku);
      const qty = Math.min(item.quantity, avail.available);
      if (avail.available < 1) {
        issues.push({ sku: item.sku, type: "OUT_OF_STOCK", message: `${product.name} is out of stock`, available: 0 });
        continue;
      }
      if (qty < item.quantity) {
        issues.push({ sku: item.sku, type: "QTY_CLAMPED", message: `Only ${avail.available} units available`, available: avail.available });
      }
      enriched.push({
        productId: String(product._id),
        sku: item.sku,
        quantity: qty,
        requestedQuantity: item.quantity,
        name: product.name,
        slug: product.slug,
        image: product.images?.[0]?.url,
        brand: product.brandId,
        attributes: variant?.attributes || {},
        unitPrice,
        mrp,
        discount: mrp > unitPrice ? Math.round((1 - unitPrice / mrp) * 100) : 0,
        lineTotal: unitPrice * qty,
        available: avail.available,
        addedAt: item.addedAt,
      });
    }

    let pricing;
    try {
      pricing = await PricingService.calculate(
        enriched.map((e) => ({ productId: e.productId, sku: e.sku, quantity: e.quantity })),
        cart.appliedCouponCode || undefined,
        identity.userId,
        opts?.useCOD
      );
    } catch (e: any) {
      // Coupon became invalid (e.g. min value) — drop it and recalc without coupon
      if (e?.code === "COUPON_NOT_ELIGIBLE") {
        cart.appliedCouponCode = "";
        await cart.save();
        pricing = await PricingService.calculate(
          enriched.map((e) => ({ productId: e.productId, sku: e.sku, quantity: e.quantity })),
          undefined,
          identity.userId,
          opts?.useCOD
        );
        issues.push({ sku: "", type: "COUPON_REMOVED", message: e.message });
      } else {
        throw e;
      }
    }

    return {
      items: enriched,
      rawCount: cart.items.length,
      totalItems: enriched.reduce((s, i) => s + i.quantity, 0),
      appliedCouponCode: cart.appliedCouponCode || "",
      pricing,
      issues,
    };
  }

  /** Merge guest cart into user cart on login. Sums quantities, caps by live availability. */
  static async mergeGuestIntoUser(guestSessionId: string, userId: string) {
    await connectDB();
    if (!guestSessionId) return { merged: 0 };
    const guest = await Cart.findOne({ guestSessionId });
    if (!guest || guest.items.length === 0) return { merged: 0 };
    let user = await Cart.findOne({ userId });
    if (!user) {
      try {
        user = await Cart.create({ userId });
      } catch (e: any) {
        if (e?.code === 11000 || e?.code === 11001) {
          const raced = await Cart.findOne({ userId });
          if (raced) user = raced;
          else throw e;
        } else throw e;
      }
    }
    let merged = 0;
    for (const g of guest.items as any[]) {
      const existing = user.items.find((i: any) => i.sku === g.sku);
      const avail = await InventoryService.getAvailable(String(g.productId), g.sku).catch(() => ({ available: 0 }));
      const want = Math.min(MAX_QTY_PER_ITEM, (existing?.quantity || 0) + g.quantity);
      const capped = Math.min(want, (avail as any).available ?? want);
      if (capped < 1) continue;
      if (existing) (existing as any).quantity = capped;
      else (user.items as any[]).push({ productId: g.productId, sku: g.sku, quantity: capped, addedAt: new Date() });
      merged++;
    }
    if (!user.appliedCouponCode && (guest as any).appliedCouponCode) {
      (user as any).appliedCouponCode = (guest as any).appliedCouponCode;
    }
    await user.save();
    await Cart.deleteOne({ _id: guest._id });
    logger.info("Guest cart merged", "cart", { userId, merged });
    return { merged };
  }
}
