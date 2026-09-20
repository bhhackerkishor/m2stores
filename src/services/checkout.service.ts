import { connectDB } from "@/lib/db";
import { withTransaction } from "@/lib/transactions";
import mongoose from "mongoose";
import { Cart } from "@/models/Cart";
import { Order } from "@/models/Order";
import { Coupon } from "@/models/Coupon";
import { Product } from "@/models/Product";
import { CartService } from "./cart.service";
import { AddressService } from "./address.service";
import { PricingService } from "./pricing.service";
import { ShippingService, ShippingMethod } from "./shipping.service";
import { InventoryService } from "./inventory.service";
import { AppError, InsufficientStockError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { generateOrderNumber } from "@/lib/utils";

export interface CheckoutInput {
  userId: string;
  addressId: string;
  shippingMethod?: ShippingMethod;
  paymentMethod: "PHONEPE" | "COD";
  couponCode?: string;
  idempotencyKey?: string;
}

export class CheckoutService {
  static async validate(input: Omit<CheckoutInput, "idempotencyKey"> & { useCOD?: boolean }) {
    await connectDB();
    const { userId, addressId, shippingMethod = "STANDARD", paymentMethod, couponCode } = input;
    const address: any = await AddressService.get(userId, addressId);

    const cartView: any = await CartService.view({ userId, isGuest: false }, { useCOD: paymentMethod === "COD" });
    if (cartView.items.length === 0) {
      throw new AppError("Your cart is empty", 400, "EMPTY_CART");
    }
    if (cartView.issues.some((i: any) => i.type === "OUT_OF_STOCK" || i.type === "UNAVAILABLE")) {
      throw new AppError("Some items in your cart are no longer available. Please review your cart.", 409, "CART_INVALID");
    }

    // Re-price with requested shipping method + coupon (never trust client totals)
    const pricing = await PricingService.calculate(
      cartView.items.map((i: any) => ({ productId: i.productId, sku: i.sku, quantity: i.quantity })),
      couponCode || cartView.appliedCouponCode || undefined,
      userId,
      paymentMethod === "COD",
      { shippingMethod, pincode: address.pincode }
    );

    const shippingOptions = await ShippingService.options(pricing.subtotal - pricing.couponDiscount, shippingMethod);
    const selectedShipping = { ...shippingOptions.find((o) => o.method === shippingMethod)!, fee: pricing.shippingFee };

    let codCheck: any = { eligible: paymentMethod !== "COD", fee: 0 };
    if (paymentMethod === "COD") {
      codCheck = await ShippingService.checkCOD(pricing.subtotal - pricing.couponDiscount, address.pincode);
      if (!codCheck.eligible) throw new AppError(codCheck.reason || "COD not available", 400, "COD_UNAVAILABLE");
    }

    return {
      address,
      items: cartView.items,
      issues: cartView.issues,
      pricing,
      shippingOptions,
      selectedShipping,
      codCheck,
      shippable: true,
    };
  }

  static async createOrder(input: CheckoutInput) {
    const { userId, addressId, shippingMethod = "STANDARD", paymentMethod, couponCode, idempotencyKey } = input;
    await connectDB();

    if (idempotencyKey) {
      const existing: any = await Order.findOne({ idempotencyKey }).lean();
      if (existing) {
        logger.info("Duplicate create-order (idempotent)", "checkout", { idempotencyKey });
        return { order: existing, created: false };
      }
    }

    // Full server validation first (throws on OOS / bad coupon / COD ineligible)
    const checked = await this.validate({ userId, addressId, shippingMethod, paymentMethod, couponCode });

    const orderNumber = generateOrderNumber();
    const opKey = idempotencyKey || `${orderNumber}-${Date.now()}`;
    // Pre-generate the Order ObjectId so inventory docs (which require ObjectId
    // orderId) can reference it before/within the same transaction.
    const orderObjId = new mongoose.Types.ObjectId();

    return withTransaction(async (session) => {
      // Reserve every line with a unique, retry-safe operationId
      for (const item of checked.items) {
        try {
          await InventoryService.reserve({
            productId: item.productId,
            sku: item.sku,
            quantity: item.quantity,
            orderId: String(orderObjId),
            orderItemId: item.sku,
            operationId: `RES_${orderNumber}_${item.sku}`,
            reason: `Checkout reserve ${orderNumber}`,
          });
        } catch (e: any) {
          if (e?.code === "INSUFFICIENT_STOCK") {
            throw new InsufficientStockError(`${item.name} only has ${item.available} units available`);
          }
          throw e;
        }
      }

      // Build immutable snapshots from live product data
      const orderItems = await Promise.all(
        checked.items.map(async (item: any) => {
          const product: any = await Product.findById(item.productId).lean();
          const variant = (product?.variants || []).find((v: any) => String(v.sku).toUpperCase() === item.sku);
          const unitPrice = item.unitPrice;
          const taxRate = product?.taxRate ?? 18;
          const taxAmount = Math.round(((unitPrice * item.quantity * taxRate) / 100) * 100) / 100;
          const discountAmount = Math.max(0, (item.mrp - unitPrice) * item.quantity);
          return {
            productId: product._id,
            sku: item.sku,
            nameSnapshot: product.name,
            imageSnapshot: product.images?.[0]?.url || item.image || "",
            attributesSnapshot: item.attributes || variant?.attributes || {},
            unitPrice: item.mrp,
            salePrice: unitPrice,
            taxRate,
            taxAmount,
            discountAmount,
            quantity: item.quantity,
            finalLineTotal: unitPrice * item.quantity,
          };
        })
      );

      const addr = checked.address;
      const addressSnapshot = {
        fullName: addr.name,
        phone: addr.phone,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || "",
        landmark: addr.landmark || "",
        city: addr.city,
        state: addr.state,
        pincode: addr.pincode,
        country: addr.country || "India",
      };

      const created = await Order.create(
        [
          {
            _id: orderObjId,
            orderNumber,
            userId,
            items: orderItems,
            shippingAddress: addressSnapshot,
            billingAddress: addressSnapshot,
            pricingSnapshot: {
              subtotal: checked.pricing.subtotal,
              itemsDiscount: checked.pricing.itemsDiscount,
              couponDiscount: checked.pricing.couponDiscount,
              couponCode: checked.pricing.couponCode,
              offerDiscount: checked.pricing.offerDiscount || 0,
              offerId: checked.pricing.offerId,
              offerTitle: checked.pricing.offerTitle,
              shippingFee: checked.selectedShipping.fee,
              codFee: checked.pricing.codFee,
              taxTotal: checked.pricing.taxTotal,
              grandTotal: checked.pricing.subtotal - checked.pricing.couponDiscount - (checked.pricing.offerDiscount || 0) + checked.selectedShipping.fee + checked.pricing.codFee + checked.pricing.taxTotal,
            },
            paymentInfo: { method: paymentMethod, status: "PENDING" },
            orderStatus: paymentMethod === "COD" ? "CONFIRMED" : "PENDING_PAYMENT",
            statusHistory: [
              paymentMethod === "COD"
                ? { status: "PENDING_PAYMENT", timestamp: new Date(), notes: "Order placed (COD)" }
                : { status: "PENDING_PAYMENT", timestamp: new Date(), notes: `Order placed via ${paymentMethod}` },
              ...(paymentMethod === "COD"
                ? [{ status: "CONFIRMED", timestamp: new Date(), notes: "COD order confirmed (payment on delivery)" }]
                : []),
            ],
            shippingDetails: { estimatedDelivery: new Date(checked.selectedShipping.estimatedDelivery) },
            idempotencyKey: opKey,
          },
        ],
        session ? { session } : undefined
      );
      const order: any = Array.isArray(created) ? created[0] : created;

      // Coupon usage increment, per-user counted (best-effort, after order success)
      if (checked.pricing.couponCode) {
        await Coupon.findOneAndUpdate(
          { code: checked.pricing.couponCode },
          { $inc: { usageCount: 1, [`perUserUsageCount.${userId}`]: 1 } },
          session ? { session } : undefined
        ).catch(() => {});
      }

      // Clear cart (items + coupon) after successful reservation + order doc
      await Cart.findOneAndUpdate(
        { userId },
        { $set: { items: [], appliedCouponCode: "" } },
        session ? { session } : undefined
      );

      logger.info("Checkout order created", "checkout", { orderNumber, userId, paymentMethod });
      const createdOrder: any = order.toObject ? order.toObject() : order;
      const { NotificationService } = await import("./notification/notification.service");
      await NotificationService.notify("ORDER_CONFIRMED", {
        userId,
        orderNumber,
        total: `₹${createdOrder.pricingSnapshot.grandTotal}`,
        link: `/orders/${orderNumber}`,
      });
      return { order: createdOrder, created: true };
    });
  }
}
