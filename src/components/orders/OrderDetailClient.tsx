"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Invoice } from "@/components/orders/Invoice";
import { formatPrice } from "@/lib/utils";
import { timelineFor, customerCanCancel } from "@/services/order-status";
import { 
  XCircle, 
  Package, 
  MapPin, 
  CreditCard, 
  AlertTriangle,
  ChevronLeft,
  Truck,
  ShieldCheck,
  RotateCcw,
  Zap,
  Headphones,
  Send,
  MessageSquare,
  RefreshCw // Added icon
} from "lucide-react";
import Link from "next/link";

export function OrderDetailClient({ order, deliveryDays = 3 }: { order: any; deliveryDays?: number }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [showCancel, setShowCancel] = useState(false);
  const [paying, setPaying] = useState(false);
  const [showTicket, setShowTicket] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: "", category: "ORDER_ISSUE", message: "" });
  const [ticketBusy, setTicketBusy] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  // Existing tickets for this order
  const [existingTicket, setExistingTicket] = useState<any>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false); // Added refreshing state
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const tl = timelineFor(order.orderStatus, order.statusHistory || []);
  const cancellable = customerCanCancel(order.orderStatus);
  const needsPayment = order.orderStatus === "PENDING_PAYMENT" || (order.paymentInfo?.status !== "PAID" && order.paymentInfo?.status !== "CREATED");
  const isCOD = order.paymentInfo?.method === "COD";
  // Fetch existing tickets for this order

  const fetchTickets = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch("/api/support");
      const d = await res.json();
      if (d.success && Array.isArray(d.data)) {
        const linked = d.data.find((t: any) => t.orderId === order._id || t.orderNumber === order.orderNumber);
        if (linked) setExistingTicket(linked);
      }
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    } finally {
      setTicketsLoading(false);
      if (isManual) setRefreshing(false);
    }
  }, [order._id, order.orderNumber]);

  // Fetch existing tickets on mount
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handlePayNow = async () => {
    setPaying(true);
    setError("");
    try {
      const res = await fetch("/api/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber: order.orderNumber }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Payment initiation failed");
        return;
      }
      if (data.data?.redirectUrl) {
        window.location.href = data.data.redirectUrl;
      }
    } catch {
      setError("Failed to initiate payment. Please try again.");
    } finally {
      setPaying(false);
    }
  };

  const handleCreateTicket = async () => {
    if (ticketForm.subject.length < 5 || ticketForm.message.length < 10) {
      setError("Please fill in subject (min 5 chars) and message (min 10 chars).");
      return;
    }
    setTicketBusy(true);
    setError("");
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...ticketForm,
          orderId: order._id,
          subject: `[${order.orderNumber}] ${ticketForm.subject}`,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to create ticket");
        return;
      }
      setExistingTicket(data.data);
      setTicketSuccess(true);
      setShowTicket(false);
    } catch {
      setError("Failed to create ticket");
    } finally {
      setTicketBusy(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || replyText.trim().length < 1) return;
    setReplyBusy(true);
    try {
      const res = await fetch(`/api/support/${existingTicket.ticketNumber}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setExistingTicket(data.data);
        setReplyText("");
      }
    } catch {}
    setReplyBusy(false);
  };

  const cancel = async () => {
    if (!reason.trim()) {
      setError("Please select or enter a cancellation reason.");
      return;
    }
    setCancelling(true);
    setError("");
    try {
      const res = await fetch(`/api/orders/${order.orderNumber}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Cancellation failed");
        return;
      }
      setShowCancel(false);
      router.refresh();
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50/50 pb-16">
      {/* Screen-Only Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 print:hidden">
        {/* Navigation Breadcrumb */}
        <Link 
          href="/orders" 
          className="inline-flex items-center text-xs font-semibold text-surface-500 hover:text-blue-600 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to My Orders
        </Link>

        {/* Top Header Card */}
        <Card className="p-6 mb-8 border-surface-200/80 shadow-sm bg-white rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-surface-900 tracking-tight font-mono">
                  #{order.orderNumber}
                </h1>
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide border ${
                  order.orderStatus === "DELIVERED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : order.orderStatus === "CANCELLED"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                }`}>
                  {order.orderStatus}
                </span>
              </div>
              <p className="text-xs text-surface-500 mt-1">
                Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </p>
              {!["DELIVERED", "CANCELLED", "REFUNDED", "RETURNED"].includes(order.orderStatus) && (
                <p className="text-xs text-blue-600 font-semibold mt-1">
                  Estimated delivery by {new Date(new Date(order.createdAt).getTime() + deliveryDays * 86400000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              {cancellable && (
                <Button 
                  variant="destructive" 
                  onClick={() => setShowCancel(true)}
                  className="font-semibold shadow-sm"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Error Feedback */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-red-600" />
            {error}
          </div>
        )}

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Flipkart-Style Animated Timeline */}
            <Card className="p-6 md:p-8 border-surface-200/80 shadow-sm rounded-2xl bg-white">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-surface-900">Delivery Status</h2>
                </div>
                {order.shippingDetails?.trackingNumber && (
                  <span className="text-xs font-semibold text-surface-500">
                    AWB: <span className="font-mono text-surface-900">{order.shippingDetails.trackingNumber}</span> ({order.shippingDetails.courier})
                  </span>
                )}
              </div>

              <OrderTimeline placedAt={tl.placedAt} steps={tl.steps} terminal={tl.terminal} events={order.shippingDetails?.events} />
            </Card>

            {/* Live Delivery Tracking Card */}
            {["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.orderStatus) && (
              <Card className="p-6 md:p-8 border-blue-200/80 shadow-sm rounded-2xl bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-blue-100">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  <h2 className="font-bold text-blue-900">Live Tracking</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  {order.shippingDetails?.currentlyAt && (
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1">Currently At</p>
                      <p className="text-sm font-bold text-blue-900">{order.shippingDetails.currentlyAt}</p>
                    </div>
                  )}
                  {order.shippingDetails?.estimatedDelivery && (
                    <div className="p-3 bg-white rounded-xl border border-blue-100">
                      <p className="text-xs font-medium text-blue-600 mb-1">Estimated Delivery</p>
                      <p className="text-sm font-bold text-blue-900">
                        {new Date(order.shippingDetails.estimatedDelivery).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                      </p>
                    </div>
                  )}
                </div>

                {/* ETA Change Notice */}
                {order.shippingDetails?.deliveryChanges?.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                    <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Delivery Update
                    </p>
                    {order.shippingDetails.deliveryChanges.map((ch: any, i: number) => (
                      <div key={i} className="text-xs text-amber-800 mt-1">
                        <p>{ch.reason}</p>
                        {ch.previousDate && (
                          <p className="text-amber-600">Changed from {new Date(ch.previousDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent Tracking Events */}
                {order.shippingDetails?.events?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-blue-700">Recent Updates</p>
                    {[...order.shippingDetails.events].reverse().slice(0, 3).map((ev: any, i: number) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="text-blue-400 shrink-0 font-mono">{new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                        <div>
                          <span className="font-medium text-blue-900">{ev.status}</span>
                          {ev.location && <span className="text-blue-600"> — {ev.location}</span>}
                          {ev.note && <span className="text-blue-500 block ml-0 mt-0.5">{ev.note}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )}

            {/* Item Breakdown List */}
            <Card className="p-6 md:p-8 border-surface-200/80 shadow-sm rounded-2xl bg-white">
              <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-100">
                <Package className="w-5 h-5 text-blue-600" />
                <h2 className="font-bold text-surface-900">Order Items ({order.items?.length || 0})</h2>
              </div>

              <div className="divide-y divide-surface-100">
                {(order.items || []).map((it: any, i: number) => (
                  <div key={i} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                    <div className="w-20 h-20 bg-surface-100 rounded-xl overflow-hidden shrink-0 border border-surface-200 relative">
                      <Image 
                        src={it.imageSnapshot || "/images/placeholder-product.svg"} 
                        alt={it.nameSnapshot} 
                        fill 
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-surface-900 text-sm truncate">{it.nameSnapshot}</h4>
                      <p className="text-xs text-surface-500 font-mono mt-1">SKU: {it.sku}</p>
                      <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 bg-surface-100 text-surface-700 rounded">
                        Qty: {it.quantity}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-surface-900 text-base">{formatPrice(it.finalLineTotal)}</p>
                      <p className="text-xs text-surface-400 mt-0.5">{formatPrice(it.salePrice)} each</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Embedded Invoice Section */}
            <div>
              <Invoice order={order} />
            </div>
          </div>

          {/* Right Column Sidebar (1/3) */}
          <div className="space-y-6">
            
            {/* Delivery Address */}
            <Card className="p-6 border-surface-200/80 shadow-sm rounded-2xl bg-white">
              <div className="flex items-center gap-2 mb-4 text-surface-900 font-bold border-b border-surface-100 pb-3">
                <MapPin className="w-4 h-4 text-blue-600" />
                Shipping Destination
              </div>
              <p className="font-bold text-surface-900 text-sm">{order.shippingAddress?.fullName}</p>
              <p className="text-sm text-surface-600 mt-1 leading-relaxed">
                {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
              </p>
              <p className="text-xs text-surface-500 font-medium mt-3 pt-3 border-t border-surface-100">
                Phone: {order.shippingAddress?.phone}
              </p>
            </Card>

            {/* Payment Summary */}
            <Card className="p-6 border-surface-200/80 shadow-sm rounded-2xl bg-white">
              <div className="flex items-center gap-2 mb-4 text-surface-900 font-bold border-b border-surface-100 pb-3">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Payment Info
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-surface-500">Method</span>
                <span className="font-semibold text-surface-900 uppercase">{order.paymentInfo?.method}</span>
              </div>
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-surface-500">Status</span>
                <span className={`font-bold uppercase text-xs px-2 py-0.5 rounded ${
                  order.paymentInfo?.status === "PAID" ? "text-emerald-700 bg-emerald-50" : "text-amber-700 bg-amber-50"
                }`}>
                  {order.paymentInfo?.status}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-surface-100 mt-3">
                <span className="font-bold text-surface-900">Total</span>
                <span className="font-black text-lg text-blue-600">
                  {formatPrice(order.pricingSnapshot?.grandTotal || 0)}
                </span>
              </div>

              {/* Pay Now button for pending/failed payments */}
              {needsPayment && (
                <div className="mt-4 pt-3 border-t border-surface-100">
                  {isCOD ? (
                    <>
                      <p className="text-xs text-surface-500 mb-2">Want to pay online now? Upgrade to PhonePe for faster processing.</p>
                      <Button onClick={handlePayNow} isLoading={paying} className="w-full" size="sm">
                        <Zap className="w-4 h-4 mr-2" /> Pay with PhonePe
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-surface-500 mb-2">Your payment is pending. Complete payment to confirm your order.</p>
                      <Button onClick={handlePayNow} isLoading={paying} className="w-full" size="sm">
                        <Zap className="w-4 h-4 mr-2" /> Pay Now
                      </Button>
                    </>
                  )}
                </div>
              )}
            </Card>

            {/* Raise Ticket Card / Existing Ticket Thread */}
            {order.orderStatus !== "CANCELLED" && (
              <Card className="p-6 border-surface-200/80 shadow-sm rounded-2xl bg-white">
      {/* Support Ticket Header with Refresh Button */}
<div className="flex items-center justify-between mb-3">
  <div className="flex items-center gap-2">
    <Headphones className="w-4 h-4 text-blue-600 dark:text-blue-400" />
    <h3 className="font-bold text-surface-900 dark:text-surface-100">
      {existingTicket ? "Support Ticket" : "Need Help?"}
    </h3>
  </div>

  {existingTicket && (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => fetchTickets(true)}
      disabled={refreshing}
      className="h-7 px-2 text-xs text-surface-500 hover:text-blue-600 dark:text-surface-400 dark:hover:text-blue-400 hover:bg-surface-100 dark:hover:bg-surface-800"
      title="Refresh messages"
    >
      <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""}`} />
      Refresh
    </Button>
  )}
</div>



      {ticketsLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-surface-100 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-surface-100 rounded animate-pulse w-1/2" />
        </div>
      ) : existingTicket ? (
        <div className="space-y-3">
          {/* Helper Notice Text */}
          {/* Dark Mode Supported Helper Notice */}
<p className="text-[11px] text-surface-500 dark:text-surface-400 italic bg-surface-50 dark:bg-surface-800/60 p-2 rounded-lg border border-surface-100 dark:border-surface-700">
  Click <strong>Refresh</strong> above to get the latest messages from our support team.
</p>

          {/* Ticket status badge */}
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
              existingTicket.status === "OPEN" ? "bg-amber-100 text-amber-700" :
              existingTicket.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
              existingTicket.status === "RESOLVED" ? "bg-emerald-100 text-emerald-700" :
              "bg-surface-100 text-surface-600"
            }`}>
              {existingTicket.status.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-surface-400 font-mono">
              #{existingTicket.ticketNumber}
            </span>
          </div>

         {/* Thread messages */}
<div className="space-y-2 max-h-60 overflow-y-auto">
  {(existingTicket.messages || []).map((msg: any, i: number) => (
    <div
      key={i}
      className={`p-2.5 rounded-lg text-xs transition-colors ${
        msg.sender === "ADMIN"
          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 ml-4"
          : "bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 mr-4"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <span
          className={`font-bold ${
            msg.sender === "ADMIN"
              ? "text-blue-700 dark:text-blue-300"
              : "text-surface-700 dark:text-surface-200"
          }`}
        >
          {msg.sender === "ADMIN" ? "Support" : "You"}
        </span>

        {/* Date & Time Badge */}
        {msg.timestamp && (
          <span className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">
            {new Date(msg.timestamp).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            at{" "}
            {new Date(msg.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <p className="text-surface-600 dark:text-surface-300 whitespace-pre-wrap">
        {msg.content}
      </p>
    </div>
  ))}
</div>

          {/* Reply input */}
          {["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(existingTicket.status) && (
            <div className="flex gap-2 pt-2 border-t border-surface-100">
              <Input
                value={replyText}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                placeholder="Reply to support..."
                className="text-xs"
                onKeyDown={(e: React.KeyboardEvent) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
              />
              <Button size="sm" onClick={handleReply} isLoading={replyBusy} disabled={!replyText.trim()}>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
                ) : ticketSuccess ? (
                  <div className="p-3 bg-accent-50 dark:bg-accent-950/30 rounded-lg text-sm text-accent-700 dark:text-accent-300">
                    Support ticket created. Our team will respond within 24 hours.
                  </div>
                ) : showTicket ? (
                  <div className="space-y-3">
                    <Input
                      value={ticketForm.subject}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                      placeholder="Brief subject (min 5 chars)"
                    />
                    <select
                      value={ticketForm.category}
                      onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800"
                      aria-label="Ticket category"
                    >
                      <option value="ORDER_ISSUE">Order Issue</option>
                      <option value="PAYMENT_ISSUE">Payment Issue</option>
                      <option value="SHIPPING_ISSUE">Shipping Issue</option>
                      <option value="PRODUCT_QUALITY">Product Quality</option>
                      <option value="RETURNS">Returns</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <textarea
                      value={ticketForm.message}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTicketForm((f) => ({ ...f, message: e.target.value }))}
                      placeholder="Describe your issue in detail..."
                      className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm h-24 resize-none bg-white dark:bg-surface-800"
                    />
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setShowTicket(false)}>Cancel</Button>
                      <Button size="sm" onClick={handleCreateTicket} isLoading={ticketBusy}>Submit</Button>
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowTicket(true)}>
                    <Headphones className="w-4 h-4 mr-2" /> Raise a Ticket
                  </Button>
                )}
              </Card>
            )}

            {/* Cancellation Status if active */}
            {order.cancellation && (
              <Card className="p-6 border-red-200 bg-red-50/50 shadow-sm rounded-2xl">
                <div className="flex items-center gap-2 text-red-900 font-bold mb-2">
                  <RotateCcw className="w-4 h-4 text-red-600" />
                  Order Cancelled
                </div>
                <p className="text-xs text-red-700"><strong>Reason:</strong> {order.cancellation.reason}</p>
                {order.cancellation.refundStatus && (
                  <p className="text-xs text-red-600 mt-2 font-semibold bg-white p-2 rounded-lg border border-red-200">
                    Refund Status: {order.cancellation.refundStatus}
                  </p>
                )}
              </Card>
            )}

            {/* Customer Assurance Widget */}
            <Card className="p-4 bg-surface-100/50 border-none rounded-2xl space-y-3">
              <div className="flex items-center gap-3 text-xs text-surface-600 font-medium">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>100% Genuine Products & Secure Payments</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancellation Modal Dialog */}
      {showCancel && cancellable && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 bg-white rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-surface-900 text-lg">Cancel Order</h3>
                <p className="text-xs text-surface-500">Order #{order.orderNumber}</p>
              </div>
            </div>

            <p className="text-sm text-surface-600">
              Please let us know why you are cancelling this order:
            </p>

            <div className="space-y-2">
              {["Ordered by mistake", "Found a better price elsewhere", "Delayed delivery time", "Need to change shipping address"].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setReason(preset)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                    reason === preset ? "border-blue-600 bg-blue-50 text-blue-700 font-bold" : "border-surface-200 text-surface-600 hover:bg-surface-50"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <Input 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="Or write custom reason..." 
              className="text-xs mt-2"
            />

            <p className="text-[11px] text-surface-400">
              Refunds for online paid orders will be initiated immediately back to the original payment source.
            </p>

            <div className="flex gap-2 justify-end pt-2 border-t border-surface-100">
              <Button variant="ghost" onClick={() => setShowCancel(false)} size="sm">
                Keep Order
              </Button>
              <Button 
                variant="destructive" 
                onClick={cancel} 
                disabled={cancelling}
                size="sm"
              >
                {cancelling ? "Processing..." : "Confirm Cancellation"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}