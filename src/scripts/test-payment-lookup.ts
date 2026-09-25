import "dotenv/config";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Order } from "@/models/Order";
import { Payment } from "@/models/Payment";
import { PaymentAnalyticsService } from "@/services/analytics/payment.analytics";
import { resolveRange } from "@/lib/analytics/dates";

async function main() {
  await connectDB();
  const r = resolveRange("30d");

  const paidOrders = await Order.find({
    "paymentInfo.status": "PAID",
    createdAt: { $gte: r.start, $lte: r.end },
  })
    .select("orderNumber paymentInfo.paymentId paymentInfo.method pricingSnapshot.grandTotal createdAt")
    .limit(200)
    .lean();

  const refObjectIds: Types.ObjectId[] = [];
  const refStrings: string[] = [];
  for (const o of paidOrders as any[]) {
    const raw = o.paymentInfo?.paymentId;
    if (!raw) continue;
    if (raw instanceof Types.ObjectId || Types.ObjectId.isValid(String(raw))) {
      refObjectIds.push(raw instanceof Types.ObjectId ? raw : new Types.ObjectId(String(raw)));
    } else {
      refStrings.push(String(raw));
    }
  }

  const payments =
    refObjectIds.length || refStrings.length
      ? await Payment.find({
          $or: [
            ...(refObjectIds.length ? [{ _id: { $in: refObjectIds } }] : []),
            ...(refStrings.length ? [{ paymentId: { $in: refStrings } }] : []),
          ],
        })
          .select("_id paymentId orderId amount status")
          .lean()
      : [];

  console.log("paid orders:", paidOrders.length);
  console.log("ref objectIds:", refObjectIds.length, "ref strings:", refStrings.length);
  console.log("payments matched:", payments.length);
  console.log(
    payments.slice(0, 5).map((p: any) => ({
      _id: String(p._id),
      paymentId: p.paymentId,
      amount: p.amount,
      status: p.status,
    }))
  );

  const exceptions = await PaymentAnalyticsService.findExceptions(r);
  console.log("exceptions:", exceptions.length);
  for (const e of exceptions) console.log(`  [${e.severity}] ${e.type}: ${e.title}`);

  const missing = paidOrders.filter((o: any) => o.paymentInfo?.paymentId && !payments.find((p: any) => String(p._id) === String(o.paymentInfo.paymentId)));
  console.log("paid orders still missing payment match:", missing.length);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
