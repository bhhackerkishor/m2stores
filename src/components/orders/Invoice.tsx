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
      .then((d) => {
        if (d.success) setSettings(d.data);
      })
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

    const styles = Array.from(document.querySelectorAll("style, link[rel='stylesheet']"))
      .map((el) => el.outerHTML)
      .join("");

    const isDark = document.documentElement.classList.contains("dark");

    const w = window.open("", "_blank", "width=794,height=1123");
    if (!w) return;

    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice ${order.orderNumber}</title>
          ${styles}
          <style>
            @page {
              size: A4;
              margin: 10mm;
            }
            html, body {
              background: #fff !important;
              color: #0f172a !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              padding: 0;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            .invoice-page {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              box-sizing: border-box;
            }
            @media print {
              .invoice-page {
                width: auto;
                min-height: 0;
              }
              .invoice-card {
                border: none !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }
              table, tr, td, th {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="invoice-page p-4">${printRef.current.innerHTML}</div>
        </body>
      </html>
    `);

    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
    }, 250);
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
      attrs: item.attributesSnapshot
        ? Object.entries(item.attributesSnapshot as Record<string, any>)
            .filter(([, v]) => v !== undefined && v !== null && v !== "")
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ")
        : "",
      hsn: item.hsnCode || "",
      qty,
      rate,
      discount,
      taxable,
      gstRate,
      gstAmount,
      total: taxable + gstAmount,
    };
  });

  const subtotal = items.reduce((s: number, it: any) => s + it.taxable, 0);
  const totalGST = items.reduce((s: number, it: any) => s + it.gstAmount, 0);
  const shipping = order.pricingSnapshot?.shippingFee || 0;
  const discount = order.pricingSnapshot?.discount || order.couponDiscount || 0;
  const grandTotal =
    order.pricingSnapshot?.grandTotal || subtotal + totalGST + shipping - discount;

  const isPaid = order.paymentInfo?.status === "PAID";
  const statusLabel = isPaid ? "PAID" : order.paymentInfo?.status || "PENDING";

  return (
    <div className={className}>
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
        <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100">Tax Invoice</h3>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="w-full sm:w-auto border-surface-300 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-800 dark:text-surface-200"
          >
            <Download className="w-4 h-4 mr-2" /> Download / Print Invoice
          </Button>
        </div>
      </div>

      {/* Main Invoice Card */}
      <div
        ref={printRef}
        className="invoice-card relative overflow-hidden bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-xl text-[11px] leading-relaxed text-surface-800 dark:text-surface-200 shadow-sm print:shadow-none print:border-none print:rounded-none [print-color-adjust:exact] [-webkit-print-color-adjust:exact]"
      >
        {/* Brand accent rule */}
        <div className="h-1.5 w-full bg-brand-600 dark:bg-brand-500 print:h-1" />

        <div className="p-5 sm:p-8 print:p-0 print:text-[10px]">
          {/* Letterhead */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-6 mb-6 print:pb-4 print:mb-4 border-b border-surface-200 dark:border-surface-800">
            <div>
              <div className="text-2xl font-extrabold tracking-tight text-surface-900 dark:text-surface-50">
                {bizName}
              </div>
              <div className="mt-2 space-y-0.5 text-surface-500 dark:text-surface-400">
                {bizAddr && <p className="leading-snug">{bizAddr}</p>}
                {bizState && (
                  <p>
                    {bizState}
                    {bizStateCode && ` · ${bizStateCode}`}
                  </p>
                )}
                {gstin && <p className="text-surface-700 dark:text-surface-300 font-medium">GSTIN {gstin}</p>}
                {(bizPhone || bizEmail) && (
                  <p>{[bizPhone, bizEmail].filter(Boolean).join("  ·  ")}</p>
                )}
              </div>
            </div>

            <div className="w-full sm:w-auto sm:text-right">
              <div className="text-xl font-bold text-surface-900 dark:text-surface-50">
                Tax Invoice
              </div>
              <p className="text-surface-400 dark:text-surface-500">Original for recipient</p>

              <div className="mt-3 inline-flex flex-col items-start sm:items-end gap-0.5">
                <div className="flex items-baseline gap-2">
                  <span className="text-surface-400 dark:text-surface-500">Invoice No.</span>
                  <span className="font-mono font-semibold text-surface-900 dark:text-surface-100">
                    INV-{order.orderNumber}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-surface-400 dark:text-surface-500">Order No.</span>
                  <span className="font-mono text-surface-700 dark:text-surface-300">{order.orderNumber}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-surface-400 dark:text-surface-500">Date</span>
                  <span className="text-surface-700 dark:text-surface-300">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <span
                className={`mt-3 inline-block px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wide border ${
                  isPaid
                    ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:bg-emerald-950/40"
                    : "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:bg-amber-950/40"
                }`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 print:mb-4">
            <div>
              <p className="font-semibold text-surface-900 dark:text-surface-100 mb-1">Billed to</p>
              <p className="text-surface-700 dark:text-surface-300 font-medium">
                {order.shippingAddress?.fullName || "Customer"}
              </p>
              {order.shippingAddress?.line1 && (
                <p className="text-surface-500 dark:text-surface-400">{order.shippingAddress.line1}</p>
              )}
              {order.shippingAddress?.line2 && (
                <p className="text-surface-500 dark:text-surface-400">{order.shippingAddress.line2}</p>
              )}
              <p className="text-surface-500 dark:text-surface-400">
                {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")}
                {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
              </p>
            </div>

            <div>
              <p className="font-semibold text-surface-900 dark:text-surface-100 mb-1">Shipped to</p>
              <p className="text-surface-700 dark:text-surface-300 font-medium">
                {order.shippingAddress?.fullName || "Customer"}
              </p>
              {order.shippingAddress?.line1 && (
                <p className="text-surface-500 dark:text-surface-400">{order.shippingAddress.line1}</p>
              )}
              {order.shippingAddress?.line2 && (
                <p className="text-surface-500 dark:text-surface-400">{order.shippingAddress.line2}</p>
              )}
              <p className="text-surface-500 dark:text-surface-400">
                {[order.shippingAddress?.city, order.shippingAddress?.state].filter(Boolean).join(", ")}
                {order.shippingAddress?.pincode ? ` - ${order.shippingAddress.pincode}` : ""}
              </p>
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block print:block overflow-x-auto mb-2 rounded-lg print:rounded-none border border-surface-200 dark:border-surface-800">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-surface-50 dark:bg-surface-800/60 text-surface-500 dark:text-surface-400 border-b border-surface-200 dark:border-surface-800 text-[10px] print:text-[9px] font-semibold">
                  <th className="p-2.5 print:p-1.5 w-8">#</th>
                  <th className="p-2.5 print:p-1.5">Item</th>
                  <th className="p-2.5 print:p-1.5 text-right">Qty</th>
                  <th className="p-2.5 print:p-1.5 text-right">Rate</th>
                  <th className="p-2.5 print:p-1.5 text-right">Discount</th>
                  <th className="p-2.5 print:p-1.5 text-right">Taxable</th>
                  <th className="p-2.5 print:p-1.5 text-right">GST</th>
                  <th className="p-2.5 print:p-1.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-surface-800">
                {items.map((it: any, i: number) => (
                  <tr key={i}>
                    <td className="p-2.5 print:p-1.5 text-surface-400 dark:text-surface-500">{i + 1}</td>
                    <td className="p-2.5 print:p-1.5 font-medium text-surface-900 dark:text-surface-100">
                      {it.name}
                      {it.attrs && (
                        <div className="text-[9px] font-semibold text-surface-500 dark:text-surface-400">
                          {it.attrs}
                        </div>
                      )}
                      {it.sku && (
                        <div className="text-[9px] font-normal text-surface-400 dark:text-surface-500 font-mono">
                          SKU {it.sku}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 print:p-1.5 text-right">{it.qty}</td>
                    <td className="p-2.5 print:p-1.5 text-right font-mono">{formatPrice(it.rate)}</td>
                    <td className="p-2.5 print:p-1.5 text-right font-mono text-surface-400 dark:text-surface-500">
                      {it.discount > 0 ? `-${formatPrice(it.discount)}` : "—"}
                    </td>
                    <td className="p-2.5 print:p-1.5 text-right font-mono">{formatPrice(it.taxable)}</td>
                    <td className="p-2.5 print:p-1.5 text-right text-surface-500 dark:text-surface-400">
                      {formatPrice(it.gstAmount)}
                      <span className="text-[9px] text-surface-400 dark:text-surface-500"> ({it.gstRate}%)</span>
                    </td>
                    <td className="p-2.5 print:p-1.5 text-right font-mono font-semibold text-surface-900 dark:text-surface-100">
                      {formatPrice(it.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Items Cards */}
          <div className="block md:hidden print:hidden space-y-2 mb-2">
            {items.map((it: any, i: number) => (
              <div
                key={i}
                className="p-3 border border-surface-200 dark:border-surface-800 rounded-lg bg-surface-50/60 dark:bg-surface-800/30"
              >
                <div className="flex justify-between items-start gap-2">
                  <p className="font-medium text-surface-900 dark:text-surface-100">{it.name}</p>
                  <p className="font-mono font-semibold text-surface-900 dark:text-surface-100 shrink-0">
                    {formatPrice(it.total)}
                  </p>
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-surface-200 dark:border-surface-800 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px] text-surface-500 dark:text-surface-400">
                  <span>Qty {it.qty} × {formatPrice(it.rate)}</span>
                  <span className="text-right">Taxable {formatPrice(it.taxable)}</span>
                  <span>GST {it.gstRate}%</span>
                  <span className="text-right">{formatPrice(it.gstAmount)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex flex-col md:flex-row justify-between items-start gap-6 print:gap-4 pt-6 mt-4 print:pt-3 print:mt-2 border-t border-surface-200 dark:border-surface-800">
            <div className="w-full md:max-w-xs space-y-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                  Amount in words
                </p>
                <p className="text-surface-700 dark:text-surface-300 font-medium">
                  {numberToWords(Math.round(grandTotal))} Only
                </p>
              </div>

              {(bankName || bankAcct) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                    Bank details
                  </p>
                  <p className="text-surface-500 dark:text-surface-400 leading-snug">
                    {bankName}
                    {bankAcct && <><br />A/C {bankAcct}</>}
                    {bankIFSC && <><br />IFSC {bankIFSC}</>}
                    {bankBranch && <><br />{bankBranch}</>}
                  </p>
                </div>
              )}
            </div>

            <div className="w-full md:w-64 space-y-1.5">
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>Subtotal</span>
                <span className="font-mono">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>GST</span>
                <span className="font-mono">{formatPrice(totalGST)}</span>
              </div>
              <div className="flex justify-between text-surface-500 dark:text-surface-400">
                <span>Shipping</span>
                <span className="font-mono">{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-rose-600 dark:text-rose-400">
                  <span>Discount</span>
                  <span className="font-mono">-{formatPrice(discount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline font-bold text-base text-surface-900 dark:text-surface-50 border-t border-surface-900/20 dark:border-surface-100/20 pt-2 mt-2">
                <span>Total</span>
                <span className="font-mono text-brand-600 dark:text-brand-400">{formatPrice(grandTotal)}</span>
              </div>
            </div>
          </div>

          {/* Footnote */}
          <div className="mt-8 pt-4 print:mt-4 print:pt-2 border-t border-surface-100 dark:border-surface-800 text-[9px] text-surface-400 dark:text-surface-500 text-center space-y-0.5">
            <p>Tax payable on reverse charge basis: No</p>
            <p>This is a computer-generated invoice and does not require a signature.</p>
          </div>
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