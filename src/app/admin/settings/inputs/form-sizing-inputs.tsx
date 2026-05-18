"use client";

// Editable sizing/savings inputs grid for /admin/settings/inputs.
// Sister component to CostRatesForm — same dirty-tracking + per-key
// upsert behaviour, but values are heterogeneous (£, p/kWh, 0–1 rate,
// kWh/m², W/m²) so the input column carries a per-field unit suffix
// and per-field validation rather than the cost-rates "all pence"
// assumption.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  isValidSizingValue,
  type SizingInputs,
} from "@/lib/admin/sizing-inputs";

interface Props {
  initialInputs: SizingInputs;
  defaults: SizingInputs;
  labels: Record<keyof SizingInputs, string>;
  hints: Record<keyof SizingInputs, string>;
  units: Record<keyof SizingInputs, string>;
  order: (keyof SizingInputs)[];
}

export function SizingInputsForm({
  initialInputs,
  defaults,
  labels,
  hints,
  units,
  order,
}: Props) {
  const router = useRouter();
  // String state for the same reason CostRatesForm uses strings:
  // numeric state wipes mid-typing on values like "0." or "-0.5".
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.map((k) => [k, String(initialInputs[k] ?? 0)])),
  );
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const k of order) {
      const current = Number.parseFloat(values[k] ?? "0");
      const initial = initialInputs[k] ?? 0;
      out[k] =
        Number.isFinite(current) &&
        Math.abs(current - initial) > Number.EPSILON;
    }
    return out;
  }, [values, initialInputs, order]);
  const anyDirty = Object.values(dirty).some(Boolean);

  // Highlight fields whose current input value is invalid per the
  // shared rule (e.g. self-consumption > 1). Stops Save from POSTing
  // a body the API would reject and gives the user immediate feedback.
  const invalid = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const k of order) {
      const v = Number.parseFloat(values[k] ?? "");
      if (!Number.isFinite(v)) {
        out[k] = true;
      } else {
        out[k] = !isValidSizingValue(k, v);
      }
    }
    return out;
  }, [values, order]);
  const anyInvalid = Object.values(invalid).some(Boolean);

  function setField(key: string, value: string) {
    setValues((s) => ({ ...s, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  function resetField(key: keyof SizingInputs) {
    setField(key, String(defaults[key] ?? 0));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const dirtyEntries = order
        .filter((k) => dirty[k] && !invalid[k])
        .map((k) => {
          const v = Number.parseFloat(values[k] ?? "0");
          return [k, v] as const;
        });

      if (dirtyEntries.length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/sizing-inputs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: Object.fromEntries(dirtyEntries),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Save failed (${res.status})`);
        return;
      }
      setSavedAt(Date.now());
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-4 py-3">Input</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">
                What it drives
              </th>
              <th className="text-right px-4 py-3 w-44">Value</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {order.map((key) => {
              const isDirty = dirty[key];
              const isInvalid = invalid[key];
              const isOverridden =
                Math.abs((initialInputs[key] ?? 0) - (defaults[key] ?? 0)) >
                Number.EPSILON;
              const inputCls = isInvalid
                ? "border-rose-300 bg-rose-50 focus:border-rose-500"
                : isDirty
                  ? "border-amber-300 bg-amber-50 focus:border-amber-500"
                  : "border-slate-200 bg-white focus:border-coral";
              return (
                <tr
                  key={key}
                  className={`border-t border-slate-100 ${
                    isInvalid
                      ? "bg-rose-50/40"
                      : isDirty
                        ? "bg-amber-50/40"
                        : ""
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <p className="font-semibold text-navy text-sm">
                      {labels[key]}
                    </p>
                    {isOverridden && !isDirty && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-coral mt-0.5">
                        Overridden
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top hidden md:table-cell">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {hints[key]}
                    </p>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-2 justify-end">
                      <input
                        type="number"
                        step="any"
                        value={values[key]}
                        onChange={(e) => setField(key, e.target.value)}
                        aria-invalid={isInvalid}
                        className={`w-24 text-right h-9 px-2 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-coral/30 ${inputCls}`}
                      />
                      <span className="text-xs text-slate-500 whitespace-nowrap min-w-[4rem] text-left">
                        {units[key]}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      Default: {defaults[key]} {units[key]}
                    </p>
                  </td>
                  <td className="px-2 py-3 align-top">
                    <button
                      type="button"
                      onClick={() => resetField(key)}
                      disabled={
                        Math.abs(
                          Number.parseFloat(values[key] ?? "0") -
                            (defaults[key] ?? 0),
                        ) < Number.EPSILON
                      }
                      title="Reset to default"
                      className="inline-flex items-center justify-center w-8 h-8 rounded-md text-slate-400 hover:bg-slate-100 hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {error && (
        <p className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          {anyInvalid
            ? "Some values are out of range — fix the highlighted rows."
            : anyDirty
              ? `${Object.values(dirty).filter(Boolean).length} unsaved change${
                  Object.values(dirty).filter(Boolean).length === 1 ? "" : "s"
                }`
              : savedAt
                ? "Saved — new values will be used on the next /check report."
                : "All values match the saved overrides."}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!anyDirty || anyInvalid || saving || pending}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
        >
          {saving || pending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save changes
            </>
          )}
        </button>
      </div>
    </div>
  );
}
