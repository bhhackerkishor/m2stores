// components/orders/ReturnSection.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils";

interface Props {
  orderNumber: string;
  eligible: boolean;
  eligibilityReason: string;
  eligibleItems: Array<{ productId: string; sku: string; name: string; returnableQty: number; unitPrice: number }>;
  existing: Array<{ _id: string; rmaNumber: string; status: string; items: Array<{ sku: string; quantity: number }>; refund: { status: string; amount: number }; reason: string }>;
  windowDays: number;
}

export function ReturnSection({ orderNumber, eligible, eligibilityReason, eligibleItems, existing, windowDays }: Props) {
  const router = useRouter();
  const [show, setShow] = useState(false);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setError("");
    const items = Object.entries(qty)
      .filter(([, q]) => q > 0)
      .map(([sku, quantity]) => ({ sku, quantity }));
    if (items.length === 0) {
      setError("Select at least one item.");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Please describe the reason (min 5 characters).");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/orders/${orderNumber}/returns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, reason }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Request failed");
        return;
      }
      setShow(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-6 border-surface-200 dark:border-surface-800 shadow-card rounded-xl bg-white dark:bg-surface-900">
      <h3 className="!text-base !font-bold font-sans text-surface-900 dark:text-white mb-1">Returns & Refunds</h3>
      <p className="text-xs text-surface-500 dark:text-surface-400 mb-4">
        {windowDays}-day return window on delivered orders. Partial returns supported.
      </p>

      {existing.length > 0 && (
        <div className="space-y-2 mb-4">
          {existing.map((r) => (
            <div key={r._id} className="p-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-100 dark:border-surface-800 rounded-lg text-sm">
              <div className="flex justify-between flex-wrap gap-1">
                <span className="font-mono font-bold text-surface-900 dark:text-surface-100">{r.rmaNumber}</span>
                <span className="px-2 py-0.5 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700 rounded-full text-xs font-semibold text-surface-700 dark:text-surface-300">
                  {r.status} · refund {r.refund.status}
                </span>
              </div>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                {r.items.map((i) => `${i.sku} × ${i.quantity}`).join(", ")}
                {r.refund.amount > 0 && ` · refund ${formatPrice(r.refund.amount)}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {!eligible ? (
        <p className="text-sm text-surface-500 dark:text-surface-400">{eligibilityReason || "Returns are not available for this order right now."}</p>
      ) : !show ? (
        <Button
          variant="outline"
          onClick={() => setShow(true)}
          className="border-brand-200 dark:border-brand-800 text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 transition-colors"
        >
          Request Return
        </Button>
      ) : (
        <div className="space-y-3">
          {eligibleItems
            .filter((i) => i.returnableQty > 0)
            .map((i) => (
              <div key={i.sku} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-surface-900 dark:text-surface-100 truncate">{i.name}</p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 font-mono">{i.sku} · max {i.returnableQty}</p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={i.returnableQty}
                  value={qty[i.sku] || 0}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setQty((q) => ({ ...q, [i.sku]: Math.max(0, Math.min(i.returnableQty, parseInt(e.target.value) || 0)) }))
                  }
                  className="w-20"
                />
              </div>
            ))}
          <Input value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="Reason (defective, wrong size…)" />
          {error && <p className="text-sm text-danger-600 dark:text-danger-400">{error}</p>}
          <div className="flex gap-2">
            <Button
              onClick={submit}
              isLoading={busy}
              size="sm"
              className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-400 transition-colors"
            >
              Submit Request
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShow(false)} className="hover:bg-surface-100 dark:hover:bg-surface-800">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}