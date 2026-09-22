"use client";

import { useState, useEffect, useRef } from "react";
import { formatPrice } from "@/lib/utils";
import { Download } from "lucide-react";
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

  const handleDownload = () => {
    if (!printRef.current) return;
    const w = window.open("", "_blank", "width=800,height=600");
    if (!w) return;
    w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${order.orderNumber}</title><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:'Segoe UI',system-ui,-apple-system,sans-serif;color:#1a1a1a;font-size:12px;line-height:1.5;padding:20px}
      .inv{max-width:700px;margin:0 auto}
      .inv-header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:12px;border-bottom:2px solid #2563eb;margin-bottom:16px}
      .inv-brand{font-size:20px;font-weight:800;color:#2563eb}
      .inv-sub{font-size:10px;color:#6b7280;line-height:1.4}
      .inv-title{font-size:14px;font-weight:700;text-align:right;color:#374151}
      .inv-meta{font-size:11px;text-align:right;margin-top:4px}
      .inv-meta strong{color:#374151}
      .inv-badge{display:inline-block;background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:4px;padding:1px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px}
      .inv-sections{display:flex;gap:20px;margin:14px 0}
      .inv-section{flex:1}
      .inv-label{font-size:9px;text-transform:uppercase;color:#9ca3af;letter-spacing:0.8px;font-weight:600;margin-bottom:4px}
      .inv-val{font-size:11px;color:#374151;line-height:1.6}
      .inv-val strong{color:#111827}
      table{width:100%;border-collapse:collapse;margin:12px 0}
      th{background:#f8fafc;border:1px solid #e2e8f0;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;color:#64748b;letter-spacing:0.5px;font-weight:600}
      td{border:1px solid #e2e8f0;padding:6px 8px;font-size:11px}
      .text-right{text-align:right}
      .inv-totals{display:flex;justify-content:flex-end;margin-top:12px}
      .inv-totals-box{width:240px}
      .inv-totals-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px;color:#475569}
      .inv-totals-row.total{border-top:2px solid #2563eb;margin-top:4px;padding-top:6px;font-size:14px;font-weight:800;color:#2563eb}
      .inv-words{font-size:10px;color:#6b7280;font-style:italic;margin:12px 0;padding:8px;background:#f8fafc;border-radius:4px}
      .inv-bank{font-size:10px;color:#64748b;margin:10px 0;line-height:1.6}
      .inv-footer{margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;font-size:9px;color:#9ca3af;text-align:center}
    </style></head><body><div class="inv">${printRef.current.innerHTML}</div></body></html>`);
    w.document.close();
    w.print();
  };

  const items = (order.items || []).map((item: any) => {
    const qty = item.quantity || 1;
    const rate = item.unitPrice || 0;
    const discount = item.discount || 0;
    const taxable = qty * rate - discount;
    const gstRate = item.gstRate ?? order.taxRate ?? (biz.gstIn ? 18 : 0);
    const gstAmount = (taxable * gstRate) / 100;
    return {
      name: item.name || item.nameSnapshot || "Product",
      sku: item.sku || "",
      hsn: item.hsnCode || "",
      qty,
      rate,
      discount,
      taxable,
      gstRate,
      gstAmount,
    };
  });

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
            <Download className="w-4 h-4 mr-2" /> Download & Print
          </Button>
        </div>
      </div>
      <div ref={printRef} className="bg-white border border-surface-200 rounded-xl p-6 text-[11px]">
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b-2 border-blue-600 mb-4">
          <div>
            <div className="text-xl font-extrabold text-blue-600 tracking-tight">{bizName}</div>
            {bizAddr && <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">{bizAddr}</div>}
            {bizState && <div className="text-[10px] text-slate-500">{bizState}</div>}
            {bizPhone && <div className="text-[10px] text-slate-500">Ph: {bizPhone}</div>}
            {bizEmail && <div className="text-[10px] text-slate-500">{bizEmail}</div>}
            {gstin && <div className="text-[10px] text-blue-700 font-semibold mt-1">GSTIN: {gstin}</div>}
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-slate-800 tracking-wide">TAX INVOICE</div>
            <div className="mt-2 text-[11px]"><strong className="text-slate-600">Invoice #:</strong> <span className="font-mono">INV-{order.orderNumber}</span></div>
            <div className="text-[11px]"><strong className="text-slate-600">Order #:</strong> <span className="font-mono">{order.orderNumber}</span></div>
            <div className="text-[11px]"><strong className="text-slate-600">Date:</strong> {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
            {order.paymentInfo?.status === "PAID" && (
              <div className="mt-1"><span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 rounded px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">Paid</span></div>
            )}
          </div>
        </div>

        {/* Bill To / Ship To */}
        <div className="flex gap-5 mb-4">
          <div className="flex-1">
            <div className="text-[9px] uppercase text-slate-400 tracking-wider font-semibold mb-1">Bill To</div>
            <div className="font-semibold text-[11px] text-slate-800">{order.shippingAddress?.fullName || "Customer"}</div>
            {order.shippingAddress?.line1 && <div className="text-[10px] text-slate-600">{order.shippingAddress.line1}</div>}
            {order.shippingAddress?.line2 && <div className="text-[10px] text-slate-600">{order.shippingAddress.line2}</div>}
            <div className="text-[10px] text-slate-600">
              {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")} - {order.shippingAddress?.pincode}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[9px] uppercase text-slate-400 tracking-wider font-semibold mb-1">Payment Details</div>
            <div className="text-[10px] text-slate-600"><strong>Method:</strong> {order.paymentInfo?.method === "PHONEPE" ? "Online Payment (PhonePe)" : "Cash on Delivery"}</div>
            <div className="text-[10px] text-slate-600"><strong>Status:</strong> {order.paymentInfo?.status === "PAID" ? "Paid" : order.paymentInfo?.status}</div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-left">#</th>
              <th className="text-left">Item Description</th>
              <th className="text-left">HSN</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Rate</th>
              <th className="text-right">Disc.</th>
              <th className="text-right">Taxable</th>
              <th className="text-right">GST</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it: any, i: number) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <div className="font-medium text-slate-800">{it.name}</div>
                  {it.sku && <div className="text-[9px] text-slate-400 font-mono">SKU: {it.sku}</div>}
                </td>
                <td className="text-[10px] text-slate-500">{it.hsn || "-"}</td>
                <td className="text-right">{it.qty}</td>
                <td className="text-right">{formatPrice(it.rate)}</td>
                <td className="text-right">{it.discount > 0 ? `-${formatPrice(it.discount)}` : "-"}</td>
                <td className="text-right font-medium">{formatPrice(it.taxable)}</td>
                <td className="text-right">
                  <div>{it.gstRate}%</div>
                  <div className="text-[10px] text-slate-500">{formatPrice(it.gstAmount)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-between items-end mt-3">
          <div className="text-[10px] text-slate-400 italic">
            Amount in words: <em>{numberToWords(Math.round(grandTotal))} Only</em>
          </div>
          <div className="w-56">
            <div className="flex justify-between text-[11px] text-slate-500 py-0.5">
              <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 py-0.5">
              <span>GST</span><span>{formatPrice(totalGST)}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 py-0.5">
              <span>Shipping</span><span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[11px] text-red-500 py-0.5">
                <span>Discount</span><span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-extrabold text-blue-600 border-t-2 border-blue-600 mt-1 pt-2">
              <span>Total</span><span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* Bank Details */}
        {(bankName || bankAcct || bankIFSC) && (
          <div className="mt-3 text-[10px] text-slate-500 bg-slate-50 rounded p-2">
            <strong className="text-slate-600">Bank Details:</strong> {bankName}
            {bankBranch ? `, ${bankBranch}` : ""}
            {bankAcct && <span> | A/C: {bankAcct}</span>}
            {bankIFSC && <span> | IFSC: {bankIFSC}</span>}
            {bizStateCode && <span className="ml-2">| Place of Supply: {bizStateCode} - {bizState}</span>}
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 border-t border-slate-200 pt-3 text-center text-[9px] text-slate-400">
          This is a digitally generated invoice and does not require a physical signature.
          <br />
          For any queries, please contact {bizEmail || bizPhone || bizName}.
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
