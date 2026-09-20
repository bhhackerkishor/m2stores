"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/providers/ToastProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { User, Shield, MapPin, LogOut, ChevronRight, Sun, Moon } from "lucide-react";

interface ProfileClientHubProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    createdAt: string;
  };
}

export default function ProfileClientHub({ user }: ProfileClientHubProps) {
  const router = useRouter();
  const toast = useToast();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.info("Signed out");
    router.push("/");
    router.refresh();
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-elevated">
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-100 truncate">{user.name}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 truncate">{user.email}</p>
          <Badge variant={user.role === "ADMIN" ? "info" : "default"} size="sm" className="mt-1">{user.role}</Badge>
        </div>
      </div>

      <nav className="space-y-2 mb-6">
        {[
          { href: "/profile/account", icon: User, label: "Account Details", desc: "Name, email, phone" },
          { href: "/profile/addresses", icon: MapPin, label: "Addresses", desc: "Manage delivery addresses" },
          { href: "/profile/security", icon: Shield, label: "Security", desc: "Password & sessions" },
          { href: "/orders", icon: ChevronRight, label: "Order History", desc: "Track your orders" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-4 p-4 bg-white dark:bg-surface-900 rounded-xl border border-surface-200 dark:border-surface-800 hover:shadow-card-hover transition-all duration-150 group"
          >
            <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center shrink-0 group-hover:bg-brand-50 dark:group-hover:bg-brand-950/30 transition-colors">
              <item.icon className="w-5 h-5 text-surface-500 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-medium text-sm text-surface-900 dark:text-surface-100 block">{item.label}</span>
              <span className="text-xs text-surface-500 dark:text-surface-400 block">{item.desc}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        ))}
      </nav>

      <Card className="mb-6">
        <h3 className="font-semibold mb-4 text-sm text-surface-900 dark:text-surface-100">Preferences</h3>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            <span className="text-sm text-surface-700 dark:text-surface-300">Theme</span>
          </div>
          <div className="flex gap-1">
            {(["light", "dark", "system"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-colors ${
                  theme === t
                    ? "bg-brand-600 text-white"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-surface-100"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 p-3 rounded-xl border border-danger-200 dark:border-danger-800 text-danger-600 dark:text-danger-400 hover:bg-danger-50 dark:hover:bg-danger-950/30 transition-colors font-medium text-sm"
      >
        <LogOut className="w-4 h-4" /> Sign Out
      </button>
    </div>
  );
}
