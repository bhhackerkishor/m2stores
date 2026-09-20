"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ThumbsUp } from "lucide-react";

interface Props {
  productId: string;
}

export function ProductReviews({ productId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [histogram, setHistogram] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 });
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ rating: 5, title: "", review: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`/api/reviews?productId=${productId}&limit=10`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setTotal(data.pagination?.total || 0);
        // histogram isn't in paginated envelope; fetch raw via service shape fallback
        const h = (data as any).histogram;
        if (h) setHistogram(h);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    setError("");
    setOk("");
    setSaving(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, ...form }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Submit failed");
        return;
      }
      setOk("Thanks! Your review is pending moderation.");
      setForm({ rating: 5, title: "", review: "" });
    } finally {
      setSaving(false);
    }
  };

  const vote = async (id: string) => {
    const res = await fetch(`/api/reviews/${id}/helpful`, { method: "POST" });
    const data = await res.json();
    if (data.success) {
      setItems((arr) => arr.map((r) => (r._id === id ? { ...r, helpfulVotes: data.data.helpfulVotes } : r)));
    }
  };

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Customer Reviews ({total})</h2>
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <Card>
          <h3 className="font-semibold mb-3">Write a review</h3>
          <p className="text-xs text-surface-500 mb-3">Only verified purchasers can review. Reviews are moderated before appearing.</p>
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {ok && <p className="text-sm text-green-700 mb-2">{ok}</p>}
          <div className="flex gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setForm((f) => ({ ...f, rating: n }))} aria-label={`${n} stars`} className={`text-2xl ${n <= form.rating ? "text-yellow-500" : "text-surface-300"}`}>★</button>
            ))}
          </div>
          <Input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Review title" className="mb-2" />
          <textarea value={form.review} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, review: e.target.value }))} placeholder="What did you like? (min 10 chars)" className="w-full px-4 py-2.5 rounded-lg border border-surface-200 text-sm h-24 mb-3" />
          <Button onClick={submit} isLoading={saving} className="w-full">Submit Review</Button>
        </Card>
        <div className="space-y-4">
          {items.length === 0 && <Card className="p-6 text-center text-surface-500 text-sm">No approved reviews yet. Be the first!</Card>}
          {items.map((r) => (
            <Card key={r._id}>
              <div className="flex items-center gap-2">
                <span className="text-yellow-500">{"★".repeat(r.rating)}</span>
                <span className="font-semibold text-sm">{r.title}</span>
                {r.isVerifiedPurchase && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-semibold">Verified Purchase</span>}
              </div>
              <p className="text-sm text-surface-600 mt-2">{r.review}</p>
              <button onClick={() => vote(r._id)} className="text-xs text-surface-500 hover:text-blue-600 mt-2 flex items-center gap-1">
                <ThumbsUp className="w-3.5 h-3.5" /> Helpful ({r.helpfulVotes || 0})
              </button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
