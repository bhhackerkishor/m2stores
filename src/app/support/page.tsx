"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyTickets } from "@/components/ui/empty-state";
import { Plus, Headphones } from "lucide-react";

const CATS = ["ORDER_ISSUE", "PAYMENT_ISSUE", "PRODUCT_QUALITY", "SHIPPING_ISSUE", "RETURNS", "OTHER"] as const;

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "danger" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  WAITING_ON_CUSTOMER: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

export default function SupportPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "ORDER_ISSUE", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setTickets(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (form.subject.length < 5) {
      toast.error("Subject too short", "Min 5 characters");
      return;
    }
    if (form.message.length < 10) {
      toast.error("Message too short", "Describe your issue in more detail");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Failed", data.error?.message);
        return;
      }
      toast.success("Ticket created");
      setShow(false);
      setForm({ subject: "", category: "ORDER_ISSUE", message: "" });
      load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
            <Headphones className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Support</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">We usually reply within 24 hours</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShow(true)}>
          <Plus className="w-4 h-4 mr-1.5" /> New Ticket
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-20 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />)}
        </div>
      ) : tickets.length === 0 && !show ? (
        <EmptyTickets onAction={() => setShow(true)} />
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t._id} href={`/support/${t._id}`}>
              <Card className="hover:shadow-card-hover transition-shadow">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-mono text-[11px] text-surface-400 dark:text-surface-500">{t.ticketNumber}</p>
                    </div>
                    <p className="font-medium text-sm text-surface-900 dark:text-surface-100 truncate">{t.subject}</p>
                    <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t.category.replace(/_/g, " ")}</p>
                  </div>
                  <Badge variant={STATUS_VARIANT[t.status] || "default"} size="sm">
                    {t.status.replace(/_/g, " ")}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {show && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-lg shadow-elevated border border-surface-200 dark:border-surface-700">
            <h3 className="text-lg font-bold text-surface-900 dark:text-surface-100 mb-4">New Support Ticket</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Subject</label>
                <Input value={form.subject} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, subject: e.target.value }))} placeholder="Brief description (min 5 chars)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  aria-label="Ticket category"
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100"
                >
                  {CATS.map((c) => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Message</label>
                <textarea
                  value={form.message}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your issue in detail..."
                  className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-sm h-28 resize-none bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-5">
              <Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
              <Button onClick={create} isLoading={submitting}>Submit</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
