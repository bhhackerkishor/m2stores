import { Check, Circle } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Step {
  status: string;
  label: string;
  timestamp: string | Date | null;
  done: boolean;
}

export function OrderTimeline({ 
  steps, 
  terminal 
}: { 
  placedAt: string | Date | null; 
  steps: Step[]; 
  terminal: string 
}) {
  const isCancelled = terminal === "CANCELLED";

  if (isCancelled) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center justify-between font-semibold">
        <span>Order was cancelled</span>
        <span className="px-2 py-0.5 bg-red-100 rounded-full text-[10px] uppercase">Cancelled</span>
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {/* Horizontal Layout for Medium/Large screens */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Background Connecting Line */}
        <div className="absolute top-4 left-6 right-6 h-1 bg-surface-200 -z-0" />

        {steps.map((s, idx) => {
          const isCurrent = s.done && (!steps[idx + 1] || !steps[idx + 1].done);

          return (
            <div key={s.status} className="relative z-10 flex flex-col items-center text-center flex-1">
              {/* Step Icon */}
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  s.done
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 ring-4 ring-white"
                    : "bg-surface-100 text-surface-400 ring-4 ring-white border border-surface-300"
                }`}
              >
                {s.done ? (
                  <Check className="w-5 h-5 stroke-[3]" />
                ) : (
                  <Circle className="w-3 h-3 fill-surface-300 text-surface-300" />
                )}

                {/* Animated Pulse Ring for current stage */}
                {isCurrent && (
                  <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping -z-10" />
                )}
              </div>

              {/* Step Labels */}
              <p className={`text-xs font-bold mt-3 ${s.done ? "text-surface-900" : "text-surface-400"}`}>
                {s.label}
              </p>
              <p className="text-[11px] text-surface-500 mt-0.5 font-medium">
                {s.timestamp ? formatDate(s.timestamp) : "Pending"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Vertical Layout for Mobile screens */}
      <div className="sm:hidden space-y-6 relative pl-6 border-l-2 border-surface-200 ml-3">
        {steps.map((s, idx) => {
          const isCurrent = s.done && (!steps[idx + 1] || !steps[idx + 1].done);

          return (
            <div key={s.status} className="relative">
              <span
                className={`absolute -left-[33px] top-0 w-6 h-6 rounded-full flex items-center justify-center ${
                  s.done ? "bg-emerald-600 text-white" : "bg-surface-200 text-surface-400"
                }`}
              >
                {s.done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Circle className="w-2 h-2 fill-current" />}
                {isCurrent && <span className="absolute -inset-1 rounded-full bg-emerald-500/30 animate-ping -z-10" />}
              </span>

              <p className={`text-xs font-bold ${s.done ? "text-surface-900" : "text-surface-400"}`}>{s.label}</p>
              <p className="text-[10px] text-surface-500">{s.timestamp ? formatDate(s.timestamp) : "Pending"}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}