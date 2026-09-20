"use client";

import { useState, useEffect, useRef } from "react";
import { formatPrice } from "@/lib/utils";
import { Printer, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceProps {
  order: any;
  className?: string;
}

export function Invoice({ order, className }: InvoiceProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    fetch("/api/admin/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (d.success) setSettings(d.data); })
      .catch(() => {});
  }, []);

  const biz = settings || {};
  const bizName = biz.businessName || biz.storeName || "M2Stores";
  const gstin = biz.gstIn || "";
  const bizAddr = biz.businessAddress || biz.contactAddress || "";
  const bizState = biz.businessState || "";
  const bizStateCode = biz.businessStateCode || "";
  const bizPhone = biz.contactPhone || "";
  const bizEmail = biz.contactEmail || "";
  const bankName = biz.bankName || "";
  const bankAcct = biz.bankAccount || "";
  const bankIFSC = biz.bankIFSC || "";
  const bankBranch = biz.bankBranch || "";

  const handlePrint = () => window.print();
  const handleDownload = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${order.orderNumber}</title><style>
      body{font-family:'Segoe UI',system-ui,sans-serif;margin:0;padding:24px;color:#1a1a1a;font-size:13px;line-height:1.5}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th,td{border:1px solid #d1d5db;padding:8px 10px;text-align:left}
      th{background:#f3f4f6;font-weight:600}
      .inv-header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:16px;margin-bottom:16px}
      .inv-title{font-size:22px;font-weight:800;color:#2563eb}
      .inv-sub{font-size:11px;color:#6b7280}
      .inv-badge{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;border-radius:4px;padding:2px 8px;font-size:10px;font-weight:600}
      .inv-section{margin:16px 0}
      .inv-section h3{font-size:12px;text-transform:uppercase;color:#6b7280;letter-spacing:0.5px;margin-bottom:8px}
      .inv-total{font-size:18px;font-weight:800;color:#2563eb}
      .inv-footer{margin-top:24px;border-top:1px solid #e5e7eb;padding-top:12px;font-size:11px;color:#9ca3af}
    </style></head><body>${printRef.current.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  };
  console.log(settings)
  const items = (order.items || []).map((item: any) => ({
    name: item.name || item.nameSnapshot || "Product",
    sku: item.sku || "",
    hsn: item.hsnCode || "",
    qty: item.quantity || 1,
    rate: item.unitPrice || 0,
    discount: item.discount || 0,
    taxable: (item.quantity || 1) * (item.unitPrice || 0) - (item.discount || 0),
    gstRate: item.gstRate ?? order.taxRate ?? biz.gstIn ? 18 : 0,
    gstAmount: 0,
  }));
  items.forEach((it: any) => { it.gstAmount = (it.taxable * it.gstRate) / 100; });

  const subtotal = items.reduce((s: number, it: any) => s + it.taxable, 0);
  const totalGST = items.reduce((s: number, it: any) => s + it.gstAmount, 0);
  const shipping = order.pricingSnapshot?.shippingFee || 0;
  const discount = order.pricingSnapshot?.discount || order.couponDiscount || 0;
  const grandTotal = order.pricingSnapshot?.grandTotal || subtotal + totalGST + shipping - discount;

  return (
    <div className={className}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-surface-900">Tax Invoice</h3>
        <div className="flex gap-2 no-print">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
        </div>
      </div>
      <div ref={printRef}>
        <div className="inv-header" style={{ display: "flex", justifyContent: "space-between", borderBottom: "2px solid #2563eb", paddingBottom: 16, marginBottom: 16 }}>
          <div>
            <div className="inv-title" style={{ fontSize: 22, fontWeight: 800, color: "#2563eb" }}>{bizName}</div>
            {bizAddr && <div className="inv-sub" style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{bizAddr}</div>}
            {bizState && <div className="inv-sub" style={{ fontSize: 11, color: "#6b7280" }}>{bizState}</div>}
            {bizPhone && <div className="inv-sub" style={{ fontSize: 11, color: "#6b7280" }}>Ph: {bizPhone}</div>}
            {bizEmail && <div className="inv-sub" style={{ fontSize: 11, color: "#6b7280" }}>{bizEmail}</div>}
            {gstin && <div className="inv-sub mt-1" style={{ fontSize: 11, color: "#1d4ed8", fontWeight: 600 }}>GSTIN: {gstin}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div className="inv-title" style={{ fontSize: 18, fontWeight: 800, color: "#1a1a1a" }}>TAX INVOICE</div>
            <div style={{ marginTop: 8, fontSize: 12 }}><strong>Invoice #:</strong> INV-{order.orderNumber}</div>
            <div style={{ fontSize: 12 }}><strong>Order #:</strong> {order.orderNumber}</div>
            <div style={{ fontSize: 12 }}><strong>Date:</strong> {new Date(order.createdAt).toLocaleDateString("en-IN")}</div>
            {order.paymentInfo?.status === "PAID" && (
              <div style={{ marginTop: 4 }}><span className="inv-badge" style={{ background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 600 }}>PAID</span></div>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, margin: "16px 0" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.5px", marginBottom: 6 }}>Bill To</div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{order.shippingAddress?.fullName || "Customer"}</div>
            {order.shippingAddress?.line1 && <div style={{ fontSize: 12 }}>{order.shippingAddress.line1}</div>}
            {order.shippingAddress?.line2 && <div style={{ fontSize: 12 }}>{order.shippingAddress.line2}</div>}
            <div style={{ fontSize: 12 }}>{[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")} - {order.shippingAddress?.pincode}</div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", color: "#6b7280", letterSpacing: "0.5px", marginBottom: 6 }}>Payment</div>
            <div style={{ fontSize: 12 }}><strong>Method:</strong> {order.paymentInfo?.method}</div>
            <div style={{ fontSize: 12 }}><strong>Status:</strong> {order.paymentInfo?.status}</div>
          </div>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", margin: "12px 0" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "left", background: "#f3f4f6", fontWeight: 600 }}>#</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "left", background: "#f3f4f6", fontWeight: 600 }}>Product</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "left", background: "#f3f4f6", fontWeight: 600 }}>HSN</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right", background: "#f3f4f6", fontWeight: 600 }}>Qty</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right", background: "#f3f4f6", fontWeight: 600 }}>Rate</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right", background: "#f3f4f6", fontWeight: 600 }}>Disc</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right", background: "#f3f4f6", fontWeight: 600 }}>Taxable</th>
              <th style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right", background: "#f3f4f6", fontWeight: 600 }}>GST</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => (
              <tr key={i}>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px" }}>{i + 1}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px" }}>{it.name}<br /><span style={{ fontSize: 10, color: "#9ca3af" }}>SKU: {it.sku}</span></td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", fontSize: 11 }}>{it.hsn || "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right" }}>{it.qty}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right" }}>{formatPrice(it.rate)}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right" }}>{it.discount > 0 ? `-${formatPrice(it.discount)}` : "-"}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right" }}>{formatPrice(it.taxable)}</td>
                <td style={{ border: "1px solid #d1d5db", padding: "8px 10px", textAlign: "right" }}>{it.gstRate}%<br />{formatPrice(it.gstAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", justifyContent: "space-between", margin: "16px 0" }}>
          <div style={{ fontSize: 11, color: "#9ca3af" }}>
            <div>Amount in words: <em>{numberToWords(Math.round(grandTotal))} Only</em></div>
            {bankName && <div style={{ marginTop: 8 }}><strong>Bank:</strong> {bankName}{bankBranch ? `, ${bankBranch}` : ""}</div>}
            {bankAcct && <div><strong>A/C:</strong> {bankAcct}</div>}
            {bankIFSC && <div><strong>IFSC:</strong> {bankIFSC}</div>}
            {bizStateCode && <div style={{ marginTop: 4 }}><strong>Place of Supply:</strong> {bizStateCode} - {bizState}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Subtotal: {formatPrice(subtotal)}</div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>GST: {formatPrice(totalGST)}</div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Shipping: {formatPrice(shipping)}</div>
            {discount > 0 && <div style={{ fontSize: 12, marginBottom: 4, color: "#dc2626" }}>Discount: -{formatPrice(discount)}</div>}
            <div style={{ fontSize: 18, fontWeight: 800, color: "#2563eb", marginTop: 8 }}>Grand Total: {formatPrice(grandTotal)}</div>
          </div>
        </div>
        <div style={{ marginTop: 24, borderTop: "1px solid #e5e7eb", paddingTop: 12, fontSize: 11, color: "#9ca3af" }}>
          This is a computer-generated invoice. For queries, contact {bizEmail || bizPhone || bizName}.
        </div>
      </div>
    </div>
  );
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const conv = (x: number): string => {
    if (x < 20) return ones[x];
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? " " + ones[x % 10] : "");
    if (x < 1000) return ones[Math.floor(x / 100)] + " Hundred" + (x % 100 ? " and " + conv(x % 100) : "");
    if (x < 100000) return conv(Math.floor(x / 1000)) + " Thousand" + (x % 1000 ? " " + conv(x % 1000) : "");
    if (x < 10000000) return conv(Math.floor(x / 100000)) + " Lakh" + (x % 100000 ? " " + conv(x % 100000) : "");
    return conv(Math.floor(x / 10000000)) + " Crore" + (x % 10000000 ? " " + conv(x % 10000000) : "");
  };
  return conv(n);
}
