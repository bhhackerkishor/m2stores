"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function AdminSettingsPage() {
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setForm(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError("");
    setOk("");
    try {
      const body: any = {};
      const num = (k: string) => {
        if (form[k] !== "" && form[k] !== undefined && form[k] !== null) body[k] = parseFloat(form[k]);
      };
      const str = (k: string) => { if (form[k] !== undefined) body[k] = form[k]; };
      const bool = (k: string) => { if (form[k] !== undefined) body[k] = !!form[k]; };

      str("storeName"); str("contactEmail"); str("contactPhone"); str("contactAddress"); str("currency"); str("currencySymbol");
      num("taxRate"); str("gstIn"); str("businessName"); str("businessAddress"); str("businessState"); str("businessStateCode");
      str("bankName"); str("bankAccount"); str("bankIFSC"); str("bankBranch");
      num("shippingFlatRate"); num("freeShippingThreshold"); bool("freeShippingEnabled"); num("expressFee");
      bool("isCODEnabled"); num("codMinOrderValue"); num("codMaxOrderValue"); num("codFee"); num("returnWindowDays");
      str("phonePeMerchantId"); num("phonePeSaltIndex"); str("phonePeEnvironment"); str("phonePeHostUrl");
      bool("notificationEmailEnabled"); bool("notificationSMSEnabled"); str("seoTitle"); str("seoDescription");

      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) { setError(data.error?.message || "Save failed"); return; }
      setForm(data.data);
      setOk("Settings saved successfully.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-surface-500">Loading settings...</p>;

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Store Settings</h1>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}
      {ok && <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg">{ok}</div>}
      <div className="space-y-6">
        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Store Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Store Name</Label><Input value={form.storeName || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("storeName", e.target.value)} /></div>
            <div><Label>Contact Email</Label><Input type="email" value={form.contactEmail || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("contactEmail", e.target.value)} /></div>
            <div><Label>Contact Phone</Label><Input value={form.contactPhone || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("contactPhone", e.target.value)} /></div>
            <div><Label>Contact Address</Label><Input value={form.contactAddress || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("contactAddress", e.target.value)} /></div>
            <div><Label>Return Window (days)</Label><Input type="number" value={form.returnWindowDays ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("returnWindowDays", e.target.value)} /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Business &amp; Invoice Details</h3>
          <p className="text-xs text-surface-500 mb-3">These appear on invoices and GST filings.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Business Name</Label><Input value={form.businessName || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("businessName", e.target.value)} /></div>
            <div><Label>GSTIN</Label><Input value={form.gstIn || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("gstIn", e.target.value)} maxLength={15} placeholder="27AAAAA0000A1Z5" /></div>
            <div className="md:col-span-2"><Label>Business Address</Label><Input value={form.businessAddress || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("businessAddress", e.target.value)} /></div>
            <div><Label>Business State</Label><Input value={form.businessState || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("businessState", e.target.value)} placeholder="Maharashtra" /></div>
            <div><Label>State Code</Label><Input value={form.businessStateCode || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("businessStateCode", e.target.value)} maxLength={2} placeholder="27" /></div>
            <div><Label>Bank Name</Label><Input value={form.bankName || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("bankName", e.target.value)} /></div>
            <div><Label>Bank Account No.</Label><Input value={form.bankAccount || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("bankAccount", e.target.value)} /></div>
            <div><Label>Bank IFSC</Label><Input value={form.bankIFSC || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("bankIFSC", e.target.value)} maxLength={11} /></div>
            <div><Label>Bank Branch</Label><Input value={form.bankBranch || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("bankBranch", e.target.value)} /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Commerce</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><Label>GST % (fallback)</Label><Input type="number" value={form.taxRate ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("taxRate", e.target.value)} /></div>
            <div><Label>Flat Shipping (₹)</Label><Input type="number" value={form.shippingFlatRate ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("shippingFlatRate", e.target.value)} /></div>
            <div><Label>COD Fee (₹)</Label><Input type="number" value={form.codFee ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("codFee", e.target.value)} /></div>
            <div><Label>COD Min Order</Label><Input type="number" value={form.codMinOrderValue ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("codMinOrderValue", e.target.value)} /></div>
            <div><Label>COD Max Order</Label><Input type="number" value={form.codMaxOrderValue ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("codMaxOrderValue", e.target.value)} /></div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!form.isCODEnabled} onChange={(e) => set("isCODEnabled", e.target.checked)} /> COD enabled</label></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">Shipping</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Free Shipping Threshold (₹)</Label>
              <Input type="number" value={form.freeShippingThreshold ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("freeShippingThreshold", e.target.value)} placeholder="499" />
            </div>
            <div>
              <Label>Express Fee (₹)</Label>
              <Input type="number" value={form.expressFee ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("expressFee", e.target.value)} placeholder="99" />
            </div>
            <div className="flex items-end pb-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.freeShippingEnabled !== false} onChange={(e) => set("freeShippingEnabled", e.target.checked)} /> Free shipping enabled</label></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">PhonePe</h3>
          <p className="text-xs text-surface-500 mb-3">Salt key is managed via env var only.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label>Merchant ID</Label><Input value={form.phonePeMerchantId || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("phonePeMerchantId", e.target.value)} /></div>
            <div><Label>Salt Index</Label><Input type="number" value={form.phonePeSaltIndex ?? ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("phonePeSaltIndex", e.target.value)} /></div>
            <div>
              <Label>Environment</Label>
              <select value={form.phonePeEnvironment || "SANDBOX"} onChange={(e) => set("phonePeEnvironment", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white dark:bg-surface-800 dark:border-surface-700">
                <option value="SANDBOX">Sandbox</option>
                <option value="PRODUCTION">Production</option>
              </select>
            </div>
            <div><Label>Host URL</Label><Input value={form.phonePeHostUrl || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("phonePeHostUrl", e.target.value)} /></div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold text-lg mb-4 border-b pb-2">SEO</h3>
          <div className="space-y-4">
            <div><Label>SEO Title</Label><Input value={form.seoTitle || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("seoTitle", e.target.value)} /></div>
            <div><Label>SEO Description</Label><Input value={form.seoDescription || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("seoDescription", e.target.value)} /></div>
          </div>
        </Card>

        <Button onClick={save} isLoading={saving} size="lg">Save All Settings</Button>
      </div>
    </div>
  );
}
