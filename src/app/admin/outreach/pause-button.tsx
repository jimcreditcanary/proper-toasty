"use client";

// Small client island for the campaign control button. Fires a
// POST to /api/admin/outreach/pause then refreshes the page so
// the server-rendered status badge updates.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pause, Play, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  campaignId: string;
  status: "draft" | "active" | "paused" | "complete";
}

export function CampaignControls({ campaignId, status }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fire(action: "pause" | "resume" | "complete") {
    if (!confirm(`Are you sure you want to ${action} this campaign?`)) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/outreach/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, action }),
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Update failed");
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "active" && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => fire("pause")}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Pause className="w-3.5 h-3.5" />
          )}
          Pause sends
        </button>
      )}
      {(status === "paused" || status === "draft") && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => fire("resume")}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-60 transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
          {status === "draft" ? "Activate" : "Resume"}
        </button>
      )}
      {status === "active" && (
        <button
          type="button"
          disabled={submitting}
          onClick={() => fire("complete")}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium disabled:opacity-60 transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          Mark complete
        </button>
      )}
      {error && (
        <span className="text-xs text-rose-700">{error}</span>
      )}
    </div>
  );
}
