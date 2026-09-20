"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Invoice } from "@/components/orders/Invoice";
import { timelineFor, allowedNext, adminAllowedStatuses, describeStatus } from "@/services/order-status";
import { formatPrice } from "@/lib/utils";

export function AdminOrderDetailClient({ order, payment }: { order: any; payment: any }) {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [tracking, setTracking] = useState(order.shippingDetails?.trackingNumber || "");
  const [courier, setCourier] = useState(order.shippingDetails?.courier || "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const tl = timelineFor(order.orderStatus, order.statusHistory || []);

  const submit = async () => {
    if (!to) {
      setError("Select a status.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to, notes: notes || undefined, trackingNumber: tracking || undefined, courier: courier || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Update failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold font-mono">{order.orderNumber}</h1>
        <span className="px-3 py-1 bg-surface-100 rounded-full text-sm font-semibold">{order.orderStatus}</span>
      </div>
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-6">
          <Card>
            <h3 className="font-semibold mb-4">Fulfillment Timeline</h3>
            <OrderTimeline placedAt={tl.placedAt} steps={tl.steps} terminal={tl.terminal} />
          </Card>
          <Invoice order={order} />
          {payment && (
            <Card>
              <h3 className="font-semibold mb-2">Payment</h3>
              <p className="text-sm">{payment.provider} · {payment.status} · {formatPrice(payment.amount)}</p>
              <p className="text-xs text-surface-500 font-mono mt-1">{payment.merchantTransactionId}</p>
            </Card>
          )}
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-3">Update Status</h3>
            <p className="text-xs text-surface-500 mb-2">Current: <span className="font-semibold text-surface-700">{order.orderStatus}</span> — Admin can move to any non-terminal status.</p>
            <select value={to} onChange={(e) => setTo(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white mb-3">
              <option value="">Select next status…</option>
              {adminAllowedStatuses().filter((s) => s !== order.orderStatus).map((s) => (
                <option key={s} value={s}>{describeStatus(s)} ({s})</option>
              ))}
            </select>
            {(to === "SHIPPED" || !order.shippingDetails?.trackingNumber) && (
              <>
                <Input value={tracking} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTracking(e.target.value)} placeholder="Tracking number" className="mb-2" />
                <Input value={courier} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourier(e.target.value)} placeholder="Courier" className="mb-2" />
              </>
            )}
            <Input value={notes} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)} placeholder="Notes (optional)" className="mb-3" />
            <Button className="w-full" onClick={submit} isLoading={busy}>Apply Transition</Button>
            <p className="text-xs text-surface-500 mt-2">Cancelling releases reserved stock or restocks committed lines + refunds captured payments. All actions audit-logged.</p>
          </Card>
          <Card>
            <h3 className="font-semibold mb-2">Customer</h3>
            <p className="text-sm font-mono">{String(order.userId)}</p>
            <p className="text-sm mt-1">{order.shippingAddress?.fullName} · {order.shippingAddress?.phone}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
