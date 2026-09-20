"use client";

import { Bell, Search, Menu } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

interface AdminTopNavProps {
  onMobileMenuToggle: () => void;
}

export function AdminTopNav({ onMobileMenuToggle }: AdminTopNavProps) {
  const { resolved, setTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 px-4 sm:px-6 py-3 flex items-center justify-between sticky top-0 z-30 h-14">
      <div className="flex items-center gap-3 flex-1">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors touch-target"
          aria-label="Open Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative w-full max-w-xs sm:max-w-md">
          <Search className="w-4 h-4 text-surface-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full h-9 pl-9 pr-4 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 ml-3">
        <button
          onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
          className="p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors text-surface-500 dark:text-surface-400 touch-target"
          aria-label={`Switch to ${resolved === "dark" ? "light" : "dark"} mode`}
        >
          {resolved === "dark" ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
          )}
        </button>
        <button
          className="relative p-2 hover:bg-surface-100 dark:hover:bg-surface-800 rounded-lg transition-colors text-surface-500 dark:text-surface-400 touch-target"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger-500 rounded-full ring-2 ring-white dark:ring-surface-950" />
        </button>
        <div className="flex items-center gap-2.5 pl-2 border-l border-surface-200 dark:border-surface-700">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
            SA
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-medium text-surface-900 dark:text-surface-100 leading-none">Super Admin</span>
            <span className="text-[11px] text-surface-500 dark:text-surface-400 mt-0.5">admin@m2stores.com</span>
          </div>
        </div>
      </div>
    </header>
  );
}
