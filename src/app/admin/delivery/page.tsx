"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Truck, Banknote, Save, MapPin, Info } from "lucide-react";

type Mode = "all" | "allowlist" | "blocklist";

interface DeliveryForm {
  deliveryPincodeMode: Mode;
  deliveryAllowedPincodes: string;
  deliveryAllowedPrefixes: string;
  deliveryBlockedPincodes: string;
  isCODEnabled: boolean;
  codPincodeMode: Mode;
  codAllowedPincodes: string;
  codAllowedPrefixes: string;
  codBlockedPincodes: string;
  codMinOrderValue: number;
  codMaxOrderValue: number;
  codFee: number;
  codDaysCal: number;
}

const TN_PREFIXES = ["600", "601", "602", "603", "604", "605", "606", "607", "608", "609", "610", "611", "612", "613", "614", "615", "616", "617", "618", "619", "620", "621", "622", "623", "624", "625", "626", "627", "628", "629", "630", "631", "632", "633", "634", "635", "636", "637", "638", "639", "640", "641"];

const toList = (v: string): string[] =>
  v.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
const toText = (v: string[] | undefined): string => (v || []).join(", ");

const MODE_HELP: Record<Mode, string> = {
  all: "Every pincode passes (recommended when you deliver broadly).",
  allowlist: "ONLY listed pincodes/prefixes pass — everything else is rejected.",
  blocklist: "EVERYTHING passes except listed pincodes/prefixes.",
};

