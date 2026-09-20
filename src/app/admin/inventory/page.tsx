"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

interface Row {
  _id: string;
  productId: { _id: string; name: string; slug: string } | string;
  sku: string;
  stock: number;
  reservedStock: number;
  available: number;
  isLowStock: boolean;
  lowStockThreshold?: number;
}

export default function AdminInventoryPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [lowOnly, setLowOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [adjusting, setAdjusting] = useState<Row | null>(null);
  const [delta, setDelta] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (q) params.set("q", q);
      if (lowOnly) params.set("lowStock", "true");
      const res = await fetch(`/api/admin/inventory?${params.toString()}`);
      const data = await res.json();
      if (data.success) setRows(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdjust = async () => {
    if (!adjusting) return;
    setSaving(true);
    setError("");
    try {
      const productId = typeof adjusting.productId === "string" ? adjusting.productId : adjusting.productId._id;
      const res = await fetch("/api/admin/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          sku: adjusting.sku,
          delta: parseInt(delta),
          reason,
          performedBy: "admin",
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Adjustment failed");
        return;
      }
      setAdjusting(null);
      setDelta("");
      setReason("");
      load();
    } catch {
      setError("Adjustment failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-surface-900">Inventory</h1>
          <p className="text-surface-600 mt-1">Source of truth: InventoryState (stock / reserved / available)</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Search SKU..." value={q} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQ(e.target.value)} className="w-48" />
          <Button variant="outline" onClick={load}>Search</Button>
          <Button variant={lowOnly ? "default" : "outline"} onClick={() => { setLowOnly((v) => !v); setTimeout(load, 0); }}>
            Low stock
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface-50 border-b border-surface-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-surface-500 uppercase text-xs">SKU</th>
              <th className="px-4 py-3 text-left font-semibold text-surface-500 uppercase text-xs">Product</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-500 uppercase text-xs">Stock</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-500 uppercase text-xs">Reserved</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-500 uppercase text-xs">Available</th>
              <th className="px-4 py-3 text-left font-semibold text-surface-500 uppercase text-xs">Status</th>
              <th className="px-4 py-3 text-right font-semibold text-surface-500 uppercase text-xs">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-surface-500">No inventory rows. Seed products to generate stock.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r._id} className="hover:bg-surface-50">
                  <td className="px-4 py-3 font-mono font-semibold">{r.sku}</td>
                  <td className="px-4 py-3">{typeof r.productId === "string" ? r.productId.slice(0, 8) : r.productId.name}</td>
                  <td className="px-4 py-3 text-right">{r.stock}</td>
                  <td className="px-4 py-3 text-right">{r.reservedStock}</td>
                  <td className="px-4 py-3 text-right font-bold">{r.available}</td>
                  <td className="px-4 py-3">
                    {r.isLowStock ? (
                      <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold">Low stock</span>
                    ) : (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">Healthy</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="outline" onClick={() => setAdjusting(r)}>Adjust</Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {adjusting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold mb-1">Adjust {adjusting.sku}</h3>
            <p className="text-sm text-surface-500 mb-4">Current: {adjusting.stock} stock / {adjusting.reservedStock} reserved. Every adjustment is audit-logged.</p>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <label className="text-sm font-medium">Delta (+receive / −correction)</label>
            <Input type="number" value={delta} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDelta(e.target.value)} placeholder="e.g. 10 or -2" className="mb-3" />
            <label className="text-sm font-medium">Reason (min 5 chars, required for audit)</label>
            <Input value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)} placeholder="Stock received from supplier…" className="mb-4" />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setAdjusting(null)}>Cancel</Button>
              <Button onClick={handleAdjust} isLoading={saving}>Confirm adjustment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
