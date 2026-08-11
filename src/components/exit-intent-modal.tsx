"use client";

// Exit-intent modal — catches homeowners about to bounce without
// engaging with the hero wizard.
//
// Trigger logic:
//   DESKTOP (viewport ≥ 1024px):
//     - fires on mouseleave through the TOP edge of the viewport
//       (the classic exit-intent pattern — user aiming at the
//       address bar or the browser's back button)
//   MOBILE (viewport < 1024px):
//     - fires after 25s of visible-tab time with no interaction
//       (proxy for "reading but not engaging"). Desktop mouseleave
//       isn't reliable on touch devices.
//
// Guards (all must pass for the modal to fire):
//   1. User hasn't submitted the hero wizard yet
//      (sessionStorage.hero_prefill_v1 is missing).
//   2. This browser hasn't seen the modal in the last 30 days
//      (localStorage flag).
//   3. User isn't inside the /check wizard already (window path
//      check — modal is homepage-only for v1).
//   4. Modal isn't already open.
//
// Deliberately NOT keyboard-hostile: Esc closes it, backdrop click
// closes it, and the close (×) is always visible.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Mail, MapPin, X } from "lucide-react";
import { track } from "@vercel/analytics/react";

// localStorage flag → suppress re-fire for 30 days
const SEEN_KEY = "exit_intent_v1_seen_at";
const SUPPRESS_MS = 30 * 24 * 60 * 60 * 1000;

// Mobile-only fallback: seconds of visible-tab time before firing
const MOBILE_IDLE_MS = 25_000;

// Guard against the mouse leaving the viewport during a normal
// interaction (drag from a card up to a tab, etc). Only fire once
// per page life, not once per mouseleave.
function looksLikePostcode(s: string): boolean {
  const trimmed = s.trim();
  if (trimmed.length < 5 || trimmed.length > 8) return false;
  return /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/.test(trimmed);
}

type Phase = "idle" | "submitting" | "done" | "error";

