import { connectDB } from "@/lib/db";
import { Review } from "@/models/Review";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { AuditLog } from "@/models/AuditLog";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export class ReviewService {
  /** Submission requires a non-cancelled order containing the product. Verified only if delivered. */
  static async submit(userId: string, input: { productId: string; rating: number; title: string; review: string; images?: string[] }) {
    await connectDB();
    if (input.rating < 1 || input.rating > 5) throw new AppError("Rating must be 1–5", 400, "VALIDATION_ERROR");
    if (!input.title.trim() || !input.review.trim()) throw new AppError("Title and review are required", 400, "VALIDATION_ERROR");

    const product: any = await Product.findById(input.productId).lean();
    if (!product || product.status !== "PUBLISHED") throw new AppError("Product not found", 404, "NOT_FOUND");

    const existing = await Review.findOne({ userId, productId: input.productId }).lean() as any;
    if (existing) throw new AppError("You have already reviewed this product", 409, "DUPLICATE");

    const orders: any[] = await Order.find({
      userId,
      orderStatus: { $nin: ["PENDING_PAYMENT", "CANCELLED"] },
      "items.productId": product._id,
    }).select("_id orderStatus items").lean();
    if (orders.length === 0) {
      throw new AppError("Only customers who purchased this product can review it", 403, "NOT_PURCHASED");
    }
    const delivered = orders.find((o) => o.orderStatus === "DELIVERED");
    const refOrder = delivered || orders[0];

    const created = await Review.create({
      productId: product._id,
      userId,
      orderId: refOrder._id,
      rating: input.rating,
      title: input.title.trim().slice(0, 200),
      review: input.review.trim().slice(0, 5000),
      images: (input.images || []).slice(0, 5),
      isVerifiedPurchase: Boolean(delivered),
      status: "PENDING",
    });
    logger.info("Review submitted", "review", { productId: input.productId, userId });
    return (created as any).toObject();
  }

  static async listApproved(productId: string, page = 1, limit = 10) {
    await connectDB();
    const filter = { productId, status: "APPROVED" };
    const total = await Review.countDocuments(filter);
    const items = await Review.find(filter).sort({ helpfulVotes: -1, createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean();
    const agg: any[] = await Review.aggregate([
      { $match: { productId: (await import("mongoose")).Types.ObjectId.createFromHexString(String(productId)), status: "APPROVED" } },
      { $group: { _id: "$rating", count: { $sum: 1 } } },
    ]).catch(() => []);
    const histogram: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const h of agg) histogram[h._id] = h.count;
    return { items, total, page, limit, totalPages: Math.ceil(total / limit), histogram };
  }

  static async voteHelpful(reviewId: string, userId: string) {
    await connectDB();
    const review: any = await Review.findById(reviewId);
    if (!review || review.status !== "APPROVED") throw new AppError("Review not found", 404, "NOT_FOUND");
    if ((review.votedUsers || []).map(String).includes(String(userId))) {
      throw new AppError("You already voted on this review", 409, "DUPLICATE");
    }
    review.votedUsers.push(userId as any);
    review.helpfulVotes = (review.helpfulVotes || 0) + 1;
    await review.save();
    return { helpfulVotes: review.helpfulVotes };
  }

  static async moderate(reviewId: string, action: "approve" | "hide" | "delete", adminId: string) {
    await connectDB();
    const review: any = await Review.findById(reviewId);
    if (!review) throw new AppError("Review not found", 404, "NOT_FOUND");
    const to = action === "approve" ? "APPROVED" : action === "hide" ? "HIDDEN" : "DELETED";
    review.status = to;
    await review.save();
    await this.recomputeAggregates(String(review.productId));
    try {
      await AuditLog.create({
        admin: adminId as any,
        action: action === "approve" ? "REVIEW_APPROVED" : action === "hide" ? "REVIEW_REJECTED" : "REVIEW_DELETED",
        entity: "Review",
        entityId: String(review._id),
        timestamp: new Date(),
      });
    } catch { /* best-effort */ }
    return review.toObject();
  }

  static async recomputeAggregates(productId: string) {
    const agg: any[] = await Review.aggregate([
      { $match: { productId: (await import("mongoose")).Types.ObjectId.createFromHexString(productId), status: "APPROVED" } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    await Product.findByIdAndUpdate(productId, {
      $set: { averageRating: Math.round(((agg[0]?.avg || 0) as number) * 10) / 10, totalReviews: agg[0]?.count || 0 },
    });
  }

  static async adminList(status?: string, page = 1, limit = 20) {
    await connectDB();
    const filter: any = {};
    if (status) filter.status = status;
    const total = await Review.countDocuments(filter);
    const items = await Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate("productId", "name slug").lean();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
