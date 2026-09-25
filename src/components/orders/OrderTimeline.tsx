// components/orders/OrderTimeline.tsx
import { Check, Circle, MapPin } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Step {
  status: string;
  label: string;
  timestamp: string | Date | null;
  done: boolean;
}

interface ShippingEvent {
  status: string;
  location?: string;
  city?: string;
  timestamp: string | Date;
  note?: string;
}

export function OrderTimeline({
  steps,
  terminal,
  events,
}: {
  placedAt: string | Date | null;
  steps: Step[];
  terminal: string;
  events?: ShippingEvent[];
}) {
  const isCancelled = terminal === "CANCELLED";

  if (isCancelled) {
    return (
      <div className="p-4 bg-danger-50 dark:bg-danger-950/30 border border-danger-200 dark:border-danger-800 rounded-lg text-danger-700 dark:text-danger-400 text-xs flex items-center justify-between font-semibold">
        <span>Order was cancelled</span>
        <span className="px-2 py-0.5 bg-danger-100 dark:bg-danger-900/50 rounded-full text-[10px] uppercase">Cancelled</span>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {/* Horizontal — desktop */}
      <div className="hidden sm:flex items-center justify-between relative">
        <div className="absolute top-4 left-6 right-6 h-1 bg-surface-200 dark:bg-surface-800 -z-0" />

        {steps.map((s, idx) => {
          const isCurrent = s.done && (!steps[idx + 1] || !steps[idx + 1].done);

          return (
            <div key={s.status} className="relative z-10 flex flex-col items-center text-center flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  s.done
                    ? "bg-accent-600 dark:bg-accent-500 text-white shadow-md shadow-accent-500/20 ring-4 ring-white dark:ring-surface-900"
                    : "bg-surface-100 dark:bg-surface-800 text-surface-400 dark:text-surface-500 ring-4 ring-white dark:ring-surface-900 border border-surface-300 dark:border-surface-700"
                }`}
              >
                {s.done ? <Check className="w-5 h-5 stroke-[3]" /> : <Circle className="w-3 h-3 fill-surface-300 dark:fill-surface-600 text-surface-300 dark:text-surface-600" />}

                {isCurrent && <span className="absolute -inset-1 rounded-full bg-accent-500/30 animate-ping -z-10" />}
              </div>

              <p className={`text-xs font-bold mt-3 ${s.done ? "text-surface-900 dark:text-surface-100" : "text-surface-400 dark:text-surface-600"}`}>
                {s.label}
              </p>
              <p className="text-[11px] text-surface-500 dark:text-surface-500 mt-0.5 font-medium">{s.timestamp ? formatDate(s.timestamp) : "Pending"}</p>
            </div>
          );
        })}
      </div>

      {/* Vertical — mobile */}
      <div className="sm:hidden space-y-6 relative pl-6 border-l-2 border-surface-200 dark:border-surface-800 ml-3">
        {steps.map((s, idx) => {
          const isCurrent = s.done && (!steps[idx + 1] || !steps[idx + 1].done);

          return (
            <div key={s.status} className="relative">
              <span
                className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  s.done ? "bg-accent-600 dark:bg-accent-500 text-white" : "bg-surface-200 dark:bg-surface-800 text-surface-400 dark:text-surface-500"
                }`}
              >
                {s.done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-2 h-2 fill-current" />}
                {isCurrent && <span className="absolute -inset-1 rounded-full bg-accent-500/30 animate-ping -z-10" />}
              </span>

              <p className={`text-xs font-bold ${s.done ? "text-surface-900 dark:text-surface-100" : "text-surface-400 dark:text-surface-600"}`}>{s.label}</p>
              <p className="text-[10px] text-surface-500 dark:text-surface-500">{s.timestamp ? formatDate(s.timestamp) : "Pending"}</p>
            </div>
          );
        })}
      </div>

      {events && events.length > 0 && (
        <div className="mt-6 pt-4 border-t border-surface-100 dark:border-surface-800">
          <p className="text-xs font-semibold text-surface-700 dark:text-surface-300 mb-3 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            Shipment Tracking History
          </p>
          <div className="space-y-3">
            {[...events].reverse().map((ev, i) => (
              <div key={i} className="flex gap-3 text-xs relative">
                {i < events.length - 1 && <div className="absolute left-[5px] top-5 w-0.5 h-full bg-surface-200 dark:bg-surface-800" />}
                <div className={`w-3 h-3 rounded-full shrink-0 mt-0.5 ${i === 0 ? "bg-brand-500 ring-2 ring-brand-200 dark:ring-brand-900" : "bg-surface-300 dark:bg-surface-700"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-surface-800 dark:text-surface-200">{ev.status}</span>
                    {ev.location && (
                      <span className="inline-flex items-center gap-0.5 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-1.5 py-0.5 rounded-sm text-[10px] font-medium">
                        <MapPin className="w-2.5 h-2.5" />
                        {ev.location}
                        {ev.city ? `, ${ev.city}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-surface-400 dark:text-surface-500 font-mono mt-0.5">
                    {new Date(ev.timestamp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                    {new Date(ev.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {ev.note && <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5">{ev.note}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}