"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminImportExportPage() {
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const upload = async (kind: "products" | "inventory", file: File) => {
    setBusy(true);
    setError("");
    try {
      const text = await file.text();
      const url = kind === "products" ? "/api/admin/products/import" : "/api/admin/inventory/import";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "text/csv" }, body: text });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Import failed");
        return;
      }
      setResult({ kind, ...data.data });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Import / Export</h1>
      <p className="text-sm text-surface-500 mb-6">Every row is validated before writing. Errors are reported per row — valid rows still import.</p>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card>
          <h3 className="font-semibold mb-1">Products</h3>
          <p className="text-xs text-surface-500 mb-3">Headers: slug,name,categorySlug,brandSlug,basePrice,salePrice,baseSKU,status,tags</p>
          <div className="flex flex-col gap-2">
            <a href="/api/admin/products/import" className="btn-secondary text-center text-sm">Download Export</a>
            <label className="btn-primary text-center text-sm cursor-pointer">
              {busy ? "Working…" : "Upload CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload("products", e.target.files[0])} />
            </label>
          </div>
        </Card>
        <Card>
          <h3 className="font-semibold mb-1">Inventory</h3>
          <p className="text-xs text-surface-500 mb-3">Headers: sku,stock (+ optional productId/productSlug). Sets absolute stock, audit-logged.</p>
          <div className="flex flex-col gap-2">
            <a href="/api/admin/inventory/import" className="btn-secondary text-center text-sm">Download Export</a>
            <label className="btn-primary text-center text-sm cursor-pointer">
              {busy ? "Working…" : "Upload CSV"}
              <input type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && upload("inventory", e.target.files[0])} />
            </label>
          </div>
        </Card>
      </div>
      {result && (
        <Card>
          <h3 className="font-semibold mb-2">Last Import: {result.kind}</h3>
          <p className="text-sm">Created/updated: <b>{result.created ?? result.updated ?? 0}</b> · Failed: <b>{result.failed}</b></p>
          {(result.errors || []).length > 0 && (
            <table className="w-full text-xs mt-3">
              <thead><tr className="text-left uppercase text-surface-500"><th className="py-1">Row</th><th className="py-1">Error</th></tr></thead>
              <tbody className="divide-y">
                {result.errors.map((e: any, i: number) => (
                  <tr key={i}><td className="py-1">{e.row}</td><td className="py-1">{e.message}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </div>
  );
}
