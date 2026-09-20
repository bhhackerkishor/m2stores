/* eslint-disable no-console */
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { User } from "../models/User";
import { Category } from "../models/Category";
import { Product } from "../models/Product";
import { Order } from "../models/Order";
import { ReviewService } from "../services/review.service";
import { SupportService } from "../services/support.service";
import { NotificationService } from "../services/notification/notification.service";
import { Notification } from "../models/Notification";
import { __resetTxCache } from "../lib/transactions";

let passed = 0;
let failed = 0;
const ok = (n: string) => { passed++; console.log(`✅ PASS: ${n}`); };
const fail = (n: string, e: unknown) => { failed++; console.error(`❌ FAIL: ${n}`, e instanceof Error ? `${e.message} [${(e as any).code || ""}]` : e); };

async function main() {
  console.log("🧪 Starting reviews & support tests...");
  const replset = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: "wiredTiger" } });
  __resetTxCache();
  await mongoose.connect(replset.getUri());

  try {
    const buyer: any = await User.create({ name: "Reviewer", phone: `1${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const stranger: any = await User.create({ name: "Stranger", phone: `2${String(Date.now()).slice(-9)}`, role: "CUSTOMER", status: "ACTIVE", sessionVersion: 1 });
    const admin: any = await User.create({ name: "Mod", phone: `3${String(Date.now()).slice(-9)}`, role: "ADMIN", status: "ACTIVE", sessionVersion: 1 });
    const cat: any = await Category.create({ name: "R Cat", slug: `r-cat-${Date.now()}`, isActive: true });
    const prod: any = await Product.create({
      name: "Review Product", slug: `review-product-${Date.now()}`, description: "d", categoryId: cat._id,
      basePrice: 500, baseSKU: "REV-001", hasVariants: false, status: "PUBLISHED", taxRate: 18, images: [],
    });

    // 1. Non-purchaser blocked
    try {
      let threw = false;
      try {
        await ReviewService.submit(String(stranger._id), { productId: String(prod._id), rating: 5, title: "Great product", review: "Loved it a lot, works well." });
      } catch (err: any) {
        if (err?.code === "NOT_PURCHASED") threw = true;
      }
      if (!threw) throw new Error("expected NOT_PURCHASED");
      ok("non-purchasers cannot review");
    } catch (e) { fail("non-purchasers cannot review", e); }

    // Delivered order for buyer
    const order: any = await Order.create({
      orderNumber: `REV-ORD-${Date.now()}`, userId: buyer._id,
      items: [{ productId: prod._id, sku: "REV-001", nameSnapshot: prod.name, imageSnapshot: "", attributesSnapshot: {}, unitPrice: 500, salePrice: 500, taxRate: 18, taxAmount: 90, discountAmount: 0, quantity: 1, finalLineTotal: 500 }],
      shippingAddress: { fullName: "B", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
      billingAddress: { fullName: "B", phone: "9876543210", addressLine1: "123 St", addressLine2: "", city: "M", state: "MH", pincode: "400001", country: "India" },
      pricingSnapshot: { subtotal: 500, itemsDiscount: 0, couponDiscount: 0, couponCode: "", shippingFee: 0, codFee: 0, taxTotal: 90, grandTotal: 590 },
      paymentInfo: { method: "COD", status: "PAID" },
      orderStatus: "DELIVERED",
      statusHistory: [{ status: "DELIVERED", timestamp: new Date() }],
      idempotencyKey: `idem-rev-${Date.now()}`,
    });

    // 2. Verified purchase review
    let reviewId = "";
    try {
      const r: any = await ReviewService.submit(String(buyer._id), { productId: String(prod._id), rating: 5, title: "Excellent quality", review: "Exceeded expectations, highly recommended!" });
      if (!r.isVerifiedPurchase) throw new Error("expected verified purchase");
      if (r.status !== "PENDING") throw new Error("expected PENDING moderation");
      reviewId = String(r._id);
      ok("verified purchase review submitted (pending moderation)");
    } catch (e) { fail("verified purchase review submitted (pending moderation)", e); }

    // 3. Duplicate review blocked
    try {
      let threw = false;
      try {
        await ReviewService.submit(String(buyer._id), { productId: String(prod._id), rating: 4, title: "Second take", review: "Trying to review twice here." });
      } catch (err: any) {
        if (err?.code === "DUPLICATE") threw = true;
      }
      if (!threw) throw new Error("expected DUPLICATE");
      ok("duplicate reviews blocked");
    } catch (e) { fail("duplicate reviews blocked", e); }

    // 4. Moderation publishes + aggregates
    try {
      await ReviewService.moderate(reviewId, "approve", String(admin._id));
      const p: any = await Product.findById(prod._id).lean();
      if (p.totalReviews !== 1 || p.averageRating !== 5) throw new Error(`aggregates wrong: ${p.totalReviews}/${p.averageRating}`);
      const list: any = await ReviewService.listApproved(String(prod._id));
      if (list.total !== 1) throw new Error("approved list should have 1");
      ok("moderation publishes + recomputes aggregates");
    } catch (e) { fail("moderation publishes + recomputes aggregates", e); }

    // 5. Helpful vote once
    try {
      await ReviewService.voteHelpful(reviewId, String(stranger._id));
      let threw = false;
      try {
        await ReviewService.voteHelpful(reviewId, String(stranger._id));
      } catch (err: any) {
        if (err?.code === "DUPLICATE") threw = true;
      }
      if (!threw) throw new Error("expected DUPLICATE vote");
      ok("helpful votes counted once per user");
    } catch (e) { fail("helpful votes counted once per user", e); }

    // 6. Support ticket lifecycle
    try {
      const t: any = await SupportService.createTicket(String(buyer._id), { subject: "Where is my order?", category: "ORDER_ISSUE", message: "Please help track it." });
      if (t.status !== "OPEN") throw new Error("expected OPEN");
      const r1: any = await SupportService.adminReply(String(t._id), String(admin._id), "Checking with courier.", "IN_PROGRESS");
      if (r1.status !== "IN_PROGRESS") throw new Error(`expected IN_PROGRESS got ${r1.status}`);
      const r2: any = await SupportService.adminReply(String(t._id), String(admin._id), "Shipped, tracking shared.", "WAITING_FOR_CUSTOMER");
      if (r2.status !== "WAITING_FOR_CUSTOMER") throw new Error("expected WAITING");
      // Customer reply reopens to IN_PROGRESS
      const r3: any = await SupportService.customerReply(String(t._id), String(buyer._id), "Thanks, received!");
      if (r3.status !== "IN_PROGRESS") throw new Error(`expected reopen IN_PROGRESS got ${r3.status}`);
      const r4: any = await SupportService.adminReply(String(t._id), String(admin._id), "Glad to help!", "RESOLVED");
      if (r4.status !== "RESOLVED") throw new Error("expected RESOLVED");
      // Support reply generated a notification
      const n: any = await Notification.findOne({ userId: buyer._id, event: "SUPPORT_REPLY" }).lean();
      if (!n) throw new Error("expected SUPPORT_REPLY notification");
      ok("support lifecycle (open→reply→reopen→resolve + notify)");
    } catch (e) { fail("support lifecycle (open→reply→reopen→resolve + notify)", e); }

    // 7. Order events create notifications (non-blocking)
    try {
      const { NotificationService: NS } = await import("../services/notification/notification.service");
      await NS.notify("ORDER_CONFIRMED", { userId: String(buyer._id), orderNumber: order.orderNumber, total: "₹590" });
      const n: any = await Notification.findOne({ userId: buyer._id, event: "ORDER_CONFIRMED" }).lean();
      if (!n || !n.link?.includes(order.orderNumber)) throw new Error("notification missing/linked wrong");
      ok("order events fan out to in-app notifications");
    } catch (e) { fail("order events fan out to in-app notifications", e); }
  } finally {
    await mongoose.disconnect();
    await replset.stop();
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
  console.log("🎉 All review/support tests passed!");
}

main().catch((e) => {
  console.error("Fatal", e);
  process.exit(1);
});
