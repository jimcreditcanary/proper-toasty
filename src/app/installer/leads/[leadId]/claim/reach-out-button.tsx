"use client";

// Client island for the "Reach out to homeowner" CTA on the lead
// claim page. The button POSTs to /api/installers/no-slots-lead/
// contacted with the chosen contact method, the server stamps
// installer_lead_outreach.contacted_at, and the page re-renders
// (router.refresh) to show the green-tick state.
//
// Two-step UX: the primary button is "Reach out" (no decision
// required). Clicking it expands an inline picker for the contact
// method — email or phone — defaulting to email. Picking the method
// is what actually submits.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Phone, Send, Loader2 } from "lucide-react";

interface Props {
  outreachId: string;
  installerId: number;
  leadId: string;
}

type Method = "email" | "phone";

export function ReachOutButton({ outreachId, installerId, leadId }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function submit(method: Method) {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/installers/no-slots-lead/contacted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outreachId, installerId, leadId, method }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Couldn't save (${res.status})`);
      }
      startTransition(() => {
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong — try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!expanded) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-700 leading-relaxed">
          Email or call the homeowner directly to discuss timings + a
          site visit. When you&rsquo;ve made contact, log it here so
          we know the lead&rsquo;s been picked up.
        </p>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Send className="w-4 h-4" />
          Reach out to homeowner
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700 leading-relaxed">
        How did you reach out?
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit("email")}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 text-white font-semibold text-sm shadow-sm transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Mail className="w-4 h-4" />
          )}
          Logged as email
        </button>
        <button
          type="button"
          disabled={submitting}
          onClick={() => submit("phone")}
          className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-coral hover:bg-coral-pale disabled:bg-slate-100 text-coral-dark font-semibold text-sm transition-colors"
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Phone className="w-4 h-4" />
          )}
          Logged as phone call
        </button>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          disabled={submitting}
          className="text-xs text-slate-500 hover:text-slate-700 underline ml-2"
        >
          Cancel
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}
    </div>
  );
}
