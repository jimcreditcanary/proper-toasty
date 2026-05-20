"use client";

// Inline editor for the campaign's daily_send_limit. Sits in the
// campaign header on /admin/outreach so the conservative warmup ramp
// (5 → 10 → 20 → 30 → 30 → 50) can be stepped without dropping into
// SQL. POSTs to /api/admin/outreach/daily-limit then refreshes the
// server-rendered header.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil } from "lucide-react";

interface Props {
  campaignId: string;
  current: number;
}

export function DailyLimitEditor({ campaignId, current }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(current));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 500) {
      setError("1–500");
      return;
    }
    if (n === current) {
      setEditing(false);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/daily-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, dailyLimit: n }),
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Update failed");
      }
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setValue(String(current));
          setError(null);
          setEditing(true);
        }}
        className="inline-flex items-center gap-1 hover:text-navy transition-colors"
        title="Edit daily send limit"
      >
        daily limit {current}
        <Pencil className="w-3 h-3 opacity-60" />
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      daily limit
      <input
        type="number"
        min={1}
        max={500}
        value={value}
        autoFocus
        disabled={submitting}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") void save();
          if (e.key === "Escape") setEditing(false);
        }}
        className="w-16 h-6 px-1.5 rounded border border-slate-300 text-[11px] tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
      <button
        type="button"
        disabled={submitting}
        onClick={() => void save()}
        className="inline-flex items-center justify-center h-6 w-6 rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60 transition-colors"
        title="Save"
      >
        {submitting ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Check className="w-3 h-3" />
        )}
      </button>
      {error && <span className="text-rose-700">{error}</span>}
    </span>
  );
}
