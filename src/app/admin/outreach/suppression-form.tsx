"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

// Quick add-to-suppression form for the admin dashboard. Used when
// someone emails Jim directly saying "stop emailing me" outside the
// inbound webhook path (forwarded from a different inbox, replied
// via WhatsApp, etc.).

export function SuppressionForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState<"manual" | "complained" | "spam_trap">(
    "manual",
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/admin/outreach/suppress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, reason }),
      });
      const json = (await res.json()) as
        | { ok: true; email: string }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Failed");
      }
      setSuccess(`Suppressed ${json.email}`);
      setEmail("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-wrap items-end gap-3 text-sm"
    >
      <div className="flex-1 min-w-[200px]">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1 block">
          Email
        </label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="them@example.com"
          className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1 block">
          Reason
        </label>
        <select
          value={reason}
          onChange={(e) =>
            setReason(e.target.value as "manual" | "complained" | "spam_trap")
          }
          className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
        >
          <option value="manual">manual</option>
          <option value="complained">complained</option>
          <option value="spam_trap">spam_trap</option>
        </select>
      </div>
      <button
        type="submit"
        disabled={submitting || !email}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white text-xs font-semibold transition-colors"
      >
        {submitting ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Ban className="w-3.5 h-3.5" />
        )}
        Add to suppression
      </button>
      {success && (
        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5" /> {success}
        </span>
      )}
      {error && (
        <span className="inline-flex items-center gap-1 text-xs text-rose-700">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </span>
      )}
    </form>
  );
}
