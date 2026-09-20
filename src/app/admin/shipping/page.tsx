"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function AdminShippingPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState("");
  const [courier, setCourier] = useState("");
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/orders?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setOrders((data.data || []).filter((o: any) => ["PACKED", "SHIPPED", "OUT_FOR_DELIVERY"].includes(o.orderStatus)));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createShipment = async (orderNumber: string) => {
    if (!tracking.trim()) {
      setError("Tracking number is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}/shipment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber: tracking, courier: courier || undefined }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed");
        return;
      }
      setTracking("");
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Shipping</h1>
      <p className="text-sm text-surface-500 mb-6">Manual provider today — courier abstraction ready for Delhivery/Shiprocket. Shipments record provider, shipment ID, fee, ETA and tracking events.</p>
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded">{error}</div>}
      {loading ? <p className="text-surface-500">Loading…</p> : (
        <div className="space-y-3">
          {orders.length === 0 && <Card className="p-8 text-center text-surface-500 text-sm">No shippable orders. Pack an order first.</Card>}
          {orders.map((o) => (
            <Card key={o.orderNumber}>
              <div className="flex justify-between gap-3 flex-wrap">
                <div>
                  <Link href={`/admin/orders/${o.orderNumber}`} className="font-mono font-bold text-blue-700 hover:underline">{o.orderNumber}</Link>
                  <p className="text-xs text-surface-500 mt-1">
                    {o.orderStatus}
                    {o.shippingDetails?.trackingNumber ? ` · ${o.shippingDetails.courier} ${o.shippingDetails.trackingNumber}` : " · no tracking yet"}
                    {o.shippingDetails?.shipmentId ? ` · ${o.shippingDetails.shipmentId}` : ""}
                  </p>
                  {(o.shippingDetails?.events || []).length > 0 && (
                    <ul className="text-xs text-surface-500 mt-1">
                      {o.shippingDetails.events.slice(-3).map((e: any, i: number) => (
                        <li key={i}>• {e.status}{e.location ? ` @ ${e.location}` : ""}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="flex gap-2 items-start">
                  <Button size="sm" variant="outline" onClick={() => setSelected(selected === o.orderNumber ? "" : o.orderNumber)}>
                    {selected === o.orderNumber ? "Close" : "Add Tracking"}
                  </Button>
                </div>
              </div>
              {selected === o.orderNumber && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-3">
                  <Input value={tracking} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTracking(e.target.value)} placeholder="Tracking number" />
                  <Input value={courier} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCourier(e.target.value)} placeholder="Courier (optional)" />
                  <Button size="sm" onClick={() => createShipment(o.orderNumber)} isLoading={busy}>Save Shipment</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
