"use client";

import { useState } from "react";
import { Settings, Save, CheckCircle, AlertCircle, Clock } from "lucide-react";
import type { AdminSettingRow } from "@/app/dashboard/admin/settings/page";

const SETTING_LABELS: Record<string, string> = {
  cop_cost_per_check: "CoP Cost per Check",
  monthly_hosting_cost: "Monthly Hosting Cost",
  anthropic_cost_per_1k_tokens: "Anthropic Cost per 1K Tokens",
};

const SETTING_ORDER = [
  "cop_cost_per_check",
  "monthly_hosting_cost",
  "anthropic_cost_per_1k_tokens",
];

function formatTimestamp(ts: string | null): string {
  if (!ts) return "Never";
  const d = new Date(ts);
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  settings: AdminSettingRow[];
};

export function AdminSettingsForm({ settings }: Props) {
  // Build initial values map
  const initialValues: Record<string, string> = {};
  const timestamps: Record<string, string | null> = {};
  for (const s of settings) {
    initialValues[s.key] = String(s.value);
    timestamps[s.key] = s.updated_at;
  }

  // Ensure all expected keys exist with defaults
  for (const key of SETTING_ORDER) {
    if (!(key in initialValues)) {
      initialValues[key] = "0";
      timestamps[key] = null;
    }
  }

  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function handleChange(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setToast(null);

    const payload = SETTING_ORDER.map((key) => ({
      key,
      value: parseFloat(values[key]) || 0,
    }));

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save settings");
      }

      setToast({ type: "success", message: "Settings saved successfully" });
    } catch (err) {
      setToast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-2xl bg-navy-card border border-white/[0.06]">
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-2">
        <Settings className="size-5 text-brand-muted" />
        <div>
          <h2 className="font-semibold text-white">Cost Parameters</h2>
          <p className="text-sm text-brand-muted mt-0.5">
            These values are used to calculate platform profitability
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="p-6 space-y-6">
        {SETTING_ORDER.map((key) => (
          <div key={key} className="space-y-2">
            <label
              htmlFor={key}
              className="text-brand-muted-light text-sm block"
            >
              {SETTING_LABELS[key] ?? key}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted text-sm">
                &pound;
              </span>
              <input
                id={key}
                type="number"
                step="0.001"
                min="0"
                value={values[key]}
                onChange={(e) => handleChange(key, e.target.value)}
                className="w-full bg-white/[0.05] border border-white/10 focus:border-coral focus:outline-none text-white rounded-xl pl-8 pr-4 py-3 text-sm transition-colors"
              />
            </div>
            <div className="flex items-center gap-1 text-xs text-brand-muted">
              <Clock className="size-3" />
              <span>Last updated: {formatTimestamp(timestamps[key])}</span>
            </div>
          </div>
        ))}

        {/* Toast */}
        {toast && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm ${
              toast.type === "success"
                ? "bg-pass/10 border border-pass/20 text-pass"
                : "bg-fail/10 border border-fail/20 text-fail"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="size-4 shrink-0" />
            ) : (
              <AlertCircle className="size-4 shrink-0" />
            )}
            {toast.message}
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="h-12 px-6 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Save className="size-4" />
          {saving ? "Saving..." : "Save settings"}
        </button>
      </form>
    </div>
  );
}
