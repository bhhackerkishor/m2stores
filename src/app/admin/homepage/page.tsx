"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

const TYPES = ["BANNER", "CATEGORY_GRID", "PRODUCT_GRID", "PROMO_STRIP", "BRAND_LOGO", "FEATURED_SECTION"] as const;

export default function AdminHomepagePage() {
  const [sections, setSections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/homepage", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setSections((data.data.sections || []).sort((a: any, b: any) => a.ordering - b.ordering));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const move = (i: number, dir: -1 | 1) => {
    setSections((arr) => {
      const next = [...arr];
      const j = i + dir;
      if (j < 0 || j >= next.length) return next;
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((s, k) => ({ ...s, ordering: k }));
    });
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: sections.map((s, i) => ({ ...s, ordering: i })) }),
      });
      const data = await res.json();
      if (!data.success) setError(data.error?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold">Homepage CMS</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setSections((a) => [...a, { id: `sec_${Date.now()}`, type: "PRODUCT_GRID", title: "New Collection", ordering: a.length, isActive: true }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Section
          </Button>
          <Button onClick={save} isLoading={saving}>Save Order</Button>
        </div>
      </div>
      <p className="text-sm text-surface-500 mb-6">Reorder sections with arrows. Inactive sections are hidden on the storefront.</p>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <div className="space-y-3">
          {sections.map((s, i) => (
            <Card key={s.id} className="p-4 flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <button onClick={() => move(i, -1)} className="p-1 hover:bg-surface-100 rounded" aria-label="Move up"><ArrowUp className="w-4 h-4" /></button>
                <button onClick={() => move(i, 1)} className="p-1 hover:bg-surface-100 rounded" aria-label="Move down"><ArrowDown className="w-4 h-4" /></button>
              </div>
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input value={s.title || ""} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSections((a) => a.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} placeholder="Section title" />
                <select value={s.type} onChange={(e) => setSections((a) => a.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
                  {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.isActive} onChange={(e) => setSections((a) => a.map((x, j) => (j === i ? { ...x, isActive: e.target.checked } : x)))} /> Active
                </label>
              </div>
              <button onClick={() => setSections((a) => a.filter((_, j) => j !== i))} className="text-red-600"><Trash2 className="w-4 h-4" /></button>
            </Card>
          ))}
          {sections.length === 0 && <Card className="p-8 text-center text-surface-500 text-sm">No sections yet. Add your first collection above.</Card>}
        </div>
      )}
    </div>
  );
}