export function ExitIntentModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Fired-once ref — even if the trigger conditions match twice, the
  // modal only opens on the first match per page load.
  const firedRef = useRef(false);

  // Mobile idle timer handle — cleared on any user interaction so a
  // scrolling / typing user doesn't get interrupted.
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldOpen = useCallback((): boolean => {
    if (firedRef.current) return false;
    if (typeof window === "undefined") return false;
    // Homepage only for v1
    if (window.location.pathname !== "/") return false;
    // If the hero wizard already fired, the user has engaged — no need
    // for the abandonment nudge.
    try {
      if (sessionStorage.getItem("hero_prefill_v1")) return false;
    } catch {
      // storage disabled — proceed
    }
    // 30-day suppression
    try {
      const seenAtRaw = localStorage.getItem(SEEN_KEY);
      if (seenAtRaw) {
        const seenAt = Number(seenAtRaw);
        if (!Number.isNaN(seenAt) && Date.now() - seenAt < SUPPRESS_MS) {
          return false;
        }
      }
    } catch {
      // storage disabled — proceed
    }
    return true;
  }, []);

  const openModal = useCallback(
    (source: "mouseleave" | "mobile_idle") => {
      if (!shouldOpen()) return;
      firedRef.current = true;
      setOpen(true);
      try {
        localStorage.setItem(SEEN_KEY, String(Date.now()));
      } catch {
        // ignore
      }
      track("exit_intent_shown", { source });
    },
    [shouldOpen],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;

    if (isDesktop) {
      // Fires when the mouse pointer LEAVES through the top edge of
      // the viewport. clientY < 0 catches the case where the cursor
      // has already crossed above the fold before the mouseleave
      // event fires.
      const onMouseLeave = (e: MouseEvent) => {
        if (e.clientY > 0) return;
        openModal("mouseleave");
      };
      document.addEventListener("mouseleave", onMouseLeave);
      return () => document.removeEventListener("mouseleave", onMouseLeave);
    }

    // Mobile fallback: idle-time trigger with interaction reset.
    const scheduleIdleTrigger = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        openModal("mobile_idle");
      }, MOBILE_IDLE_MS);
    };
    const resetIdle = () => scheduleIdleTrigger();

    scheduleIdleTrigger();
    document.addEventListener("scroll", resetIdle, { passive: true });
    document.addEventListener("touchstart", resetIdle, { passive: true });
    document.addEventListener("keydown", resetIdle);
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      document.removeEventListener("scroll", resetIdle);
      document.removeEventListener("touchstart", resetIdle);
      document.removeEventListener("keydown", resetIdle);
    };
  }, [openModal]);

  // Body scroll lock while open — standard modal ergonomics.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const submit = useCallback(async () => {
    setError(null);
    const trimmedEmail = email.trim();
    const trimmedPostcode = postcode.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Please enter a valid email.");
      return;
    }
    if (!looksLikePostcode(trimmedPostcode)) {
      setError("Please enter a full UK postcode.");
      return;
    }
    setPhase("submitting");
    try {
      const res = await fetch("/api/leads/exit-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          postcode: trimmedPostcode.toUpperCase(),
          consentMarketing: false,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Save failed (${res.status})`);
      }
      setPhase("done");
      track("exit_intent_captured", {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save that.");
      setPhase("error");
    }
  }, [email, postcode]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="exit-intent-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        // Backdrop click closes; card click doesn't propagate
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-2xl ring-1 ring-coral/25 p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--muted-brand)] hover:bg-cream-deep hover:text-navy transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {phase === "done" ? (
          <div className="text-center py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
              Sent — check your inbox
            </p>
            <h2 className="text-2xl font-bold text-navy mb-3" id="exit-intent-title">
              Your resume link is on its way
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Open the link in the email whenever you have a minute — the wizard
              will pick up from where we left off with your postcode already in.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold text-sm transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
              Hold on
            </p>
            <h2
              className="text-2xl sm:text-3xl font-bold text-navy leading-tight mb-2"
              id="exit-intent-title"
            >
              Don&rsquo;t leave without your savings estimate.
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed mb-5">
              Drop your email and postcode — we&rsquo;ll send you a link to pick
              up where you left off. Takes a minute when you&rsquo;re ready. No
              account, no follow-up spam.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (phase !== "submitting") void submit();
              }}
              className="space-y-3"
            >
              <div className="relative">
                <Mail
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coral/60 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="you@yourhome.co.uk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-full border-2 border-[var(--border)] bg-white text-base text-navy placeholder:text-[var(--muted-brand)]/70 focus:outline-none focus:ring-4 focus:ring-coral/25 focus:border-coral transition-shadow"
                  aria-label="Email"
                  autoFocus
                />
              </div>
              <div className="relative">
                <MapPin
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-coral/60 pointer-events-none"
                  aria-hidden
                />
                <input
                  type="text"
                  inputMode="text"
                  autoComplete="postal-code"
                  placeholder="e.g. BS3 4AA"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  className="w-full h-12 pl-11 pr-4 rounded-full border-2 border-[var(--border)] bg-white text-base text-navy placeholder:text-[var(--muted-brand)]/70 focus:outline-none focus:ring-4 focus:ring-coral/25 focus:border-coral transition-shadow"
                  aria-label="Postcode"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-rose-600">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={phase === "submitting"}
                className="w-full inline-flex items-center justify-center gap-2 h-12 px-5 rounded-full bg-coral hover:bg-coral-dark disabled:opacity-70 disabled:cursor-not-allowed text-cream font-semibold text-base shadow-md transition-colors"
              >
                {phase === "submitting" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    Sending…
                  </>
                ) : (
                  <>
                    Send me the link
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-[var(--muted-brand)]">
                We only use these to send the resume link. No follow-ups unless
                you finish the check and ask for one.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
