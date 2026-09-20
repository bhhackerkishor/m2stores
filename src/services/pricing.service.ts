import { connectDB } from "@/lib/db";
import { Product } from "@/models/Product";
import { Coupon } from "@/models/Coupon";
import { Setting } from "@/models/Setting";
import { AppError } from "@/lib/errors";
import { ShippingService, ShippingMethod } from "./shipping.service";

export interface PricingBreakdown {
  subtotal: number;
  itemsDiscount: number;
  couponDiscount: number;
  couponCode: string;
  offerDiscount: number;
  offerId?: string;
  offerTitle?: string;
  shippingFee: number;
  codFee: number;
  taxTotal: number;
  grandTotal: number;
}

export interface PricedLine {
  productId: string;
  sku: string;
  quantity: number;
  name: string;
  image?: string;
  attributes: Record<string, string>;
  unitPrice: number;
  mrp: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  categoryId?: string;
  brandId?: string;
}

const round = (n: number) => Math.round(n * 100) / 100;

export class PricingService {
  /**
   * Server-side price resolution. Never trusts client totals.
   * - Resolves unit price from variant/sale/base
   * - Per-item GST from product.taxRate
   * - Coupon with min-value, expiry, usage, first-order, category/brand/product scoping
   * - Shipping fee by method + free-shipping threshold, COD fee from settings
   */
  static async priceLines(
    items: Array<{ productId: string; sku: string; quantity: number }>
  ): Promise<{ lines: PricedLine[]; subtotal: number; taxTotal: number }> {
    await connectDB();
    const lines: PricedLine[] = [];
    let subtotal = 0;
    let taxTotal = 0;

    for (const item of items) {
      const product: any = await Product.findById(item.productId).lean();
      if (!product || product.status !== "PUBLISHED") {
        throw new AppError(`Product ${item.sku} is no longer available`, 404, "PRODUCT_UNAVAILABLE");
      }
      const sku = item.sku.toUpperCase();
      const variant = (product.variants || []).find((v: any) => String(v.sku).toUpperCase() === sku);
      if (product.hasVariants && (!variant || variant.isActive === false)) {
        throw new AppError(`Variant ${sku} is not available`, 400, "VARIANT_UNAVAILABLE");
      }
      const unitPrice = variant?.salePrice || variant?.price || product.salePrice || product.basePrice;
      const mrp = variant?.price || product.basePrice;
      const taxRate = product.taxRate ?? 18;
      const lineTotal = unitPrice * item.quantity;
      // Tax inclusive-style: compute GST portion embedded? We treat price as inclusive and extract? 
      // Simpler & transparent: tax = lineTotal * rate/(100+rate) if inclusive. But Indian MRP is usually inclusive.
      // For checkout clarity we compute tax as exclusive addition like current cart does.
      const taxAmount = round((lineTotal * taxRate) / 100);
      subtotal += lineTotal;
      taxTotal += taxAmount;
      lines.push({
        productId: String(product._id),
        sku,
        quantity: item.quantity,
        name: product.name,
        image: product.images?.[0]?.url,
        attributes: variant?.attributes || {},
        unitPrice,
        mrp,
        taxRate,
        taxAmount,
        lineTotal,
        categoryId: product.categoryId ? String(product.categoryId) : undefined,
        brandId: product.brandId ? String(product.brandId) : undefined,
      });
    }
    return { lines, subtotal: round(subtotal), taxTotal: round(taxTotal) };
  }

  static async calculate(
    items: Array<{ productId: string; sku: string; quantity: number }>,
    couponCode?: string,
    userId?: string,
    useCOD = false,
    opts?: { shippingMethod?: ShippingMethod; pincode?: string }
  ): Promise<PricingBreakdown> {
    const { lines, subtotal, taxTotal } = await this.priceLines(items);
    const itemsDiscount = round(
      lines.reduce((s, l) => s + Math.max(0, (l.mrp - l.unitPrice) * l.quantity), 0)
    );

    let couponDiscount = 0;
    let appliedCode = "";
    if (couponCode) {
      const res = await this.applyCouponToLines(couponCode, lines, subtotal, userId);
      couponDiscount = res.discount;
      appliedCode = res.code;
    }

    const shippingMethod = opts?.shippingMethod || "STANDARD";
    // Offers: best discount offer + free-shipping flag (deterministic, server-side)
    const { OfferService } = await import("./offer.service");
    const offer = await OfferService.evaluate(lines, subtotal - couponDiscount);
    let shippingFee = await ShippingService.feeFor(subtotal - couponDiscount - offer.discount, shippingMethod);
    if (offer.freeShipping) shippingFee = 0;

    let codFee = 0;
    if (useCOD) {
      const s: any = await Setting.findOne().lean();
      codFee = s?.codFee || 0;
    }

    const grandTotal = round(subtotal - couponDiscount - offer.discount + shippingFee + codFee + taxTotal);
    return {
      subtotal: round(subtotal),
      itemsDiscount,
      couponDiscount: round(couponDiscount),
      couponCode: appliedCode,
      offerDiscount: round(offer.discount),
      offerId: offer.offerId,
      offerTitle: offer.offerTitle,
      shippingFee: round(shippingFee),
      codFee: round(codFee),
      taxTotal,
      grandTotal,
    };
  }

