"use client";

// Editable cost-rate grid for /admin/settings/cost-rates.
//
// One row per rate field with a numeric input + label + hint + a
// "(default 4p)" reset hint when the current value differs from the
// default. Dirty fields are highlighted; only dirty fields are sent
// on save (the API upserts per-key so untouched rates stay put).

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw, Save } from "lucide-react";
import type { CostRates } from "@/lib/admin/cost-rates";

interface Props {
  initialRates: CostRates;
  defaults: CostRates;
  labels: Record<keyof CostRates, string>;
  hints: Record<keyof CostRates, string>;
  order: (keyof CostRates)[];
}

export function CostRatesForm({
  initialRates,
  defaults,
  labels,
  hints,
  order,
}: Props) {
  const router = useRouter();
  // Form state holds string inputs because <input type="number"> with
  // a numeric state wipes the value on backspace through "-0.05".
  // Numbers only happen at save time.
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(order.map((k) => [k, String(initialRates[k] ?? 0)])),
  );
  const [pending, startTransition] = useTransition();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Compute the diff between the current input values and the
  // initial values that came back from the server, so we can:
  //   1. Highlight dirty rows
  //   2. Send only dirty fields on save (untouched rows skip the
  //      upsert entirely)
  //   3. Disable the Save button when nothing's changed
  const dirty = useMemo(() => {
    const out: Record<string, boolean> = {};
    for (const k of order) {
      const current = Number.parseFloat(values[k] ?? "0");
      const initial = initialRates[k] ?? 0;
      out[k] =
        Number.isFinite(current) &&
        Math.abs(current - initial) > Number.EPSILON;
    }
    return out;
  }, [values, initialRates, order]);
  const anyDirty = Object.values(dirty).some(Boolean);

  function setField(key: string, value: string) {
    setValues((s) => ({ ...s, [key]: value }));
    setSavedAt(null);
    setError(null);
  }

  function resetField(key: keyof CostRates) {
    setField(key, String(defaults[key] ?? 0));
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const dirtyEntries = order
        .filter((k) => dirty[k])
        .map((k) => {
          const v = Number.parseFloat(values[k] ?? "0");
          return [k, Number.isFinite(v) && v >= 0 ? v : null] as const;
        })
        .filter(([, v]) => v != null);

      if (dirtyEntries.length === 0) {
        setSaving(false);
        return;
      }

      const res = await fetch("/api/admin/cost-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rates: Object.fromEntries(dirtyEntries),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error ?? `Save failed (${res.status})`);
        return;
      }
      setSavedAt(Date.now());
      // Refresh the server component to re-load the saved values
      // back as the new "initial" baseline.
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
              <th className="text-left px-4 py-3">Cost line</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">
                What it drives
              </th>
              <th className="text-right px-4 py-3 w-40">Rate (pence)</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {order.map((key) => {
              const isDirty = dirty[key];
              const isOverridden =
                Math.abs((initialRates[key] ?? 0) - (defaults[key] ?? 0)) >
                Number.EPSILON;
              return (
                <tr
                  key={key}
                  className={`border-t border-slate-100 ${
                    isDirty ? "bg-amber-50/40" : ""
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
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={values[key]}
                      onChange={(e) => setField(key, e.target.value)}
                      className={`w-full text-right h-9 px-2 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-coral/30 ${
                        isDirty
                          ? "border-amber-300 bg-amber-50 focus:border-amber-500"
                          : "border-slate-200 bg-white focus:border-coral"
                      }`}
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-right">
                      Default: {defaults[key]}p
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
          {anyDirty
            ? `${Object.values(dirty).filter(Boolean).length} unsaved change${
                Object.values(dirty).filter(Boolean).length === 1 ? "" : "s"
              }`
            : savedAt
              ? "Saved — changes will appear on the next P&L render"
              : "All values match the saved overrides."}
        </p>
        <button
          type="button"
          onClick={() => void save()}
          disabled={!anyDirty || saving || pending}
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
