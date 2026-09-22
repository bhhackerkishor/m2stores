"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/providers/ToastProvider";
import { User, Save } from "lucide-react";

interface AccountClientProps {
  user: { name: string; email: string; phone: string };
}

export default function AccountClient({ user }: AccountClientProps) {
  const router = useRouter();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, phone: user.phone });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Profile updated");
        router.refresh();
      } else {
        toast.error("Update failed", data.error?.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
          <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Account Details</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">Manage your personal information</p>
        </div>
      </div>

      <Card>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Full Name</label>
            <Input
              autoFocus
              autoComplete="name"
              value={form.name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Your full name"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Email</label>
            <Input
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Phone</label>
            <Input
              type="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="9876543210"
              maxLength={13}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={saving}>
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
