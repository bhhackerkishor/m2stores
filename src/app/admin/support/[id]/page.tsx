"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AdminTicketPage() {
  const { id } = useParams() as { id: string };
  const [ticket, setTicket] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [next, setNext] = useState("WAITING_FOR_CUSTOMER");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const res = await fetch(`/api/admin/support/${id}`, { cache: "no-store" });
    const data = await res.json();
    if (data.success) setTicket(data.data);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

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

  if (!ticket) return <div className="text-surface-500">Loading…</div>;

  return (
    <div className="max-w-4xl">
      <p className="font-mono text-xs text-surface-500">{ticket.ticketNumber} · {ticket.priority} · {ticket.category.replace(/_/g, " ")}</p>
      <h1 className="text-2xl font-bold mb-1">{ticket.subject}</h1>
      <p className="text-sm text-surface-500 mb-6">{ticket.user?.name} ({ticket.user?.email || ticket.user?.phone}) · {ticket.status.replace(/_/g, " ")}</p>

      <div className="space-y-3 mb-6">
        {(ticket.messages || []).map((m: any, i: number) => (
          <div key={i} className={`p-4 rounded-xl text-sm ${m.sender === "ADMIN" ? "bg-blue-50 border border-blue-100 ml-8" : "bg-white border border-surface-200 mr-8"}`}>
            <p className="text-xs font-bold mb-1">{m.sender === "ADMIN" ? "You (Support)" : "Customer"}</p>
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
      </div>

      {error && <div className="mb-3 p-2 bg-red-50 text-red-700 text-sm rounded">{error}</div>}

      <Card>
        <textarea value={msg} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMsg(e.target.value)} placeholder="Write a reply…" className="w-full text-sm h-28 focus:outline-none" />
        <div className="flex gap-2 items-center mt-2 flex-wrap">
          <select value={next} onChange={(e) => setNext(e.target.value)} className="px-3 py-2 rounded-lg border border-surface-200 text-sm bg-white">
            <option value="WAITING_FOR_CUSTOMER">Waiting for customer</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
          </select>
          <Button size="sm" onClick={reply} isLoading={busy} className="ml-auto">Send Reply</Button>
        </div>
      </Card>
    </div>
  );
}