function ModeSelect({ value, onChange, id }: { value: Mode; onChange: (m: Mode) => void; id: string }) {
  return (
    <div className="flex gap-2 flex-wrap" role="radiogroup" aria-label="Pincode mode">
      {(["all", "allowlist", "blocklist"] as Mode[]).map((m) => (
        <button
          key={m}
          id={`${id}-${m}`}
          type="button"
          role="radio"
          aria-checked={value === m}
          onClick={() => onChange(m)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-colors ${
            value === m
              ? "border-brand-600 bg-brand-50 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300"
              : "border-surface-200 dark:border-surface-700 text-surface-500 hover:border-surface-300"
          }`}
        >
          {m === "all" ? "All pincodes" : m === "allowlist" ? "Allowed only" : "Blocked only"}
        </button>
      ))}
    </div>
  );
}

function ListEditor({
  label,
  hint,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const count = toList(value).length;
  return (
    <div>
      <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">
        {label} <span className="font-normal text-surface-400">({count} entries)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="w-full rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500"
      />
      <p className="text-[11px] text-surface-400 mt-1">{hint}</p>
    </div>
  );
}

export default function AdminDeliveryPage() {
  const [form, setForm] = useState<DeliveryForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [testPincode, setTestPincode] = useState("");
  const [testResult, setTestResult] = useState<string>("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to load settings");
        return;
      }
      const s = data.data || {};
      setForm({
        deliveryPincodeMode: s.deliveryPincodeMode || "all",
        deliveryAllowedPincodes: toText(s.deliveryAllowedPincodes),
        deliveryAllowedPrefixes: toText(s.deliveryAllowedPrefixes),
        deliveryBlockedPincodes: toText(s.deliveryBlockedPincodes),
        isCODEnabled: !!s.isCODEnabled,
        codPincodeMode: s.codPincodeMode || (s.codAllowedPincodes?.length ? "allowlist" : "all"),
        codAllowedPincodes: toText(s.codAllowedPincodes),
        codAllowedPrefixes: toText(s.codAllowedPrefixes),
        codBlockedPincodes: toText(s.codBlockedPincodes),
        codMinOrderValue: s.codMinOrderValue ?? 0,
        codMaxOrderValue: s.codMaxOrderValue ?? 50000,
        codFee: s.codFee ?? 0,
        codDaysCal: s.codDaysCal ?? 3,
      });
    } catch {
      setError("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = <K extends keyof DeliveryForm>(k: K, v: DeliveryForm[K]) => {
    setForm((f) => (f ? { ...f, [k]: v } : f));
    setSaved("");
  };

  const save = async () => {
    if (!form) return;
    setError("");
    setSaved("");
    const payload = {
      deliveryPincodeMode: form.deliveryPincodeMode,
      deliveryAllowedPincodes: toList(form.deliveryAllowedPincodes),
      deliveryAllowedPrefixes: toList(form.deliveryAllowedPrefixes),
      deliveryBlockedPincodes: toList(form.deliveryBlockedPincodes),
      isCODEnabled: form.isCODEnabled,
      codPincodeMode: form.codPincodeMode,
      codAllowedPincodes: toList(form.codAllowedPincodes),
      codAllowedPrefixes: toList(form.codAllowedPrefixes),
      codBlockedPincodes: toList(form.codBlockedPincodes),
      codMinOrderValue: form.codMinOrderValue,
      codMaxOrderValue: form.codMaxOrderValue,
      codFee: form.codFee,
      codDaysCal: form.codDaysCal,
    };
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error?.message || "Failed to save");
        return;
      }
      setSaved("Saved. New rules apply to checkout immediately.");
    } catch {
      setError("Failed to save");
    } finally {
      setBusy(false);
    }
  };

  // Client-side preview of the same rules (server revalidates on checkout)
  const runTest = () => {
    if (!form || !/^\d{6}$/.test(testPincode)) {
      setTestResult("Enter a 6-digit pincode");
      return;
    }
    const check = (
      mode: Mode,
      allow: string[],
      prefixes: string[],
      block: string[],
      label: string
    ) => {
      if (mode === "all") return `${label}: OK`;
      if (mode === "blocklist") {
        const blocked = block.includes(testPincode) || prefixes.some((p) => testPincode.startsWith(p));
        return `${label}: ${blocked ? "BLOCKED" : "OK"}`;
      }
      const ok = allow.includes(testPincode) || prefixes.some((p) => testPincode.startsWith(p));
      return `${label}: ${ok ? "OK" : "NOT AVAILABLE"}`;
    };
    const d = check(
      form.deliveryPincodeMode,
      toList(form.deliveryAllowedPincodes),
      toList(form.deliveryAllowedPrefixes),
      toList(form.deliveryBlockedPincodes),
      "Delivery"
    );
    const c = form.isCODEnabled
      ? check(
          form.codPincodeMode,
          toList(form.codAllowedPincodes),
          toList(form.codAllowedPrefixes),
          toList(form.codBlockedPincodes),
          "COD"
        )
      : "COD: disabled storewide";
    setTestResult(`${d} · ${c}`);
  };

  if (loading || !form) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">Delivery & COD</h1>
        <p className="text-surface-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
        <Truck className="w-7 h-7 text-brand-600" /> Delivery & COD
      </h1>
      <p className="text-sm text-surface-500 mb-6">
        Serviceability and Cash-on-Delivery rules by pincode. Rules are checked live at checkout — delivery first, then COD eligibility.
      </p>

      {error && (
        <div className="mb-4 p-3 bg-danger-50 dark:bg-danger-950/30 text-danger-700 dark:text-danger-300 text-sm rounded-lg border border-danger-200 dark:border-danger-800">
          {error}
        </div>
      )}
      {saved && (
        <div className="mb-4 p-3 bg-success-50 dark:bg-success-950/30 text-success-700 dark:text-success-300 text-sm rounded-lg border border-success-200 dark:border-success-800">
          {saved}
        </div>
      )}

      {/* Pincode tester */}
      <Card className="mb-6">
        <div className="flex items-end gap-2 flex-wrap">
          <div className="grow min-w-[180px]">
            <label htmlFor="test-pincode" className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">
              Test a pincode
            </label>
            <Input
              id="test-pincode"
              value={testPincode}
              onChange={(e) => setTestPincode(e.target.value)}
              placeholder="e.g. 600028"
              maxLength={6}
              inputMode="numeric"
              className="font-mono"
            />
          </div>
          <Button variant="outline" onClick={runTest}>Check</Button>
        </div>
        {testResult && <p className="mt-2 text-sm font-semibold text-surface-700 dark:text-surface-300">{testResult}</p>}
        <p className="mt-2 text-[11px] text-surface-400 flex items-center gap-1">
          <Info className="w-3 h-3" /> Preview only — the server revalidates with the address entered at checkout.
        </p>
      </Card>

      {/* Delivery serviceability */}
      <Card className="mb-6">
        <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand-600" /> Delivery serviceability
        </h2>
        <p className="text-xs text-surface-500 mb-4">
          Which pincodes can we ship to at all? Undeliverable pincodes block checkout before payment.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">Pincode rule</label>
          <ModeSelect id="delivery-mode" value={form.deliveryPincodeMode} onChange={(m) => set("deliveryPincodeMode", m)} />
          <p className="text-[11px] text-surface-400 mt-1.5">{MODE_HELP[form.deliveryPincodeMode]}</p>
        </div>

        {form.deliveryPincodeMode === "allowlist" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
            <ListEditor
              label="Allowed pincode prefixes (3-digit)"
              hint="Tamil Nadu: 600–641. Each prefix covers ~1000 pincodes."
              value={form.deliveryAllowedPrefixes}
              onChange={(v) => set("deliveryAllowedPrefixes", v)}
              placeholder="600, 601, 602, …"
            />
            <ListEditor
              label="Allowed exact pincodes (6-digit)"
              hint="Extra pincodes outside the prefixes, e.g. other states you serve."
              value={form.deliveryAllowedPincodes}
              onChange={(v) => set("deliveryAllowedPincodes", v)}
              placeholder="110001, 400001, …"
            />
          </div>
        )}
        {form.deliveryPincodeMode === "blocklist" && (
          <ListEditor
            label="Blocked exact pincodes (6-digit)"
            hint="Checkout rejects exactly these pincodes. For whole-region rules use Allowed only mode with 3-digit prefixes."
            value={form.deliveryBlockedPincodes}
            onChange={(v) => set("deliveryBlockedPincodes", v)}
            placeholder="682001, 695001, …"
          />
        )}
        {form.deliveryPincodeMode === "all" && (
          <p className="text-xs text-surface-500 bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3 flex items-start gap-2">
            <Info className="w-4 h-4 mt-0.5 shrink-0" />
            Delivering to every pincode. Switch to <strong>Allowed only</strong> to restrict to Tamil Nadu (600–641) or any other list.
          </p>
        )}
      </Card>

      {/* COD */}
      <Card className="mb-6">
        <h2 className="font-semibold text-lg mb-1 flex items-center gap-2">
          <Banknote className="w-5 h-5 text-brand-600" /> Cash on Delivery
        </h2>
        <p className="text-xs text-surface-500 mb-4">
          COD requires delivery serviceability first, then these amount + pincode rules. Uneligible COD is disabled at checkout with a reason.
        </p>

        <label className="flex items-center gap-2 mb-4 cursor-pointer w-fit">
          <input
            type="checkbox"
            checked={form.isCODEnabled}
            onChange={(e) => set("isCODEnabled", e.target.checked)}
            className="w-4 h-4 rounded accent-brand-600"
          />
          <span className="text-sm font-semibold">COD enabled storewide</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div>
            <label htmlFor="cod-min" className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">Min order (₹)</label>
            <Input id="cod-min" type="number" min={0} value={form.codMinOrderValue}
              onChange={(e) => set("codMinOrderValue", Number(e.target.value) || 0)} />
          </div>
          <div>
            <label htmlFor="cod-max" className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">Max order (₹)</label>
            <Input id="cod-max" type="number" min={0} value={form.codMaxOrderValue}
              onChange={(e) => set("codMaxOrderValue", Number(e.target.value) || 0)} />
          </div>
          <div>
            <label htmlFor="cod-fee" className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">COD fee (₹)</label>
            <Input id="cod-fee" type="number" min={0} value={form.codFee}
              onChange={(e) => set("codFee", Number(e.target.value) || 0)} />
          </div>
          <div>
            <label htmlFor="cod-days" className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1">COD prep days</label>
            <Input id="cod-days" type="number" min={1} max={30} value={form.codDaysCal}
              onChange={(e) => set("codDaysCal", Number(e.target.value) || 1)} />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold text-surface-600 dark:text-surface-400 mb-1.5">COD pincode rule</label>
          <ModeSelect id="cod-mode" value={form.codPincodeMode} onChange={(m) => set("codPincodeMode", m)} />
          <p className="text-[11px] text-surface-400 mt-1.5">{MODE_HELP[form.codPincodeMode]}</p>
        </div>

        {form.codPincodeMode === "allowlist" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ListEditor
              label="COD prefixes (3-digit)"
              hint="Typically the same TN ranges: 600–641."
              value={form.codAllowedPrefixes}
              onChange={(v) => set("codAllowedPrefixes", v)}
              placeholder="600, 601, …"
            />
            <ListEditor
              label="COD exact pincodes (6-digit)"
              hint="Extra pincodes outside the prefixes."
              value={form.codAllowedPincodes}
              onChange={(v) => set("codAllowedPincodes", v)}
              placeholder="110001, …"
            />
          </div>
        )}
        {form.codPincodeMode === "blocklist" && (
          <ListEditor
            label="Blocked COD pincodes (6-digit)"
            hint="COD everywhere except these."
            value={form.codBlockedPincodes}
            onChange={(v) => set("codBlockedPincodes", v)}
            placeholder="682001, …"
          />
        )}
        {form.codPincodeMode === "all" && (
          <p className="text-xs text-surface-500 bg-surface-50 dark:bg-surface-800/50 rounded-lg p-3">
            COD allowed for every deliverable pincode (subject to min/max order value).
          </p>
        )}
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} isLoading={busy} size="lg">
          <Save className="w-4 h-4 mr-1.5" /> Save delivery rules
        </Button>
        <Button variant="ghost" onClick={load}>Reset</Button>
      </div>

      <div className="mt-8 p-4 rounded-xl bg-surface-50 dark:bg-surface-800/50 border border-surface-200 dark:border-surface-700">
        <h3 className="text-sm font-semibold mb-2">Quick presets</h3>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((f) =>
                f
                  ? {
                      ...f,
                      deliveryPincodeMode: "all",
                      deliveryAllowedPrefixes: "",
                      deliveryAllowedPincodes: "",
                      deliveryBlockedPincodes: "",
                      codPincodeMode: "allowlist",
                      codAllowedPrefixes: TN_PREFIXES.join(", "),
                      codAllowedPincodes: "",
                      codBlockedPincodes: "",
                    }
                  : f
              )
            }
          >
            TN-only COD (deliver all, COD 600–641)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((f) =>
                f
                  ? {
                      ...f,
                      deliveryPincodeMode: "allowlist",
                      deliveryAllowedPrefixes: TN_PREFIXES.join(", "),
                      deliveryAllowedPincodes: "",
                      deliveryBlockedPincodes: "",
                      codPincodeMode: "allowlist",
                      codAllowedPrefixes: TN_PREFIXES.join(", "),
                      codAllowedPincodes: "",
                      codBlockedPincodes: "",
                    }
                  : f
              )
            }
          >
            TN-only delivery + COD
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setForm((f) =>
                f
                  ? {
                      ...f,
                      deliveryPincodeMode: "all",
                      deliveryAllowedPrefixes: "",
                      deliveryAllowedPincodes: "",
                      deliveryBlockedPincodes: "",
                      codPincodeMode: "all",
                      codAllowedPrefixes: "",
                      codAllowedPincodes: "",
                      codBlockedPincodes: "",
                    }
                  : f
              )
            }
          >
            Everything open
          </Button>
        </div>
        <p className="text-[11px] text-surface-400 mt-2">Presets fill the form — remember to save.</p>
      </div>
    </div>
  );
}
