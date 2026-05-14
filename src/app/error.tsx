"use client";

// Global error boundary. Catches unexpected runtime errors thrown
// during render. Sentry reports separately via the Sentry SDK
// (Sentry.init in the Sentry setup wires this up automatically).
//
// CRITICAL: Next.js requires error.tsx to be a Client Component
// (the "use client" above) — error boundaries are runtime-only.

import { useEffect } from "react";
import Link from "next/link";
import { Home, RefreshCw } from "lucide-react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Sentry's Next.js integration auto-captures errors that reach
    // this boundary, so we just log to console for dev. Production
    // captures happen via the Sentry SDK's React error-boundary
    // integration.
    if (process.env.NODE_ENV !== "production") {
      console.error("[error.tsx]", error);
    }
  }, [error]);

  return (
    <div className="bg-cream min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border border-[var(--border)] p-6 sm:p-8 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-coral">
          Error
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-navy">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          We hit an unexpected error while rendering this page. Our
          team has been notified. Try the button below to retry, or
          head back to the homepage.
        </p>
        {error.digest && (
          <p className="mt-3 text-[10px] text-slate-400 font-mono">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm h-10 px-5 transition-colors"
          >
            <RefreshCw className="w-4 h-4" aria-hidden />
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white border border-[var(--border)] hover:border-coral hover:text-coral text-slate-700 font-medium text-sm h-10 px-5 transition-colors"
          >
            <Home className="w-4 h-4" aria-hidden />
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
