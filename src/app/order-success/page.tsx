"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";

export default function OrderSuccessPage() {
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

  const checkStatus = async () => {
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
      }
      else setError(data.error?.message || "Status check failed");
    } catch {
      setError("Status check failed");
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    // Auto-verify once on load for PhonePe orders — server is source of truth.
    if (orderNumber && method === "PHONEPE" && !paid && !failed) {
      checkStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center">
      {status === "PAID" || (method === "COD" && orderNumber) ? (
        <>
          <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Order Confirmed!</h1>
        </>
      ) : status === "FAILED" || failed ? (
        <>
          <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Payment Failed</h1>
          <p className="text-surface-600 mb-4">Your order is reserved briefly. Please retry payment or choose COD.</p>
        </>
      ) : (
        <>
          <Clock className="w-20 h-20 text-amber-500 mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-surface-900 mb-2">Order Placed!</h1>
        </>
      )}

      {orderNumber && (
        <p className="text-lg text-surface-600 mb-2">Order <span className="font-mono font-bold text-surface-900">{orderNumber}</span></p>
      )}
      {payError && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 mb-4">Payment gateway was unreachable. Your order is saved — retry below.</p>}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {method === "PHONEPE" && orderNumber && status !== "PAID" && (
        <div className="flex gap-2 justify-center mb-6">
          <Button onClick={checkStatus} isLoading={checking} variant="outline">
            {checking ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Verify Payment Status
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
                if (data.success && data.data?.redirectUrl) window.location.href = data.data.redirectUrl;
                else setError(data.error?.message || "Re-initiation failed");
              } finally {
                setChecking(false);
              }
            }}
          >
            Retry Payment
          </Button>
        </div>
      )}

      <p className="text-surface-600 mb-8">
        {method === "COD"
          ? "Pay in cash when your order arrives. Track it from your orders page."
          : status === "PAID"
            ? "Payment verified on our server. Track your order below."
            : "Complete PhonePe payment to confirm. Stock is safely reserved meanwhile."}
      </p>
      <div className="flex gap-3 justify-center">
        <Link href="/orders" className="btn-primary">Track Orders</Link>
        <Link href="/shop" className="btn-secondary">Continue Shopping</Link>
      </div>
    </div>
  );
}
