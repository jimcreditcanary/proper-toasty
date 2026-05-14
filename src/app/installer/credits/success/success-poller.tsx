"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Props {
  sessionId: string | null;
}

interface StatusResponse {
  ok: boolean;
  credited?: boolean;
  credits?: number;
  packCredits?: number;
  error?: string;
}

// Polls /api/installer/credits/status until the webhook flips the
// audit row to 'completed', then displays the new balance + a CTA
// back to the credits portal.
//
// Bounded: gives up after ~30s and tells the user to refresh
// manually. The webhook is reliable enough that this hardly ever
// matters, but we never want to leave them hanging on a spinner.

const POLL_INTERVAL_MS = 1500;
const MAX_POLLS = 20;

type State =
  | { kind: "polling"; attempts: number }
  | { kind: "credited"; balance: number; pack: number }
  | { kind: "timeout"; balance: number | null }
  | { kind: "error"; message: string };

export function SuccessPoller({ sessionId }: Props) {
  const [state, setState] = useState<State>({ kind: "polling", attempts: 0 });

  useEffect(() => {
    if (!sessionId) {
      // No session id in the URL — show the timeout view straight away
      // with a refresh CTA. This shouldn't happen in practice (Stripe
      // always passes the placeholder back) but it's a graceful fall.
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fallback
      setState({ kind: "timeout", balance: null });
      return;
    }

    let cancelled = false;
    let attempts = 0;

    async function poll() {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await fetch(
          `/api/installer/credits/status?session_id=${encodeURIComponent(sessionId!)}`,
        );
        const json = (await res.json()) as StatusResponse;
        if (cancelled) return;
        if (!json.ok) {
          setState({ kind: "error", message: json.error ?? "Status check failed" });
          return;
        }
        if (json.credited) {
          setState({
            kind: "credited",
            balance: json.credits ?? 0,
            pack: json.packCredits ?? 0,
          });
          return;
        }
        if (attempts >= MAX_POLLS) {
          setState({ kind: "timeout", balance: json.credits ?? null });
          return;
        }
        setState({ kind: "polling", attempts });
        setTimeout(poll, POLL_INTERVAL_MS);
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (state.kind === "polling") {
    return (
      <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Confirming with Stripe…
      </div>
    );
  }

  if (state.kind === "credited") {
    return (
      <>
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">
            +{state.pack} credits added
          </p>
          <p className="text-xs text-emerald-800 mt-1">
            New balance: <strong>{state.balance} credits</strong>
          </p>
        </div>
        <Link
          href="/installer/credits"
          className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors w-full"
        >
          Back to credits
        </Link>
      </>
    );
  }

  if (state.kind === "timeout") {
    return (
      <>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="font-semibold text-amber-900">
            Still waiting on Stripe
          </p>
          <p className="text-amber-900 text-xs mt-1">
            Payment&rsquo;s gone through but our system hasn&rsquo;t caught up.
            Refresh in a minute and your credits will be there.
          </p>
        </div>
        <Link
          href="/installer/credits"
          className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-full bg-navy hover:bg-navy/90 text-white font-semibold text-sm shadow-sm transition-colors w-full"
        >
          Refresh credits page
        </Link>
      </>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
      <p className="font-semibold text-red-900">
        Couldn&rsquo;t check status
      </p>
      <p className="text-red-900 text-xs mt-1">{state.message}</p>
      <Link
        href="/installer/credits"
        className="mt-3 inline-flex items-center justify-center h-10 px-4 rounded-full bg-red-600 hover:bg-red-700 text-white font-semibold text-xs"
      >
        Back to credits
      </Link>
    </div>
  );
}
