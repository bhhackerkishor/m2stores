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
import { useToast } from "@/components/providers/ToastProvider";
import { CheckCircle, CreditCard, RotateCcw, MapPin, Calendar, Package, AlertTriangle } from "lucide-react";

export function AdminOrderDetailClient({ order, payment }: { order: any; payment: any }) {
  const router = useRouter();
  const toast = useToast();
  const [to, setTo] = useState("");
  const [tracking, setTracking] = useState(order.shippingDetails?.trackingNumber || "");
  const [courier, setCourier] = useState(order.shippingDetails?.courier || "");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundBusy, setRefundBusy] = useState(false);
  const [refundError, setRefundError] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [locationNote, setLocationNote] = useState("");
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [etaDate, setEtaDate] = useState("");
  const [etaReason, setEtaReason] = useState("");
  const [etaBusy, setEtaBusy] = useState(false);
  const [etaError, setEtaError] = useState("");
  const tl = timelineFor(order.orderStatus, order.statusHistory || []);

  const canApproveCancellation = ["CONFIRMED", "PROCESSING", "PENDING_PAYMENT"].includes(order.orderStatus);
  const canInitiateRefund = ["CANCELLED", "DELIVERED", "PAYMENT_RECEIVED"].includes(order.orderStatus) && payment?.status === "PAID";
  const canMarkRefunded = order.orderStatus === "REFUND_PENDING";
  const canManageDelivery = ["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.orderStatus);

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
      toast.success("Status updated", `Order moved to ${to}`);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleApproveCancellation = async () => {
    if (!cancelReason.trim()) {
      setCancelError("Cancellation reason is required");
      return;
    }
    setCancelBusy(true);
    setCancelError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "CANCELLED", notes: cancelReason }),
      });
      const data = await res.json();
      if (!data.success) {
        setCancelError(data.error?.message || "Cancellation failed");
        return;
      }
      toast.success("Order cancelled", "Order has been cancelled successfully.");
      router.refresh();
    } catch {
      setCancelError("Failed to cancel order");
    } finally {
      setCancelBusy(false);
    }
  };

  const handleInitiateRefund = async () => {
    const amount = refundAmount ? parseFloat(refundAmount) : undefined;
    if (!refundReason.trim()) {
      setRefundError("Refund reason is required");
      return;
    }
    if (amount !== undefined && (isNaN(amount) || amount <= 0)) {
      setRefundError("Invalid refund amount");
      return;
    }
    setRefundBusy(true);
    setRefundError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, reason: refundReason }),
      });
      const data = await res.json();
      if (!data.success) {
        setRefundError(data.error?.message || "Refund failed");
        return;
      }
      toast.success("Refund initiated", "Refund has been processed successfully.");
      router.refresh();
    } catch {
      setRefundError("Failed to initiate refund");
    } finally {
      setRefundBusy(false);
    }
  };

  const handleMarkRefunded = async () => {
    setRefundBusy(true);
    setRefundError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: "REFUNDED", notes: "Refund confirmed by admin" }),
      });
      const data = await res.json();
      if (!data.success) {
        setRefundError(data.error?.message || "Update failed");
        return;
      }
      toast.success("Marked as refunded", "Order has been marked as refunded.");
      router.refresh();
    } catch {
      setRefundError("Failed to mark as refunded");
    } finally {
      setRefundBusy(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!locationName.trim()) { setLocationError("Location name is required"); return; }
    setLocationBusy(true);
    setLocationError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}/delivery/update-location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ location: locationName, city: locationCity || undefined, note: locationNote || undefined }),
      });
      const data = await res.json();
      if (!data.success) { setLocationError(data.error?.message || "Update failed"); return; }
      setLocationName(""); setLocationCity(""); setLocationNote("");
      toast.success("Location updated", "Shipment location has been updated.");
      router.refresh();
    } catch { setLocationError("Failed to update location"); } finally { setLocationBusy(false); }
  };

  const handleUpdateEta = async () => {
    if (!etaDate) { setEtaError("Delivery date is required"); return; }
    if (!etaReason.trim() || etaReason.trim().length < 3) { setEtaError("Reason is required (min 3 characters)"); return; }
    setEtaBusy(true);
    setEtaError("");
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}/delivery/update-eta`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedDelivery: etaDate, reason: etaReason }),
      });
      const data = await res.json();
      if (!data.success) { setEtaError(data.error?.message || "Update failed"); return; }
      setEtaDate(""); setEtaReason("");
      toast.success("Delivery date updated", "ETA has been updated successfully.");
      router.refresh();
    } catch { setEtaError("Failed to update delivery date"); } finally { setEtaBusy(false); }
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
            <OrderTimeline placedAt={tl.placedAt} steps={tl.steps} terminal={tl.terminal} events={order.shippingDetails?.events} />
          </Card>
          <Invoice order={order} />
          {payment && (
            <Card>
              <h3 className="font-semibold mb-2">Payment</h3>
              <p className="text-sm">{payment.provider} · {payment.status} · {formatPrice(payment.amount)}</p>
              <p className="text-xs text-surface-500 font-mono mt-1">{payment.merchantTransactionId}</p>
            </Card>
          )}

          {/* Delivery Tracking Card */}
          {canManageDelivery && (
            <Card>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Package className="w-4 h-4" /> Delivery Tracking</h3>

              {/* Current Location */}
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-medium text-blue-700 mb-1">Currently At</p>
                <p className="text-sm font-semibold text-blue-900">{order.shippingDetails?.currentlyAt || "Not updated yet"}</p>
                {order.shippingDetails?.estimatedDelivery && (
                  <p className="text-xs text-blue-600 mt-1">
                    <Calendar className="w-3 h-3 inline mr-1" />
                    Est. Delivery: {new Date(order.shippingDetails.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                )}
              </div>

              {/* Update Location */}
              <div className="space-y-2 mb-4">
                <p className="text-xs font-medium text-surface-600">Update Location</p>
                <Input value={locationName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationName(e.target.value)} placeholder="Location name (e.g., Delhi Hub)" className="text-sm" />
                <Input value={locationCity} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationCity(e.target.value)} placeholder="City (optional)" className="text-sm" />
                <Input value={locationNote} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocationNote(e.target.value)} placeholder="Note (optional)" className="text-sm" />
                {locationError && <p className="text-xs text-red-600">{locationError}</p>}
                <Button size="sm" className="w-full" onClick={handleUpdateLocation} isLoading={locationBusy}>
                  <MapPin className="w-3 h-3 mr-1" /> Update Location
                </Button>
              </div>

              {/* Update ETA */}
              <div className="space-y-2 border-t pt-3">
                <p className="text-xs font-medium text-surface-600">Update Estimated Delivery</p>
                <Input type="date" value={etaDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEtaDate(e.target.value)} className="text-sm" />
                <Input value={etaReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEtaReason(e.target.value)} placeholder="Reason for change (shown to customer)" className="text-sm" />
                {etaError && <p className="text-xs text-red-600">{etaError}</p>}
                <Button size="sm" variant="outline" className="w-full" onClick={handleUpdateEta} isLoading={etaBusy}>
                  <Calendar className="w-3 h-3 mr-1" /> Update Delivery Date
                </Button>
              </div>

              {/* Delivery Change History */}
              {order.shippingDetails?.deliveryChanges?.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium text-surface-600 mb-2">ETA Change History</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {order.shippingDetails.deliveryChanges.map((ch: any, i: number) => (
                      <div key={i} className="text-xs p-2 bg-surface-50 rounded">
                        <div className="flex justify-between">
                          <span className="text-amber-700 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Changed</span>
                          <span className="text-surface-400">{new Date(ch.changedAt).toLocaleDateString("en-IN")}</span>
                        </div>
                        <p className="text-surface-600 mt-1">{ch.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Tracking Events */}
              {order.shippingDetails?.events?.length > 0 && (
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium text-surface-600 mb-2">Tracking Events</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {[...order.shippingDetails.events].reverse().slice(0, 5).map((ev: any, i: number) => (
                      <div key={i} className="text-xs flex gap-2">
                        <span className="text-surface-400 shrink-0">{new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                        <span className="text-surface-700">{ev.status}{ev.location ? ` — ${ev.location}` : ""}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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

          {/* Quick Actions: Cancel / Refund */}
          {(canApproveCancellation || canInitiateRefund || canMarkRefunded) && (
            <Card>
              <h3 className="font-semibold mb-3">Quick Actions</h3>
              {canApproveCancellation && (
                <div className="space-y-2 mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-800 flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4" /> Approve Cancellation
                  </p>
                  <Input
                    value={cancelReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancelReason(e.target.value)}
                    placeholder="Cancellation reason"
                    className="mb-2"
                  />
                  {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
                  <Button variant="destructive" size="sm" className="w-full" onClick={handleApproveCancellation} isLoading={cancelBusy}>
                    Confirm Cancellation
                  </Button>
                </div>
              )}
              {canInitiateRefund && (
                <div className="space-y-2 mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm font-medium text-amber-800 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Initiate Refund
                  </p>
                  <Input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundAmount(e.target.value)}
                    placeholder={`Max: ${formatPrice(order.pricingSnapshot?.grandTotal || 0)}`}
                    className="mb-2"
                  />
                  <Input
                    value={refundReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRefundReason(e.target.value)}
                    placeholder="Refund reason"
                    className="mb-2"
                  />
                  {refundError && <p className="text-xs text-red-600">{refundError}</p>}
                  <Button variant="outline" size="sm" className="w-full" onClick={handleInitiateRefund} isLoading={refundBusy}>
                    Process Refund
                  </Button>
                </div>
              )}
              {canMarkRefunded && (
                <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800 flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4" /> Mark as Refunded
                  </p>
                  <p className="text-xs text-green-700">Refund has been processed externally. Mark this order as fully refunded.</p>
                  {refundError && <p className="text-xs text-red-600">{refundError}</p>}
                  <Button variant="outline" size="sm" className="w-full" onClick={handleMarkRefunded} isLoading={refundBusy}>
                    Confirm Refund Complete
                  </Button>
                </div>
              )}
            </Card>
          )}
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
