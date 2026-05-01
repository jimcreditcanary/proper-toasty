"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { AdminRequestActionResponse } from "@/lib/schemas/installer-signup-request";

interface Props {
  id: string;
  companyName: string;
  contactEmail: string;
}

// Right-rail action panel on the review page. Two buttons:
//
//   - Approve: optional admin note (becomes the "from us" line in
//     the approval email), then POST to /action with action=approve.
//     Server inserts the installer + sends the claim-link email.
//
//   - Reject: required admin note (used as the rejection reason in
//     the email), then POST with action=reject.
//
// We don't expose the override fields in the UI yet — admin can
// edit the request payload directly via the queue if a typo creeps
// in. Override capability is wired up server-side for future use.

export function ReviewActions({ id, companyName, contactEmail }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (mode === "reject" && note.trim().length === 0) {
      setError("Add a reason — it goes into the email back to the installer.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/installer-requests/${id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: mode,
          adminNotes: note.trim() || null,
        }),
      });
      const json = (await res.json()) as AdminRequestActionResponse;
      if (!json.ok) {
        setError(json.error ?? "Action failed");
        setSubmitting(false);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
        Decision
      </p>

      {mode === "idle" && (
        <div className="space-y-2">
          <button
            onClick={() => setMode("approve")}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
          >
            <CheckCircle2 className="w-4 h-4" />
            Approve {companyName}
          </button>
          <button
            onClick={() => setMode("reject")}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-full bg-white border border-slate-200 hover:border-red-300 text-slate-700 hover:text-red-700 font-semibold text-sm transition-colors"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
          <p className="text-[11px] text-slate-500 text-center mt-3 leading-relaxed">
            Approving creates an installer row + emails {contactEmail} a claim link.
          </p>
        </div>
      )}

      {mode !== "idle" && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-navy">
            {mode === "approve" ? "Approve" : "Reject"} this request?
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              {mode === "approve" ? "Note (optional)" : "Reason (required)"}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder={
                mode === "approve"
                  ? "Optional — appears as a 'from us' note in the approval email."
                  : "What was missing? Becomes the reason in the rejection email."
              }
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 resize-y"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 flex items-start gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                setMode("idle");
                setNote("");
                setError(null);
              }}
              disabled={submitting}
              className="flex-1 h-10 rounded-full bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-semibold text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={submitting}
              className={`flex-1 h-10 rounded-full text-white font-semibold text-sm transition-colors ${
                mode === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-red-600 hover:bg-red-700"
              } disabled:opacity-60`}
            >
              {submitting
                ? "…"
                : mode === "approve"
                  ? "Confirm approve"
                  : "Confirm reject"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
