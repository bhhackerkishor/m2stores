"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

export default function AdminReportsPage() {
  const [type, setType] = useState("sales");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [preview, setPreview] = useState<{ headers: string[]; rows: any[][]; count: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchJson = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ type, format: "json" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await fetch(`/api/admin/reports?${params.toString()}`);
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Report failed");
        return;
      }
      setPreview(data.data);
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const params = new URLSearchParams({ type, format: "csv" });
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    window.location.href = `/api/admin/reports?${params.toString()}`;
  };

  useEffect(() => {
    fetchJson();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Reports</h1>
      <Card className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>Report</Label>
            <select value={type} onChange={(e) => setType(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
              {["sales", "orders", "refunds", "inventory", "customers", "coupons", "payments"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div><Label>From</Label><Input type="date" value={from} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFrom(e.target.value)} /></div>
          <div><Label>To</Label><Input type="date" value={to} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTo(e.target.value)} /></div>
          <div className="flex items-end gap-2">
            <Button onClick={fetchJson} isLoading={loading} variant="outline">Preview</Button>
            <Button onClick={download}>CSV Export</Button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
      </Card>
      {preview && (
        <Card className="p-0 overflow-hidden">
          <div className="px-4 py-3 border-b text-sm text-surface-500">{preview.count} rows</div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-surface-50">
                <tr>{preview.headers.map((h) => <th key={h} className="px-3 py-2 text-left font-semibold uppercase">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {preview.rows.slice(0, 100).map((r, i) => (
                  <tr key={i}>{r.map((c: any, j: number) => <td key={j} className="px-3 py-1.5 whitespace-nowrap">{String(c)}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
