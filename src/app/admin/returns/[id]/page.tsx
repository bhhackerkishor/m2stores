"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { formatPrice, formatDate } from "@/lib/utils";

export default function AdminReturnDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    const res = await fetch(`/api/admin/returns/${id}`, { cache: "no-store" });
    const json = await res.json();
    if (json.success) setData(json.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const act = async (action: "approve" | "reject" | "receive" | "refund") => {
    if ((action === "reject") && reason.trim().length < 5) {
      setError("Rejection reason required (min 5 chars).");
      return;
    }
    if (!confirm(`Confirm: ${action} return?`)) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/admin/returns/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: reason || undefined }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message || "Action failed");
        return;
      }
      load();
      router.refresh();
    } finally {
      setBusy("");
    }
  };

  if (!data) return <div className="text-surface-500">Loading…</div>;
  const r = data.request;
  const order = data.order;

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs text-surface-500">{r.rmaNumber} · order {r.orderNumber}</p>
      <h1 className="text-2xl font-bold mb-1">Return {r.status}</h1>
      <p className="text-sm text-surface-500 mb-6">Requested {formatDate(r.requestedAt)} · pickup {r.pickupStatus} · refund {r.refund.status} {r.refund.amount ? `(${formatPrice(r.refund.amount)})` : ""}</p>

      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
        <div className="space-y-4">
          <Card>
            <h3 className="font-semibold mb-2">Items</h3>
            <ul className="text-sm space-y-1">
              {(r.items || []).map((i: any) => (
                <li key={i.sku} className="flex justify-between"><span className="font-mono">{i.sku} × {i.quantity}</span><span>{formatPrice(i.refundAmount)}</span></li>
              ))}
            </ul>
            <p className="text-sm mt-2"><b>Reason:</b> {r.reason}</p>
            {order && <p className="text-xs text-surface-500 mt-1">Order total {formatPrice(order.pricingSnapshot?.grandTotal)} · {order.orderStatus} · {order.paymentInfo?.method}/{order.paymentInfo?.status}</p>}
          </Card>
        </div>
        <Card>
          <h3 className="font-semibold mb-3">Actions</h3>
          <div className="space-y-2">
            {r.status === "REQUESTED" && (
              <>
                <Button className="w-full" size="sm" onClick={() => act("approve")} isLoading={busy === "approve"}>Approve + Schedule Pickup</Button>
                <Input value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="Rejection reason (for Reject)" />
                <Button className="w-full" size="sm" variant="destructive" onClick={() => act("reject")} isLoading={busy === "reject"}>Reject</Button>
              </>
            )}
            {r.status === "APPROVED" && (
              <Button className="w-full" size="sm" onClick={() => act("receive")} isLoading={busy === "receive"}>Mark Received (restock)</Button>
            )}
            {r.status === "RECEIVED" && r.refund.status !== "COMPLETED" && (
              <Button className="w-full" size="sm" onClick={() => act("refund")} isLoading={busy === "refund"}>Trigger Refund ({formatPrice(r.refund.amount)})</Button>
            )}
            {r.status === "REFUNDED" && <p className="text-sm text-green-700 font-semibold">Refunded {r.refund.refundId ? `(${r.refund.refundId})` : ""}</p>}
            {r.status === "REJECTED" && <p className="text-sm text-surface-500">Rejected: {r.adminNotes || r.reason}</p>}
          </div>
        </Card>
      </div>
    </div>
  );
}
