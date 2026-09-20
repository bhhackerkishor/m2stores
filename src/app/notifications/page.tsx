"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/providers/ToastProvider";
import { EmptyNotifications } from "@/components/ui/empty-state";
import { Bell, Check } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Notification {
  _id: string;
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=30", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setItems(data.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markAll = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    toast.success("All marked as read");
    load();
  };

  const markOne = async (id: string) => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const unread = items.filter((n) => !n.read).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
            <Bell className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Notifications</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {unread > 0 ? `${unread} unread` : "All caught up"}
            </p>
          </div>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="ghost" onClick={markAll}>
            <Check className="w-4 h-4 mr-1.5" /> Mark all read
          </Button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-surface-100 dark:bg-surface-800 rounded-xl animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyNotifications />
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card key={n._id} className={`${n.read ? "opacity-60" : "border-l-2 border-l-brand-500"}`}>
              <div className="flex justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />}
                    <p className="font-semibold text-sm text-surface-900 dark:text-surface-100 truncate">{n.title}</p>
                  </div>
                  <p className="text-sm text-surface-600 dark:text-surface-400 mt-1 line-clamp-2">{n.body}</p>
                  <p className="text-xs text-surface-400 dark:text-surface-500 mt-1.5">{formatDate(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <button
                    onClick={() => markOne(n._id)}
                    className="text-[11px] font-medium text-brand-600 dark:text-brand-400 hover:underline shrink-0 mt-0.5"
                  >
                    Read
                  </button>
                )}
              </div>
              {n.link && (
                <Link href={n.link} className="text-xs text-brand-600 dark:text-brand-400 hover:underline mt-2 inline-block">
                  View details
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
