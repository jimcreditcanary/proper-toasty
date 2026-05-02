"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  installerId: number;
  installerName: string;
  signedInEmail: string;
}

interface ClaimResponse {
  ok: boolean;
  installerId?: number;
  companyName?: string;
  error?: string;
  reason?: "race-lost" | "installer-missing" | "unauthenticated" | "internal";
}

// One-click claim button shown on /installer-signup when the user
// is already signed in. Bypasses the F2 signup form entirely —
// just binds installers.user_id to the calling auth user.

export function ClaimAsSelfButton({
  installerId,
  installerName,
  signedInEmail,
}: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function claim() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/installer-signup/claim-as-self", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ installerId }),
      });
      const json = (await res.json()) as ClaimResponse;
      if (!json.ok) {
        if (json.reason === "race-lost") {
          router.push("/installer-signup?error=race_lost");
          return;
        }
        setError(json.error ?? "Couldn't claim this profile");
        setSubmitting(false);
        return;
      }
      // Hard-redirect to /installer so the role flip + middleware
      // session refresh both pick up cleanly.
      window.location.href = "/installer";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700 leading-relaxed">
        You&rsquo;re signed in as{" "}
        <strong className="text-navy">{signedInEmail}</strong>. Claim
        this profile and we&rsquo;ll bind it straight to your existing
        account — no extra password.
      </div>

      <button
        type="button"
        disabled={submitting}
        onClick={claim}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Claiming…
          </>
        ) : (
          <>
            <ShieldCheck className="w-4 h-4" />
            Claim {installerName}
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 text-center">{error}</p>
      )}

      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Wrong account?{" "}
        <a
          href="/auth/login"
          className="text-coral hover:text-coral-dark font-medium"
        >
          Sign out and sign in with the right one
        </a>
        .
      </p>
    </div>
  );
}
