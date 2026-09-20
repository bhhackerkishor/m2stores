"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/providers/ToastProvider";
import { Shield, Eye, EyeOff, KeyRound } from "lucide-react";

export default function SecurityPage() {
  const router = useRouter();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"change-password" | "sessions">("change-password");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    if (form.newPassword.length < 8) {
      toast.error("Password too short", "Must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Password changed");
        setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error("Password change failed", data.error?.message);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100">Security</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400">Manage your password and sessions</p>
        </div>
      </div>

      <div role="tablist" className="flex gap-1 mb-6 p-1 bg-surface-100 dark:bg-surface-800 rounded-lg">
        {(["change-password", "sessions"] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            aria-controls={`panel-${tab}`}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium capitalize transition-all duration-150 ${
              activeTab === tab
                ? "bg-white dark:bg-surface-900 text-surface-900 dark:text-surface-100 shadow-sm"
                : "text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100"
            }`}
          >
            {tab.replace("-", " ")}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${activeTab}`}>
      {activeTab === "change-password" ? (
        <Card>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Current Password</label>
              <div className="relative">
                <Input
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  value={form.currentPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
                  placeholder="Enter current password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 touch-target"
                  aria-label={showCurrent ? "Hide current password" : "Show current password"}
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">New Password</label>
              <div className="relative">
                <Input
                  type={showNew ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.newPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
                  placeholder="Min 8 characters"
                  required
                  minLength={8}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 touch-target"
                  aria-label={showNew ? "Hide new password" : "Show new password"}
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5 uppercase tracking-wider">Confirm New Password</label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  value={form.confirmPassword}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Re-enter new password"
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600 touch-target"
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <Button type="submit" isLoading={saving}>
                <KeyRound className="w-4 h-4 mr-2" /> Update Password
              </Button>
            </div>
          </form>
        </Card>
      ) : (
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-accent-50 dark:bg-accent-950/30 rounded-lg border border-accent-200 dark:border-accent-800">
              <div className="w-2 h-2 rounded-full bg-accent-500 animate-pulse" />
              <div>
                <p className="font-medium text-sm text-surface-900 dark:text-surface-100">Current Session</p>
                <p className="text-xs text-surface-500 dark:text-surface-400">Active now on this device</p>
              </div>
              <span className="ml-auto px-2 py-0.5 bg-accent-100 dark:bg-accent-900/50 text-accent-700 dark:text-accent-300 rounded-full text-xs font-semibold">Active</span>
            </div>
            <p className="text-sm text-surface-500 dark:text-surface-400 px-1">All other sessions have been terminated for security.</p>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}
