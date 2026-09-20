"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminReviewsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async (s = status) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (s) params.set("status", s);
      const res = await fetch(`/api/admin/reviews?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = async (id: string, action: "approve" | "hide" | "delete") => {
    if (!confirm(`${action} this review?`)) return;
    await fetch(`/api/admin/reviews/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <h1 className="text-3xl font-bold">Reviews</h1>
        <select value={status} onChange={(e) => { setStatus(e.target.value); load(e.target.value); }} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="PENDING">PENDING</option>
          <option value="APPROVED">APPROVED</option>
          <option value="HIDDEN">HIDDEN</option>
        </select>
      </div>
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <div className="space-y-3">
          {items.length === 0 && <Card className="p-8 text-center text-surface-500 text-sm">Queue is clear. New reviews appear here as PENDING.</Card>}
          {items.map((r) => (
            <Card key={r._id}>
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm"><span className="text-yellow-500">{"★".repeat(r.rating)}</span> <b>{r.title}</b> {r.isVerifiedPurchase && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Verified</span>}</p>
                  <p className="text-sm text-surface-600 mt-1">{r.review}</p>
                  <p className="text-xs text-surface-400 mt-1">{r.productId?.name || r.productId} · {r.status}</p>
                </div>
                <div className="flex gap-2 self-start">
                  <Button size="sm" onClick={() => act(r._id, "approve")}>Approve</Button>
                  <Button size="sm" variant="outline" onClick={() => act(r._id, "hide")}>Hide</Button>
                  <Button size="sm" variant="destructive" onClick={() => act(r._id, "delete")}>Delete</Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
