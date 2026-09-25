"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  Package,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
  ShieldCheck,
  Pause,
  Play,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

const EASE = [0.16, 1, 0.3, 1] as const;
const RADIUS = 18;
const CIRC = 2 * Math.PI * RADIUS;

export default function OrderSuccessPage() {
  const router = useRouter();
  const sp = useSearchParams();

  const orderNumber = sp.get("orderNumber") || "";
  const method = sp.get("method") || "";
  const paid = sp.get("paid") === "1";
  const pending = sp.get("pending") === "1";
  const failed = sp.get("failed") === "1";
  const payError = sp.get("payError") === "1";

  const [status, setStatus] = useState<string>(paid ? "PAID" : failed ? "FAILED" : pending ? "PENDING" : "");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const TOTAL = 3;
  const [countdown, setCountdown] = useState<number>(TOTAL);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isOrderSuccessful = status === "PAID" || (method === "COD" && Boolean(orderNumber));
  const isFailed = status === "FAILED" || failed;

  const checkStatus = useCallback(async () => {
    if (!orderNumber) return;
    setChecking(true);
    setError("");
    try {
      const res = await fetch(`/api/payments/status?orderNumber=${encodeURIComponent(orderNumber)}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data.data.status);
        if (data.data.status === "PAID") {
          trackEvent("payment_success", { orderNumber, method });
          trackEvent("purchase", { orderNumber, method });
        }
      } else {
        setError(data.error?.message || "Status check failed");
      }
    } catch {
      setError("Status check failed");
    } finally {
      setChecking(false);
    }
  }, [orderNumber, method]);

  useEffect(() => {
    if (orderNumber && method === "PHONEPE" && !paid && !failed) {
      checkStatus();
    }
  }, [orderNumber, method, paid, failed, checkStatus]);

  useEffect(() => {
    if (!isOrderSuccessful || isPaused || !orderNumber) return;
    if (countdown === 0) {
      router.push(`/orders/${encodeURIComponent(orderNumber)}`);
      return;
    }
    timerRef.current = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOrderSuccessful, countdown, isPaused, orderNumber, router]);

  const togglePause = () => setIsPaused((prev) => !prev);
  const progress = (countdown / TOTAL) * CIRC;

  const tone = isOrderSuccessful ? "accent" : isFailed ? "danger" : "warning";

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-surface-50 dark:bg-surface-950 transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="w-full max-w-xl"
      >
        {/* Main Status Card */}
        <div className="relative overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl p-8 sm:p-10 shadow-card-hover text-center">
          {/* Ambient glow pulse — brand-toned per status */}
          <motion.div
            aria-hidden
            animate={{ opacity: [0.15, 0.3, 0.15], scale: [1, 1.08, 1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className={`absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 blur-3xl pointer-events-none rounded-full ${
              tone === "accent" ? "bg-accent-500" : tone === "danger" ? "bg-danger-500" : "bg-warning-500"
            }`}
          />

          {/* Icon */}
          <div className="relative z-10 mb-6 flex justify-center">
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center border-2 ${
                tone === "accent"
                  ? "bg-accent-50 dark:bg-accent-950/40 border-accent-300 dark:border-accent-700 text-accent-600 dark:text-accent-400"
                  : tone === "danger"
                  ? "bg-danger-50 dark:bg-danger-950/40 border-danger-300 dark:border-danger-700 text-danger-600 dark:text-danger-400"
                  : "bg-warning-50 dark:bg-warning-950/40 border-warning-300 dark:border-warning-700 text-warning-600 dark:text-warning-400"
              }`}
            >
              {tone === "accent" && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-accent-400 dark:border-accent-500"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              {isOrderSuccessful ? (
                <CheckCircle2 className="w-10 h-10 stroke-[2]" />
              ) : isFailed ? (
                <XCircle className="w-10 h-10 stroke-[2]" />
              ) : (
                <Clock className="w-10 h-10 stroke-[2]" />
              )}
            </motion.div>
          </div>

          {/* Heading */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.3 }}
            className="relative z-10 space-y-2"
          >
            <h1 className="!text-2xl sm:!text-3xl text-surface-900 dark:text-white">
              {isOrderSuccessful ? "Order Confirmed!" : isFailed ? "Payment Unsuccessful" : "Order Awaiting Payment"}
            </h1>

            {orderNumber && (
              <div className="inline-flex items-center gap-2 bg-surface-100 dark:bg-surface-800/80 border border-surface-200 dark:border-surface-700/60 rounded-full px-4 py-1.5 mt-1">
                <Package className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
                <span className="text-2xs text-surface-500 dark:text-surface-400 uppercase tracking-wide font-semibold">
                  Order ID:
                </span>
                <span className="text-xs font-mono font-bold text-brand-700 dark:text-brand-300">{orderNumber}</span>
              </div>
            )}
          </motion.div>

          {/* Status message */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="relative z-10 text-sm sm:text-base text-surface-600 dark:text-surface-300 mt-4 leading-relaxed max-w-md mx-auto"
          >
            {method === "COD"
              ? "Your order has been logged! Pay via cash upon arrival."
              : isOrderSuccessful
              ? "Thank you for shopping with us! Your payment is confirmed and your order is being processed."
              : isFailed
              ? "We couldn't process your payment. Stock remains held briefly so you can try again."
              : "Please finalize your PhonePe transaction to complete this order."}
          </motion.p>

          {/* Notices */}
          <AnimatePresence>
            {payError && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-10 mt-6 flex items-start gap-3 bg-warning-50 dark:bg-warning-950/30 border border-warning-200 dark:border-warning-800 rounded-lg p-4 text-left text-xs text-warning-700 dark:text-warning-400"
              >
                <AlertCircle className="w-4 h-4 text-warning-500 shrink-0 mt-0.5" />
                <span>Payment gateway connection timed out. Your order is safe — use the retry option below.</span>
              </motion.div>
            )}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative z-10 mt-6 flex items-start gap-3 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg p-4 text-left text-xs text-danger-700 dark:text-danger-400"
              >
                <XCircle className="w-4 h-4 text-danger-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="relative z-10 mt-8 pt-6 border-t border-surface-200 dark:border-surface-800">
            {isOrderSuccessful ? (
              <div className="space-y-4">
                {/* Countdown ring card */}
                <div className="bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700/60 rounded-lg p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-left">
                    <div className="relative w-10 h-10 shrink-0">
                      <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                        <circle cx="20" cy="20" r={RADIUS} fill="none" strokeWidth="3" className="stroke-surface-200 dark:stroke-surface-700" />
                        <motion.circle
                          cx="20"
                          cy="20"
                          r={RADIUS}
                          fill="none"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="stroke-brand-600 dark:stroke-brand-400"
                          strokeDasharray={CIRC}
                          animate={{ strokeDashoffset: CIRC - progress }}
                          transition={{ duration: 0.9, ease: "linear" }}
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-brand-700 dark:text-brand-300">
                        {countdown}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-surface-900 dark:text-white">Redirecting to details page</p>
                      <p className="text-[11px] text-surface-500 dark:text-surface-400">
                        {isPaused ? "Countdown paused" : "Hold tight, taking you automatically"}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={togglePause}
                    className="p-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                    title={isPaused ? "Resume Redirect" : "Pause Redirect"}
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href={`/orders/${encodeURIComponent(orderNumber)}`}
                    className="group w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 text-white font-semibold text-sm transition-colors shadow-md hover:shadow-lg"
                  >
                    <span>View Order Now</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </Link>

                  <Link
                    href="/shop"
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-surface-100 hover:bg-surface-200 dark:bg-surface-800 dark:hover:bg-surface-700 text-surface-700 dark:text-surface-200 font-semibold text-sm border border-surface-200 dark:border-surface-700 transition-colors"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Continue Shopping</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {method === "PHONEPE" && orderNumber && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={checkStatus}
                      isLoading={checking}
                      variant="outline"
                      className="w-full py-3 bg-surface-50 hover:bg-surface-100 dark:bg-surface-800 dark:hover:bg-surface-700 border-surface-200 dark:border-surface-700 text-surface-800 dark:text-white text-xs uppercase tracking-wider font-bold transition-colors"
                    >
                      {checking ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2 text-brand-600 dark:text-brand-400" />
                      )}
                      Verify Status
                    </Button>

                    <Button
                      onClick={async () => {
                        setChecking(true);
                        try {
                          const res = await fetch("/api/payments/initiate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ orderNumber }),
                          });
                          const data = await res.json();
                          if (data.success && data.data?.redirectUrl) {
                            window.location.href = data.data.redirectUrl;
                          } else {
                            setError(data.error?.message || "Re-initiation failed");
                          }
                        } finally {
                          setChecking(false);
                        }
                      }}
                      className="w-full py-3 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 text-white text-xs uppercase tracking-wider font-bold shadow-md hover:shadow-lg transition-colors"
                    >
                      Retry Payment
                    </Button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <Link
                    href={`/orders/${encodeURIComponent(orderNumber)}`}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold transition-colors"
                  >
                    <span>View Order Details</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <Link
                    href="/shop"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-300 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-800 text-xs font-semibold transition-colors"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Back to Shop</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-6 flex items-center justify-center gap-2 text-xs text-surface-500 dark:text-surface-400"
        >
          <ShieldCheck className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          <span>Guaranteed Safe &amp; Encrypted Order Processing</span>
        </motion.div>
      </motion.div>
    </div>
  );
}