"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", type: "PERCENTAGE", discountValue: "10", maxDiscountAmount: "", buyQty: "2", getQty: "1", minOrderValue: "0", startDate: "", expiryDate: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/offers", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setOffers(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    try {
      const res = await fetch("/api/admin/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          type: form.type,
          discountValue: form.type === "PERCENTAGE" ? parseFloat(form.discountValue) : undefined,
          maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
          buyQty: form.type === "BXGY" ? parseInt(form.buyQty) : undefined,
          getQty: form.type === "BXGY" ? parseInt(form.getQty) : undefined,
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          startDate: form.startDate || new Date().toISOString(),
          expiryDate: form.expiryDate,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Save failed");
        return;
      }
      setShow(false);
      load();
    } catch {
      setError("Save failed");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this offer?")) return;
    await fetch(`/api/admin/offers/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Offers ({offers.length})</h1>
        <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-2" /> New Offer</Button>
      </div>
      <p className="text-sm text-surface-500 mb-6">Best matching offer auto-applies at checkout. Free-shipping offers zero the shipping fee.</p>
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {offers.map((o) => (
            <Card key={o._id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-bold uppercase text-purple-700">{o.type}</p>
                  <h3 className="font-bold">{o.title}</h3>
                  <p className="text-xs text-surface-500 mt-1">
                    {o.type === "PERCENTAGE" && `${o.discountValue}% off`}
                    {o.type === "BXGY" && `Buy ${o.buyQty} get ${o.getQty}`}
                    {o.type === "FREE_SHIPPING" && "Free shipping"} · {o.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <button onClick={() => remove(o._id)} className="text-red-600 text-xs"><Trash2 className="w-3 h-3 inline" /> Delete</button>
              </div>
            </Card>
          ))}
        </div>
      )}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">New Offer</h3>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label>Title *</Label><Input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("title", e.target.value)} placeholder="Festive 15% off" /></div>
              <div><Label>Type</Label>
                <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="FREE_SHIPPING">FREE_SHIPPING</option>
                  <option value="BXGY">BUY X GET Y</option>
                </select>
              </div>
              <div><Label>Min Order (₹)</Label><Input type="number" value={form.minOrderValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("minOrderValue", e.target.value)} /></div>
              {form.type === "PERCENTAGE" && (<div><Label>Percent *</Label><Input type="number" value={form.discountValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("discountValue", e.target.value)} /></div>)}
              {form.type === "PERCENTAGE" && (<div><Label>Max Discount (₹)</Label><Input type="number" value={form.maxDiscountAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("maxDiscountAmount", e.target.value)} /></div>)}
              {form.type === "BXGY" && (<div><Label>Buy Qty</Label><Input type="number" value={form.buyQty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("buyQty", e.target.value)} /></div>)}
              {form.type === "BXGY" && (<div><Label>Get Qty</Label><Input type="number" value={form.getQty} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("getQty", e.target.value)} /></div>)}
              <div><Label>Start</Label><Input type="date" value={form.startDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("startDate", e.target.value)} /></div>
              <div><Label>Expiry *</Label><Input type="date" value={form.expiryDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("expiryDate", e.target.value)} /></div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
              <Button onClick={save}>Create</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
