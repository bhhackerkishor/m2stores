// components/orders/OrderDetailClient.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
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
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

const EASE = [0.16, 1, 0.3, 1] as const;

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

  const [existingTicket, setExistingTicket] = useState<any>(null);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyBusy, setReplyBusy] = useState(false);

  const tl = timelineFor(order.orderStatus, order.statusHistory || []);
  const cancellable = customerCanCancel(order.orderStatus);
  const needsPayment = order.orderStatus === "PENDING_PAYMENT" || (order.paymentInfo?.status !== "PAID" && order.paymentInfo?.status !== "CREATED");
  const isCOD = order.paymentInfo?.method === "COD";

  const fetchTickets = useCallback(
    async (isManual = false) => {
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
    },
    [order._id, order.orderNumber]
  );

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
      if (data.data?.redirectUrl) window.location.href = data.data.redirectUrl;
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
    if (!replyText.trim()) return;
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

  const statusBadgeClass =
    order.orderStatus === "DELIVERED"
      ? "bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400 border-accent-200 dark:border-accent-800"
      : order.orderStatus === "CANCELLED"
      ? "bg-danger-50 dark:bg-danger-950/40 text-danger-700 dark:text-danger-400 border-danger-200 dark:border-danger-800"
      : "bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400 border-brand-200 dark:border-brand-800";

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 pb-16 transition-colors duration-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 print:hidden">
        <Link
          href="/orders"
          className="inline-flex items-center text-xs font-semibold text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to My Orders
        </Link>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          <Card className="p-6 mb-8 border-surface-200 dark:border-surface-800 shadow-card bg-white dark:bg-surface-900 rounded-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="!text-xl sm:!text-2xl font-mono text-surface-900 dark:text-white">#{order.orderNumber}</h1>
                  <span className={`px-3 py-0.5 rounded-full text-2xs font-bold uppercase tracking-wide border ${statusBadgeClass}`}>
                    {order.orderStatus}
                  </span>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Placed on {new Date(order.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </p>
                {!["DELIVERED", "CANCELLED", "REFUNDED", "RETURNED"].includes(order.orderStatus) && (
                  <p className="text-xs text-brand-600 dark:text-brand-400 font-semibold mt-1">
                    Estimated delivery by{" "}
                    {new Date(new Date(order.createdAt).getTime() + deliveryDays * 86400000).toLocaleDateString("en-IN", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                )}
              </div>

              {cancellable && (
                <Button
                  variant="destructive"
                  onClick={() => setShowCancel(true)}
                  className="font-semibold shadow-sm bg-danger-600 hover:bg-danger-700 dark:bg-danger-500 dark:hover:bg-danger-400 transition-colors"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Cancel Order
                </Button>
              )}
            </div>
          </Card>
        </motion.div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-800 dark:text-danger-400 text-sm flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 shrink-0 text-danger-600 dark:text-danger-400" />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05, ease: EASE }}>
              <Card className="p-6 md:p-8 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-surface-100 dark:border-surface-800 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Truck className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h2 className="!text-base !font-bold font-sans text-surface-900 dark:text-white">Delivery Status</h2>
                  </div>
                  {order.shippingDetails?.trackingNumber && (
                    <span className="text-xs font-semibold text-surface-500 dark:text-surface-400">
                      AWB: <span className="font-mono text-surface-900 dark:text-surface-100">{order.shippingDetails.trackingNumber}</span> (
                      {order.shippingDetails.courier})
                    </span>
                  )}
                </div>

                <OrderTimeline placedAt={tl.placedAt} steps={tl.steps} terminal={tl.terminal} events={order.shippingDetails?.events} />
              </Card>
            </motion.div>

            {["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.orderStatus) && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: EASE }}>
                <Card className="p-6 md:p-8 border-brand-200 dark:border-brand-900 shadow-card rounded-xl bg-gradient-to-br from-brand-50 to-white dark:from-brand-950/40 dark:to-surface-900">
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-brand-100 dark:border-brand-900">
                    <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    <h2 className="!text-base !font-bold font-sans text-brand-900 dark:text-brand-200">Live Tracking</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    {order.shippingDetails?.currentlyAt && (
                      <div className="p-3 bg-white dark:bg-surface-900 rounded-lg border border-brand-100 dark:border-brand-900">
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Currently At</p>
                        <p className="text-sm font-bold text-brand-900 dark:text-brand-200">{order.shippingDetails.currentlyAt}</p>
                      </div>
                    )}
                    {order.shippingDetails?.estimatedDelivery && (
                      <div className="p-3 bg-white dark:bg-surface-900 rounded-lg border border-brand-100 dark:border-brand-900">
                        <p className="text-xs font-medium text-brand-600 dark:text-brand-400 mb-1">Estimated Delivery</p>
                        <p className="text-sm font-bold text-brand-900 dark:text-brand-200">
                          {new Date(order.shippingDetails.estimatedDelivery).toLocaleDateString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {order.shippingDetails?.deliveryChanges?.length > 0 && (
                    <div className="p-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg mb-4">
                      <p className="text-xs font-medium text-warning-700 dark:text-warning-400 mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Delivery Update
                      </p>
                      {order.shippingDetails.deliveryChanges.map((ch: any, i: number) => (
                        <div key={i} className="text-xs text-warning-700 dark:text-warning-400 mt-1">
                          <p>{ch.reason}</p>
                          {ch.previousDate && (
                            <p className="text-warning-600 dark:text-warning-500">
                              Changed from {new Date(ch.previousDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {order.shippingDetails?.events?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-brand-700 dark:text-brand-400">Recent Updates</p>
                      {[...order.shippingDetails.events].reverse().slice(0, 3).map((ev: any, i: number) => (
                        <div key={i} className="flex gap-3 text-xs">
                          <span className="text-brand-400 dark:text-brand-500 shrink-0 font-mono">
                            {new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </span>
                          <div>
                            <span className="font-medium text-brand-900 dark:text-brand-200">{ev.status}</span>
                            {ev.location && <span className="text-brand-600 dark:text-brand-400"> — {ev.location}</span>}
                            {ev.note && <span className="text-brand-500 dark:text-brand-500 block mt-0.5">{ev.note}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </motion.div>
            )}

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE }}>
              <Card className="p-6 md:p-8 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-surface-100 dark:border-surface-800">
                  <Package className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                  <h2 className="!text-base !font-bold font-sans text-surface-900 dark:text-white">Order Items ({order.items?.length || 0})</h2>
                </div>

                <div className="divide-y divide-surface-100 dark:divide-surface-800">
                  {(order.items || []).map((it: any, i: number) => (
                    <div key={i} className="py-4 first:pt-0 last:pb-0 flex gap-4 items-center">
                      <div className="w-20 h-20 bg-surface-100 dark:bg-surface-800 rounded-lg overflow-hidden shrink-0 border border-surface-200 dark:border-surface-800 relative">
                        <Image src={it.imageSnapshot || "/images/placeholder-product.svg"} alt={it.nameSnapshot} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-surface-900 dark:text-surface-100 text-sm truncate">{it.nameSnapshot}</h4>
                        <p className="text-xs text-surface-500 dark:text-surface-400 font-mono mt-1">SKU: {it.sku}</p>
                        <span className="inline-block mt-2 text-xs font-bold px-2 py-0.5 bg-surface-100 dark:bg-surface-800 text-surface-700 dark:text-surface-300 rounded-sm">
                          Qty: {it.quantity}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="price-sm">{formatPrice(it.finalLineTotal)}</p>
                        <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">{formatPrice(it.salePrice)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </motion.div>

            <div>
              <Invoice order={order} />
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05, ease: EASE }}>
              <Card className="p-6 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
                <div className="flex items-center gap-2 mb-4 text-surface-900 dark:text-white font-bold border-b border-surface-100 dark:border-surface-800 pb-3">
                  <MapPin className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  Shipping Destination
                </div>
                <p className="font-bold text-surface-900 dark:text-white text-sm">{order.shippingAddress?.fullName}</p>
                <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 leading-relaxed">
                  {order.shippingAddress?.addressLine1}, {order.shippingAddress?.city} - {order.shippingAddress?.pincode}
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-500 font-medium mt-3 pt-3 border-t border-surface-100 dark:border-surface-800">
                  Phone: {order.shippingAddress?.phone}
                </p>
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1, ease: EASE }}>
              <Card className="p-6 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
                <div className="flex items-center gap-2 mb-4 text-surface-900 dark:text-white font-bold border-b border-surface-100 dark:border-surface-800 pb-3">
                  <CreditCard className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  Payment Info
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-surface-500 dark:text-surface-400">Method</span>
                  <span className="font-semibold text-surface-900 dark:text-white uppercase">{order.paymentInfo?.method}</span>
                </div>
                <div className="flex justify-between items-center text-sm mb-2">
                  <span className="text-surface-500 dark:text-surface-400">Status</span>
                  <span
                    className={`font-bold uppercase text-2xs px-2 py-0.5 rounded-sm ${
                      order.paymentInfo?.status === "PAID"
                        ? "text-accent-700 dark:text-accent-400 bg-accent-50 dark:bg-accent-950/40"
                        : "text-warning-700 dark:text-warning-400 bg-warning-50 dark:bg-warning-950/40"
                    }`}
                  >
                    {order.paymentInfo?.status}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-100 dark:border-surface-800 mt-3">
                  <span className="font-bold text-surface-900 dark:text-white">Total</span>
                  <span className="price-md text-brand-600 dark:text-brand-400">{formatPrice(order.pricingSnapshot?.grandTotal || 0)}</span>
                </div>

                {needsPayment && (
                  <div className="mt-4 pt-3 border-t border-surface-100 dark:border-surface-800">
                    {isCOD ? (
                      <>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                          Want to pay online now? Upgrade to PhonePe for faster processing.
                        </p>
                        <Button
                          onClick={handlePayNow}
                          isLoading={paying}
                          className="w-full bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition-colors"
                          size="sm"
                        >
                          <Zap className="w-4 h-4 mr-2" /> Pay with PhonePe
                        </Button>
                      </>
                    ) : (
                      <>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mb-2">
                          Your payment is pending. Complete payment to confirm your order.
                        </p>
                        <Button
                          onClick={handlePayNow}
                          isLoading={paying}
                          className="w-full bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition-colors"
                          size="sm"
                        >
                          <Zap className="w-4 h-4 mr-2" /> Pay Now
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Support ticket */}
            {order.orderStatus !== "CANCELLED" && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15, ease: EASE }}>
                <Card className="p-6 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Headphones className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                      <h3 className="font-bold text-surface-900 dark:text-surface-100">{existingTicket ? "Support Ticket" : "Need Help?"}</h3>
                    </div>

                    {existingTicket && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchTickets(true)}
                        disabled={refreshing}
                        className="h-7 px-2 text-xs text-surface-500 dark:text-surface-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
                        title="Refresh messages"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 mr-1 ${refreshing ? "animate-spin text-brand-600 dark:text-brand-400" : ""}`} />
                        Refresh
                      </Button>
                    )}
                  </div>

                  {ticketsLoading ? (
                    <div className="space-y-2">
                      <div className="h-4 bg-surface-100 dark:bg-surface-800 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-surface-100 dark:bg-surface-800 rounded animate-pulse w-1/2" />
                    </div>
                  ) : existingTicket ? (
                    <div className="space-y-3">
                      <p className="text-[11px] text-surface-500 dark:text-surface-400 italic bg-surface-50 dark:bg-surface-800/60 p-2 rounded-lg border border-surface-100 dark:border-surface-700">
                        Click <strong>Refresh</strong> above to get the latest messages from our support team.
                      </p>

                      <div className="flex items-center justify-between">
                        <span
                          className={`text-2xs font-bold px-2 py-0.5 rounded-full ${
                            existingTicket.status === "OPEN"
                              ? "bg-warning-100 dark:bg-warning-950/40 text-warning-700 dark:text-warning-400"
                              : existingTicket.status === "IN_PROGRESS"
                              ? "bg-brand-100 dark:bg-brand-950/40 text-brand-700 dark:text-brand-400"
                              : existingTicket.status === "RESOLVED"
                              ? "bg-accent-100 dark:bg-accent-950/40 text-accent-700 dark:text-accent-400"
                              : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400"
                          }`}
                        >
                          {existingTicket.status.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-surface-400 dark:text-surface-500 font-mono">#{existingTicket.ticketNumber}</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {(existingTicket.messages || []).map((msg: any, i: number) => (
                          <div
                            key={i}
                            className={`p-2.5 rounded-lg text-xs transition-colors ${
                              msg.sender === "ADMIN"
                                ? "bg-brand-50 dark:bg-brand-950/40 border border-brand-100 dark:border-brand-900/50 ml-4"
                                : "bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 mr-4"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span
                                className={`font-bold ${
                                  msg.sender === "ADMIN" ? "text-brand-700 dark:text-brand-300" : "text-surface-700 dark:text-surface-200"
                                }`}
                              >
                                {msg.sender === "ADMIN" ? "Support" : "You"}
                              </span>
                              {msg.timestamp && (
                                <span className="text-[10px] text-surface-400 dark:text-surface-500 font-medium">
                                  {new Date(msg.timestamp).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} at{" "}
                                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              )}
                            </div>
                            <p className="text-surface-600 dark:text-surface-300 whitespace-pre-wrap">{msg.content}</p>
                          </div>
                        ))}
                      </div>

                      {["OPEN", "IN_PROGRESS", "WAITING_FOR_CUSTOMER"].includes(existingTicket.status) && (
                        <div className="flex gap-2 pt-2 border-t border-surface-100 dark:border-surface-800">
                          <Input
                            value={replyText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReplyText(e.target.value)}
                            placeholder="Reply to support..."
                            className="text-xs"
                            onKeyDown={(e: React.KeyboardEvent) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleReply();
                              }
                            }}
                          />
                          <Button
                            size="sm"
                            onClick={handleReply}
                            isLoading={replyBusy}
                            disabled={!replyText.trim()}
                            className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition-colors"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : ticketSuccess ? (
                    <div className="p-3 bg-accent-50 dark:bg-accent-950/30 rounded-lg text-sm text-accent-700 dark:text-accent-400">
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
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
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
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm h-24 resize-none bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                      />
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setShowTicket(false)} className="hover:bg-surface-100 dark:hover:bg-surface-800">
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleCreateTicket}
                          isLoading={ticketBusy}
                          className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition-colors"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
                      onClick={() => setShowTicket(true)}
                    >
                      <Headphones className="w-4 h-4 mr-2" /> Raise a Ticket
                    </Button>
                  )}
                </Card>
              </motion.div>
            )}

            {order.cancellation && (
              <Card className="p-6 border-danger-200 dark:border-danger-900 bg-danger-50/50 dark:bg-danger-950/20 shadow-card rounded-xl">
                <div className="flex items-center gap-2 text-danger-900 dark:text-danger-300 font-bold mb-2">
                  <RotateCcw className="w-4 h-4 text-danger-600 dark:text-danger-400" />
                  Order Cancelled
                </div>
                <p className="text-xs text-danger-700 dark:text-danger-400">
                  <strong>Reason:</strong> {order.cancellation.reason}
                </p>
                {order.cancellation.refundStatus && (
                  <p className="text-xs text-danger-600 dark:text-danger-400 mt-2 font-semibold bg-white dark:bg-surface-900 p-2 rounded-lg border border-danger-200 dark:border-danger-800">
                    Refund Status: {order.cancellation.refundStatus}
                  </p>
                )}
              </Card>
            )}

            <Card className="p-4 bg-surface-100/60 dark:bg-surface-900/60 border-none rounded-xl space-y-3">
              <div className="flex items-center gap-3 text-xs text-surface-600 dark:text-surface-400 font-medium">
                <ShieldCheck className="w-5 h-5 text-accent-600 dark:text-accent-400 shrink-0" />
                <span>100% Genuine Products & Secure Payments</span>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Cancellation Modal */}
      <AnimatePresence>
        {showCancel && cancellable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: EASE }}
            >
              <Card className="w-full max-w-md p-6 bg-white dark:bg-surface-900 rounded-xl shadow-2xl space-y-4">
                <div className="flex items-center gap-3 text-danger-600 dark:text-danger-400">
                  <div className="w-10 h-10 rounded-full bg-danger-50 dark:bg-danger-950/40 flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-surface-900 dark:text-white text-lg">Cancel Order</h3>
                    <p className="text-xs text-surface-500 dark:text-surface-400">Order #{order.orderNumber}</p>
                  </div>
                </div>

                <p className="text-sm text-surface-600 dark:text-surface-400">Please let us know why you are cancelling this order:</p>

                <div className="space-y-2">
                  {["Ordered by mistake", "Found a better price elsewhere", "Delayed delivery time", "Need to change shipping address"].map(
                    (preset) => (
                      <button
                        key={preset}
                        onClick={() => setReason(preset)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                          reason === preset
                            ? "border-brand-600 bg-brand-50 dark:bg-brand-950/40 dark:border-brand-500 text-brand-700 dark:text-brand-300 font-bold"
                            : "border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800"
                        }`}
                      >
                        {preset}
                      </button>
                    )
                  )}
                </div>

                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Or write custom reason..." className="text-xs mt-2" />

                <p className="text-[11px] text-surface-400 dark:text-surface-500">
                  Refunds for online paid orders will be initiated immediately back to the original payment source.
                </p>

                <div className="flex gap-2 justify-end pt-2 border-t border-surface-100 dark:border-surface-800">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCancel(false)}
                    size="sm"
                    className="hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-600 dark:text-surface-400"
                  >
                    Keep Order
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={cancel}
                    disabled={cancelling}
                    size="sm"
                    className="bg-danger-600 hover:bg-danger-700 dark:bg-danger-500 dark:hover:bg-danger-400 transition-colors"
                  >
                    {cancelling ? "Processing..." : "Confirm Cancellation"}
                  </Button>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}