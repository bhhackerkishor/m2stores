import { getSessionFromCookie } from "@/lib/auth-server";
import { OrderService } from "@/services/order.service";
import { ReturnService } from "@/services/return.service";
import { redirect, notFound } from "next/navigation";
import { OrderDetailClient } from "@/components/orders/OrderDetailClient";
import { ReturnSection } from "@/components/orders/ReturnSection";
import { connectDB } from "@/lib/db";
import { ReturnRequest } from "@/models/ReturnRequest";
import { getPublicSettings } from "@/lib/public-settings";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookie().catch(() => null);
  if (!session) redirect("/login?redirect=/orders");
  const { id } = await params;
  let order: any = null;
  try {
    order = await OrderService.getForCustomer(id, session.userId);
  } catch {
    notFound();
  }

  let eligibility: any = { eligible: false, reason: "", items: [], windowDays: 7 };
  let existing: any[] = [];
  let deliveryDays = 3;
  if (order.orderStatus === "DELIVERED") {
    try {
      eligibility = await ReturnService.eligibleItems(id, session.userId);
    } catch {
      eligibility = { eligible: false, reason: "", items: [], windowDays: 7 };
    }
    await connectDB();
    existing = await ReturnRequest.find({ orderNumber: id, userId: session.userId }).sort({ createdAt: -1 }).lean();
  }
  try {
    const pub = await getPublicSettings();
    deliveryDays = pub.deliveryDays;
  } catch {}

  return (
    <div>
      <OrderDetailClient order={JSON.parse(JSON.stringify(order))} deliveryDays={deliveryDays} />
      {(order.orderStatus === "DELIVERED" || existing.length > 0) && (
        <div className="max-w-5xl mx-auto px-4 pb-8">
          <ReturnSection
            orderNumber={order.orderNumber}
            eligible={eligibility.eligible}
            eligibilityReason={eligibility.reason}
            eligibleItems={JSON.parse(JSON.stringify(eligibility.items || []))}
            existing={JSON.parse(JSON.stringify(existing))}
            windowDays={eligibility.windowDays || 7}
          />
        </div>
      )}
    </div>
  );
}
