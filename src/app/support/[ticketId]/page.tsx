"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/providers/ToastProvider";
import { ArrowLeft, Send } from "lucide-react";
import { formatDate } from "@/lib/utils";

const STATUS_VARIANT: Record<string, "warning" | "info" | "success" | "danger" | "default"> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  WAITING_ON_CUSTOMER: "warning",
  RESOLVED: "success",
  CLOSED: "default",
};

export default function TicketThreadPage() {
  const { ticketId: id } = useParams() as { ticketId: string };
  const router = useRouter();
  const toast = useToast();
  const [ticket, setTicket] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/support/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setTicket(data.data);
  };

  useEffect(() => { load(); }, [id]);

  const reply = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/support/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error("Reply failed", data.error?.message);
        return;
      }
      setMsg("");
      load();
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    await fetch(`/api/support/${id}`, { method: "DELETE" });
    toast.success("Ticket closed");
    load();
  };

  if (!ticket) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <Link href="/support" className="inline-flex items-center gap-1.5 text-sm text-surface-500 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> All tickets
      </Link>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-mono text-[11px] text-surface-400 dark:text-surface-500">{ticket.ticketNumber}</p>
          <Badge variant={STATUS_VARIANT[ticket.status] || "default"} size="sm">
            {ticket.status.replace(/_/g, " ")}
          </Badge>
        </div>
        <h1 className="text-xl font-bold text-surface-900 dark:text-surface-100">{ticket.subject}</h1>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">{ticket.category.replace(/_/g, " ")} · Opened {formatDate(ticket.createdAt)}</p>
      </div>

      <div className="space-y-3 mb-6">
        {(ticket.messages || []).map((m: any, i: number) => (
          <div
            key={i}
            className={`p-4 rounded-xl text-sm border ${
              m.sender === "ADMIN"
                ? "bg-brand-50 dark:bg-brand-950/20 border-brand-200 dark:border-brand-800"
                : "bg-white dark:bg-surface-900 border-surface-200 dark:border-surface-800"
            }`}
          >
            <p className="text-xs font-bold mb-1 text-surface-500 dark:text-surface-400">
              {m.sender === "ADMIN" ? "Support Team" : "You"}
            </p>
            <p className="text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{m.content}</p>
            {m.createdAt && (
              <p className="text-[10px] text-surface-400 dark:text-surface-500 mt-1.5">{formatDate(m.createdAt)}</p>
            )}
          </div>
        ))}
      </div>

      {ticket.status !== "CLOSED" ? (
        <Card>
          <textarea
            value={msg}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMsg(e.target.value)}
            placeholder="Write a reply..."
            className="w-full text-sm h-24 focus:outline-none resize-none bg-transparent text-surface-900 dark:text-surface-100 placeholder:text-surface-400"
          />
          <div className="flex gap-2 justify-end mt-2 pt-2 border-t border-surface-100 dark:border-surface-800">
            <Button variant="ghost" size="sm" onClick={close}>Close ticket</Button>
            <Button size="sm" onClick={reply} isLoading={busy} disabled={!msg.trim()}>
              <Send className="w-3.5 h-3.5 mr-1.5" /> Reply
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="p-4 text-center">
          <p className="text-sm text-surface-500 dark:text-surface-400">This ticket is closed.</p>
        </Card>
      )}
    </div>
  );
}
