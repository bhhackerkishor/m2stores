"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", type: "HERO", imageUrl: "", ordering: "0", link: "" });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/banners", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setBanners(data.data);
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
      const res = await fetch("/api/admin/banners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          subtitle: form.subtitle || undefined,
          type: form.type,
          image: { url: form.imageUrl, publicId: `banner_${Date.now()}` },
          link: form.link || undefined,
          ordering: parseInt(form.ordering) || 0,
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
    if (!confirm("Delete this banner?")) return;
    await fetch(`/api/admin/banners?id=${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Banners ({banners.length})</h1>
        <Button onClick={() => setShow(true)}><Plus className="w-4 h-4 mr-2" /> New Banner</Button>
      </div>
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((b) => (
            <Card key={b._id} className="p-4">
              {b.image?.url && <img src={b.image.url} alt={b.title} className="w-full h-32 object-cover rounded-lg mb-3" />}
              <p className="text-xs font-bold uppercase text-blue-700">{b.type} · #{b.ordering}</p>
              <h3 className="font-bold">{b.title}</h3>
              {b.subtitle && <p className="text-sm text-surface-500">{b.subtitle}</p>}
              <button onClick={() => remove(b._id)} className="text-red-600 text-xs mt-2"><Trash2 className="w-3 h-3 inline" /> Delete</button>
            </Card>
          ))}
        </div>
      )}
      {show && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-bold mb-4">New Banner</h3>
            {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
            <div className="space-y-3">
              <div><Label>Title *</Label><Input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("title", e.target.value)} /></div>
              <div><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("subtitle", e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Type</Label>
                  <select value={form.type} onChange={(e) => set("type", e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
                    <option value="HERO">HERO</option>
                    <option value="PROMOTIONAL">PROMOTIONAL</option>
                    <option value="CATEGORY">CATEGORY</option>
                    <option value="CAMPAIGN">CAMPAIGN</option>
                  </select>
                </div>
                <div><Label>Ordering</Label><Input type="number" value={form.ordering} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("ordering", e.target.value)} /></div>
              </div>
              <div><Label>Image URL *</Label><Input value={form.imageUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("imageUrl", e.target.value)} placeholder="https://…" /></div>
              <div><Label>Link (optional)</Label><Input value={form.link} onChange={(e: React.ChangeEvent<HTMLInputElement>) => set("link", e.target.value)} placeholder="/category/electronics" /></div>
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
