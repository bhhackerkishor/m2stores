import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth-server";
import { hasPermission } from "@/config/permissions";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Order } from "@/models/Order";
import { Address } from "@/models/Address";
import { SupportTicket } from "@/models/SupportTicket";
import { logger } from "@/lib/logger";
import { errorResponse, successResponse } from "@/lib/api-response";
import { AppError } from "@/lib/errors";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSessionFromCookie().catch(() => null);
    if (!session) return NextResponse.json(errorResponse("UNAUTHORIZED", "Login required"), { status: 401 });
    if (!hasPermission(session.role, "customers.read" as any)) {
      return NextResponse.json(errorResponse("FORBIDDEN", "Customers permission required"), { status: 403 });
    }
    await connectDB();
    const { id } = await params;
    const user: any = await User.findById(id).select("-passwordHash -otp -otpExpiresAt").lean();
    if (!user || user.role !== "CUSTOMER") return NextResponse.json(errorResponse("NOT_FOUND", "Customer not found"), { status: 404 });
    const [orders, addresses, tickets, spendAgg] = await Promise.all([
      Order.find({ userId: id }).sort({ createdAt: -1 }).limit(20).lean(),
      Address.find({ userId: id }).lean(),
      SupportTicket.find({ user: id }).sort({ createdAt: -1 }).limit(10).lean(),
      Order.aggregate([
        { $match: { userId: (user as any)._id, "paymentInfo.status": "PAID", orderStatus: { $ne: "CANCELLED" } } },
        { $group: { _id: null, total: { $sum: "$pricingSnapshot.grandTotal" }, count: { $sum: 1 } } },
      ]),
    ]);
    return NextResponse.json(
      successResponse({
        user,
        stats: { totalSpent: spendAgg[0]?.total || 0, orders: spendAgg[0]?.count || 0 },
        orders,
        addresses,
        tickets,
      })
    );
  } catch (error: any) {
    if (error instanceof AppError) return NextResponse.json(errorResponse(error.code, error.message), { status: error.statusCode });
    logger.error("Admin customer detail error", "admin", { error: String(error) });
    return NextResponse.json(errorResponse("INTERNAL_ERROR", "Failed to fetch customer"), { status: 500 });
  }
}
