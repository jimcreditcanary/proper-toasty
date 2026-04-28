"use client";

// ShareReportModal — opens from the report footer's "Share this report"
// button. Two tabs: email myself / send to someone else.

import { useEffect, useId, useRef, useState } from "react";
import { CheckCircle2, Loader2, Mail, Send, X } from "lucide-react";
import type {
  ShareReportRequest,
  ShareReportResponse,
} from "@/lib/schemas/report-share";

interface Props {
  defaults: {
    homeownerEmail: string | null;
    homeownerName: string | null;
    homeownerLeadId: string | null;
    propertyAddress: string | null;
    propertyPostcode: string | null;
    propertyUprn: string | null;
    propertyLatitude: number | null;
    propertyLongitude: number | null;
    analysisSnapshot: unknown;
  };
  onClose: () => void;
}

type Mode = "self" | "forward";

export function ShareReportModal({ defaults, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("self");
  const [recipientEmail, setRecipientEmail] = useState(
    defaults.homeownerEmail ?? "",
  );
  const [forwardedByName, setForwardedByName] = useState(
    defaults.homeownerName ?? "",
  );
  const [personalNote, setPersonalNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const errorId = useId();

  // Focus trap + return-on-close (same pattern as BookingModal).
  useEffect(() => {
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
    return () => {
      const t = triggerRef.current;
      if (t && typeof t.focus === "function") setTimeout(() => t.focus(), 0);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!recipientEmail.trim()) {
      setError("Where should we send the report?");
      return;
    }

    const body: ShareReportRequest = {
      kind: mode,
      recipientEmail: recipientEmail.trim(),
      forwardedByName: forwardedByName.trim() || null,
      personalNote: personalNote.trim() || null,
      homeownerLeadId: defaults.homeownerLeadId,
      propertyAddress: defaults.propertyAddress,
      propertyPostcode: defaults.propertyPostcode,
      propertyUprn: defaults.propertyUprn,
      propertyLatitude: defaults.propertyLatitude,
      propertyLongitude: defaults.propertyLongitude,
      analysisSnapshot: defaults.analysisSnapshot,
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/reports/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as ShareReportResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Couldn't send (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="share-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-navy">
              {mode === "self" ? "Sent to your inbox" : "Off it goes"}
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              {mode === "self"
                ? `We've emailed your report to ${recipientEmail}. The link works for 30 days.`
                : `We've sent your report to ${recipientEmail}. They'll be able to open it for the next 30 days.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm"
            >
              Back to the report
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 sm:p-6 border-b border-slate-100">
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">
                Share your report
              </p>
              <h2
                id="share-title"
                className="mt-1 text-xl font-bold text-navy leading-tight"
              >
                Want to keep this for later?
              </h2>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                We&rsquo;ll email a link that works for 30 days. Open it again
                any time, or send it to your partner / family for a second
                opinion.
              </p>
            </div>

            {/* Mode toggle */}
            <div
              className="px-5 sm:px-6 pt-5"
              role="tablist"
              aria-label="Who to send to"
            >
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {(
                  [
                    { v: "self" as const, label: "Email myself", icon: <Mail className="w-3.5 h-3.5" /> },
                    { v: "forward" as const, label: "Send to someone else", icon: <Send className="w-3.5 h-3.5" /> },
                  ]
                ).map((opt) => {
                  const active = mode === opt.v;
                  return (
                    <button
                      key={opt.v}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setMode(opt.v);
                        // Pre-fill email with homeowner's address when they
                        // switch to "self", clear when they switch to "forward".
                        setRecipientEmail(
                          opt.v === "self" ? defaults.homeownerEmail ?? "" : "",
                        );
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 h-9 text-sm font-semibold rounded-md transition-colors ${
                        active
                          ? "bg-white text-navy shadow-sm"
                          : "text-slate-600 hover:text-navy"
                      }`}
                    >
                      {opt.icon}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form
              onSubmit={submit}
              className="p-5 sm:p-6 space-y-4"
              aria-describedby={error ? errorId : undefined}
            >
              <Field
                label={
                  mode === "self"
                    ? "Send my report to"
                    : "Send their report to"
                }
                required
              >
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder={
                    mode === "self" ? "you@example.com" : "partner@example.com"
                  }
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
                  autoComplete="email"
                />
              </Field>

              {mode === "forward" && (
                <>
                  <Field label="Your name (so they know it's from you)">
                    <input
                      type="text"
                      value={forwardedByName}
                      onChange={(e) => setForwardedByName(e.target.value)}
                      placeholder="Sarah"
                      className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
                      autoComplete="given-name"
                    />
                  </Field>

                  <Field label="A short note (optional)">
                    <textarea
                      value={personalNote}
                      onChange={(e) => setPersonalNote(e.target.value)}
                      placeholder="e.g. Thought you'd be interested — looks like the heat pump is a strong fit for our place."
                      rows={3}
                      maxLength={500}
                      className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral resize-y"
                    />
                  </Field>
                </>
              )}

              {error && (
                <p
                  id={errorId}
                  role="alert"
                  className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>{mode === "self" ? "Email it to me" : "Send the report"}</>
                )}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-navy mb-1.5">
        {label}
        {required && (
          <span className="text-coral ml-0.5" aria-hidden="true">
            *
          </span>
        )}
      </span>
      {children}
    </label>
  );
}