  static async applyCouponToLines(
    code: string,
    lines: PricedLine[],
    subtotal: number,
    userId?: string
  ): Promise<{ discount: number; code: string }> {
    await connectDB();
    const coupon: any = await Coupon.findOne({ code: code.toUpperCase(), isActive: true }).lean();
    if (!coupon) throw new AppError("Invalid coupon code", 400, "COUPON_INVALID");
    const now = new Date();
    if (now < new Date(coupon.startDate) || now > new Date(coupon.expiryDate)) {
      throw new AppError("Coupon has expired", 400, "COUPON_EXPIRED");
    }
    if ((coupon.usageCount || 0) >= (coupon.usageLimitTotal ?? Infinity)) {
      throw new AppError("Coupon usage limit reached", 400, "COUPON_LIMIT");
    }
    if (subtotal < (coupon.minOrderValue || 0)) {
      throw new AppError(`Minimum order value of ₹${coupon.minOrderValue} required`, 400, "COUPON_MIN_VALUE");
    }
    if (coupon.isFirstOrderOnly && userId) {
      const { Order } = await import("@/models/Order");
      const existing = await Order.countDocuments({ userId });
      if (existing > 0) throw new AppError("Coupon is only valid for first orders", 400, "COUPON_NOT_ELIGIBLE");
    }
    if (userId && coupon.allowedUserIds?.length > 0 && !coupon.allowedUserIds.map(String).includes(String(userId))) {
      throw new AppError("Coupon is not valid for your account", 400, "COUPON_NOT_ELIGIBLE");
    }
    if (userId && coupon.perUserUsageCount?.[String(userId)] >= (coupon.perUserLimit ?? 1)) {
      throw new AppError("You have already used this coupon", 400, "COUPON_LIMIT");
    }

    // Scoped eligible subtotal
    let eligible = subtotal;
    const hasScope =
      (coupon.applicableCategoryIds?.length || 0) > 0 ||
      (coupon.applicableProductIds?.length || 0) > 0 ||
      (coupon.applicableBrandIds?.length || 0) > 0;
    if (hasScope) {
      const cats = new Set((coupon.applicableCategoryIds || []).map(String));
      const prods = new Set((coupon.applicableProductIds || []).map(String));
      const brands = new Set((coupon.applicableBrandIds || []).map(String));
      eligible = lines
        .filter((l) => (l.categoryId && cats.has(l.categoryId)) || (prods.has(l.productId)) || (l.brandId && brands.has(l.brandId)))
        .reduce((s, l) => s + l.lineTotal, 0);
      if (eligible <= 0) throw new AppError("Coupon is not applicable to items in your cart", 400, "COUPON_NOT_APPLICABLE");
    }

    let discount = 0;
    if (coupon.discountType === "PERCENTAGE") {
      discount = (eligible * coupon.discountValue) / 100;
      if (coupon.maxDiscountAmount) discount = Math.min(discount, coupon.maxDiscountAmount);
    } else {
      discount = Math.min(coupon.discountValue, eligible);
    }
    return { discount: round(discount), code: coupon.code };
  }

  static async validateCoupon(
    code: string,
    userId?: string,
    subtotal?: number,
    isFirstOrder?: boolean
  ): Promise<{ valid: boolean; discount: number; message: string }> {
    try {
      await connectDB();
      const coupon: any = await Coupon.findOne({ code: code.toUpperCase(), isActive: true }).lean();
      if (!coupon) return { valid: false, discount: 0, message: "Invalid coupon" };
      const now = new Date();
      if (now < new Date(coupon.startDate) || now > new Date(coupon.expiryDate)) {
        return { valid: false, discount: 0, message: "Coupon has expired" };
      }
      if ((coupon.usageCount || 0) >= (coupon.usageLimitTotal ?? Infinity)) {
        return { valid: false, discount: 0, message: "Coupon usage limit reached" };
      }
      if (subtotal !== undefined && subtotal < (coupon.minOrderValue || 0)) {
        return { valid: false, discount: 0, message: `Minimum order value of ₹${coupon.minOrderValue} required` };
      }
      if (coupon.isFirstOrderOnly && isFirstOrder === false) {
        return { valid: false, discount: 0, message: "Coupon is only for first orders" };
      }
      return { valid: true, discount: coupon.discountValue, message: "Coupon applied successfully" };
    } catch {
      return { valid: false, discount: 0, message: "Coupon validation failed" };
    }
  }
}
