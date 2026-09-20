"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyAddresses } from "@/components/ui/empty-state";
import { Plus, Trash2, Check, MapPin, Star } from "lucide-react";

interface Addr {
  _id: string;
  name: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  landmark?: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

const emptyForm = { name: "", phone: "", addressLine1: "", addressLine2: "", landmark: "", city: "", state: "", pincode: "", country: "India", isDefault: false };

export default function AddressesPage() {
  const toast = useToast();
  const [addresses, setAddresses] = useState<Addr[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/addresses", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setAddresses(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm(emptyForm); setError(""); setShowForm(true); };

  const openEdit = (a: Addr) => {
    setEditing(a._id);
    setForm({ name: a.name, phone: a.phone, addressLine1: a.addressLine1, addressLine2: a.addressLine2 || "", landmark: a.landmark || "", city: a.city, state: a.state, pincode: a.pincode, country: a.country || "India", isDefault: a.isDefault });
    setError("");
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/addresses/${editing}` : "/api/addresses";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Save failed");
        return;
      }
      toast.success(editing ? "Address updated" : "Address added");
      setShowForm(false);
      load();
    } catch {
      setError("Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: "DELETE" });
    toast.success("Address removed");
    load();
  };

  const setDefault = async (id: string) => {
    await fetch(`/api/addresses/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ setDefault: true }) });
    toast.success("Default address updated");
    load();
  };

  const set = (k: string, v: string | boolean) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
            <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Addresses</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">{addresses.length} saved</p>
          </div>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="w-4 h-4 mr-1.5" /> Add
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-28 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />)}
        </div>
      ) : addresses.length === 0 && !showForm ? (
        <EmptyAddresses onAction={openNew} />
      ) : (
        <div className="space-y-3">
          {addresses.map((a) => (
            <Card key={a._id} className={`relative ${a.isDefault ? "border-brand-300 dark:border-brand-700 ring-1 ring-brand-200 dark:ring-brand-800" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-5 h-5 text-surface-500 dark:text-surface-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-surface-900 dark:text-surface-100">{a.name}</span>
                    {a.isDefault && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-brand-50 dark:bg-brand-950/30 text-brand-700 dark:text-brand-300 rounded text-[10px] font-semibold uppercase tracking-wider">
                        <Star className="w-2.5 h-2.5 fill-current" /> Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mb-1">{a.phone}</p>
                  <p className="text-sm text-surface-700 dark:text-surface-300 leading-relaxed">
                    {a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}{a.landmark ? ` (${a.landmark})` : ""}
                  </p>
                  <p className="text-sm text-surface-600 dark:text-surface-400">{a.city}, {a.state} - {a.pincode}</p>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  {!a.isDefault && (
                    <button onClick={() => setDefault(a._id)} className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline">
                      Default
                    </button>
                  )}
                  <button onClick={() => openEdit(a)} className="text-[11px] font-medium text-surface-500 dark:text-surface-400 hover:underline">
                    Edit
                  </button>
                  <button onClick={() => remove(a._id)} className="text-[11px] font-medium text-danger-600 dark:text-danger-400 hover:underline">
                    Delete
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4 overflow-auto">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-lg my-8 shadow-elevated border border-surface-200 dark:border-surface-700">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-4">{editing ? "Edit Address" : "New Address"}</h3>
            {error && <div className="mb-3 p-2.5 bg-danger-50 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300 text-sm rounded-lg border border-danger-200 dark:border-danger-800">{error}</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Full Name *</Label><Input autoFocus required autoComplete="name" value={form.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("name", e.target.value)} placeholder="Rahul Sharma" /></div>
              <div><Label>Phone *</Label><Input type="tel" required autoComplete="tel" value={form.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("phone", e.target.value)} placeholder="9876543210" maxLength={13} /></div>
              <div className="md:col-span-2"><Label>Address Line 1 *</Label><Input required autoComplete="address-line1" value={form.addressLine1} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("addressLine1", e.target.value)} placeholder="Flat / House no, Street" /></div>
              <div className="md:col-span-2"><Label>Address Line 2</Label><Input autoComplete="address-line2" value={form.addressLine2} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("addressLine2", e.target.value)} placeholder="Area (optional)" /></div>
              <div><Label>Landmark</Label><Input value={form.landmark} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("landmark", e.target.value)} placeholder="Near…" /></div>
              <div><Label>Pincode *</Label><Input inputMode="numeric" required autoComplete="postal-code" value={form.pincode} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="400001" maxLength={6} /></div>
              <div><Label>City *</Label><Input required autoComplete="address-level2" value={form.city} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("city", e.target.value)} placeholder="Mumbai" /></div>
              <div><Label>State *</Label><Input required autoComplete="address-level1" value={form.state} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("state", e.target.value)} placeholder="Maharashtra" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
              <input type="checkbox" checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} className="rounded border-surface-300" />
              <span className="text-surface-700 dark:text-surface-300">Set as default address</span>
            </label>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={save} isLoading={saving}><Check className="w-4 h-4 mr-1" /> Save</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
