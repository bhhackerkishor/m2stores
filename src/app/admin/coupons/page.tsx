"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ code: "", discountType: "PERCENTAGE", discountValue: "10", minOrderValue: "0", maxDiscountAmount: "", startDate: "", expiryDate: "", usageLimitTotal: "1000", perUserLimit: "1", isActive: true });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/coupons", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setCoupons(data.data);
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
      const res = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code,
          discountType: form.discountType,
          discountValue: parseFloat(form.discountValue),
          minOrderValue: parseFloat(form.minOrderValue) || 0,
          maxDiscountAmount: form.maxDiscountAmount ? parseFloat(form.maxDiscountAmount) : undefined,
          startDate: form.startDate || new Date().toISOString(),
          expiryDate: form.expiryDate,
          usageLimitTotal: parseInt(form.usageLimitTotal) || 1000,
          perUserLimit: parseInt(form.perUserLimit) || 1,
          isActive: form.isActive,
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

  const remove = async (code: string) => {
    if (!confirm(`Delete coupon ${code}?`)) return;
    await fetch(`/api/admin/coupons/${code}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Coupons ({coupons.length})</h1>
        <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-2" /> New Coupon</Button>
      </div>
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <Card className="p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-50 border-b text-left text-xs uppercase text-surface-500">
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3 text-right">Used</th>
                <th className="px-4 py-3">Valid Till</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {coupons.map((c) => (
                <tr key={c.code}>
                  <td className="px-4 py-3 font-mono font-bold">{c.code}</td>
                  <td className="px-4 py-3">{c.discountType === "PERCENTAGE" ? `${c.discountValue}%` : `₹${c.discountValue}`}{c.maxDiscountAmount ? ` (cap ₹${c.maxDiscountAmount})` : ""}</td>
                  <td className="px-4 py-3 text-right">{c.usageCount}/{c.usageLimitTotal}</td>
                  <td className="px-4 py-3">{new Date(c.expiryDate).toLocaleDateString("en-IN")}</td>
                  <td className="px-4 py-3">{c.isActive ? "Active" : "Inactive"}</td>
                  <td className="px-4 py-3 text-right"><button onClick={() => remove(c.code)} className="text-red-600 text-xs"><Trash2 className="w-3 h-3 inline" /> Delete</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg my-8">
            <h3 className="text-lg font-bold mb-4">New Coupon</h3>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Code *</Label><Input value={form.code} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("code", e.target.value.toUpperCase())} placeholder="DIWALI20" /></div>
              <div><Label>Type</Label>
                <select value={form.discountType} onChange={(e) => set("discountType", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
                  <option value="PERCENTAGE">PERCENTAGE</option>
                  <option value="FIXED">FIXED (₹)</option>
                </select>
              </div>
              <div><Label>Value *</Label><Input type="number" value={form.discountValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("discountValue", e.target.value)} /></div>
              <div><Label>Min Order (₹)</Label><Input type="number" value={form.minOrderValue} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("minOrderValue", e.target.value)} /></div>
              <div><Label>Max Discount (₹)</Label><Input type="number" value={form.maxDiscountAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("maxDiscountAmount", e.target.value)} placeholder="cap for %" /></div>
              <div><Label>Usage Limit</Label><Input type="number" value={form.usageLimitTotal} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("usageLimitTotal", e.target.value)} /></div>
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
