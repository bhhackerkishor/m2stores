"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastCtx {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastCtx>({
  toast: () => {},
  success: () => {},
  error: () => {},
  warning: () => {},
  info: () => {},
  dismiss: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

const ICONS: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const TYPE_STYLES: Record<ToastType, { icon: string; border: string; bg: string }> = {
  success: { icon: "text-accent-500", border: "border-accent-200", bg: "bg-accent-50" },
  error: { icon: "text-danger-500", border: "border-danger-200", bg: "bg-danger-50" },
  warning: { icon: "text-warning-500", border: "border-warning-200", bg: "bg-warning-50" },
  info: { icon: "text-brand-500", border: "border-brand-200", bg: "bg-brand-50" },
};

let counter = 0;
function genId() {
  return `toast-${++counter}-${Date.now()}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = genId();
      setToasts((prev) => [...prev.slice(-4), { ...t, id }]);
      const dur = t.duration ?? (t.type === "error" ? 6000 : 4000);
      setTimeout(() => dismiss(id), dur);
    },
    [dismiss]
  );

  const api: ToastCtx = {
    toast: addToast,
    success: (title, message) => addToast({ type: "success", title, message }),
    error: (title, message) => addToast({ type: "error", title, message }),
    warning: (title, message) => addToast({ type: "warning", title, message }),
    info: (title, message) => addToast({ type: "info", title, message }),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      {mounted &&
        createPortal(
          <div
            aria-live="polite"
            aria-label="Notifications"
            className="fixed bottom-20 right-4 z-[100] flex flex-col gap-2 pointer-events-none md:bottom-6 md:right-6 max-w-sm w-full"
          >
            {toasts.map((t) => {
              const Icon = ICONS[t.type];
              const style = TYPE_STYLES[t.type];
              return (
                <div
                  key={t.id}
                  role="status"
                  className={`pointer-events-auto animate-toast-in bg-white dark:bg-surface-800 border ${style.border} rounded-xl shadow-xl p-4 flex gap-3 items-start`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${style.icon}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-900 dark:text-surface-100">{t.title}</p>
                    {t.message && (
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{t.message}</p>
                    )}
                    {t.action && (
                      <button
                        onClick={t.action.onClick}
                        className="text-xs font-semibold text-brand-600 dark:text-brand-400 mt-1.5 hover:underline"
                      >
                        {t.action.label}
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => dismiss(t.id)}
                    className="p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 text-surface-400 shrink-0"
                    aria-label="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
