"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

export default function AdminTicketPage() {
  const { id } = useParams() as { id: string };
  const [ticket, setTicket] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [next, setNext] = useState("WAITING_FOR_CUSTOMER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/support/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.success) setTicket(data.data);
    } catch (e) {
      console.error("Failed to load ticket details", e);
    } finally {
      if (isManual) setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const reply = async () => {
    if (!msg.trim()) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/support/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg, nextStatus: next }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Reply failed");
        return;
      }
      setMsg("");
      load();
    } finally {
      setBusy(false);
    }
  };

  if (!ticket) return <div className="p-6 text-surface-500 text-sm">Loading ticket details…</div>;

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-4">
      {/* Header and Refresh Bar */}
      <div className="flex items-start justify-between gap-4 border-b border-surface-200 pb-4">
        <div>
          <p className="font-mono text-xs text-surface-500">
            {ticket.ticketNumber} · {ticket.priority} · {ticket.category?.replace(/_/g, " ")}
          </p>
          <h1 className="text-2xl font-bold text-surface-900 mt-1">{ticket.subject}</h1>
          <p className="text-sm text-surface-500 mt-1">
            {ticket.user?.name} ({ticket.user?.email || ticket.user?.phone}) ·{" "}
            <span className="font-semibold text-surface-700">{ticket.status?.replace(/_/g, " ")}</span>
          </p>
        </div>

        {/* Refresh Button */}
        <Button
  variant="outline"
  size="sm"
  onClick={() => load(true)}
  disabled={refreshing}
  className="shrink-0 border-surface-200 dark:border-surface-700 text-surface-700 dark:text-surface-200 hover:bg-surface-100 dark:hover:bg-surface-800"
>
  <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin text-blue-600 dark:text-blue-400" : ""}`} />
  {refreshing ? "Refreshing..." : "Refresh"}
</Button>
      </div>

      {/* Notice/Helper Text */}
      <div className="p-3 bg-surface-50 dark:bg-surface-800/60 border border-surface-200 dark:border-surface-700 rounded-lg text-xs text-surface-600 dark:text-surface-300 flex items-center justify-between">
  <span>Click <strong>Refresh</strong> to get the latest messages from the customer.</span>
</div>
      {/* Messages Thread */}
<div className="space-y-3 my-6">
  {(ticket.messages || []).map((m: any, i: number) => (
    <div
      key={i}
      className={`p-4 rounded-xl text-sm transition-colors ${
        m.sender === "ADMIN"
          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 ml-8 text-blue-950 dark:text-blue-100"
          : "bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 mr-8 text-surface-900 dark:text-surface-100"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-surface-100/60 dark:border-surface-700/60">
        <p className="text-xs font-bold text-surface-800 dark:text-surface-200">
          {m.sender === "ADMIN" ? "You (Support)" : "Customer"}
        </p>

        {/* Date & Time Badge */}
        {(m.timestamp || m.createdAt) && (
          <span className="text-[11px] text-surface-500 dark:text-surface-400 font-mono">
            {new Date(m.timestamp || m.createdAt).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}{" "}
            ·{" "}
            {new Date(m.timestamp || m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        )}
      </div>
      <p className="whitespace-pre-wrap">{m.content}</p>
    </div>
  ))}
</div>

      {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{error}</div>}

      {/* Reply Card */}
      <Card className="p-4 space-y-3 bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-800">
  <textarea
    value={msg}
    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMsg(e.target.value)}
    placeholder="Write a response to the customer…"
    className="w-full text-sm h-28 focus:outline-none resize-none p-2 border border-surface-200 dark:border-surface-700 rounded-lg bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 placeholder:text-surface-400 dark:placeholder:text-surface-500 focus:ring-2 focus:ring-blue-500/20"
  />
  <div className="flex gap-2 items-center justify-between flex-wrap pt-2">
    <div className="flex items-center gap-2">
      <span className="text-xs text-surface-600 dark:text-surface-400 font-medium">Update Status:</span>
      <select
        value={next}
        onChange={(e) => setNext(e.target.value)}
        aria-label="Update ticket status"
        className="px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-700 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      >
        <option value="WAITING_FOR_CUSTOMER" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
          Waiting for customer
        </option>
        <option value="IN_PROGRESS" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
          In progress
        </option>
        <option value="RESOLVED" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
          Resolved
        </option>
        <option value="CLOSED" className="bg-white dark:bg-surface-800 text-surface-900 dark:text-surface-100">
          Closed
        </option>
      </select>
    </div>
    <Button size="sm" onClick={reply} isLoading={busy}>
      Send Reply
    </Button>
  </div>
</Card>
    </div>
  );
}