"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

// The actual signup form. Stashes the chosen installer ID in
// user_metadata.claim_installer_id — the auth callback (after email
// confirmation) reads it and CAS-binds installers.user_id.
//
// We don't fire any DB writes from here directly. That's deliberate:
//
//   - Until the email is confirmed we don't know the user genuinely
//     owns the email address. Binding before that would let anyone
//     squat on any installer profile by typing in the right email.
//
//   - The post-confirm bind lives in src/app/auth/callback so it
//     happens once + reliably regardless of whether the user
//     confirms by clicking the email link or via a future "resend
//     confirmation" flow.

interface Props {
  installerId: number;
  installerName: string;
  defaultEmail: string;
}

interface ExistingAccountState {
  email: string;
}

export function ClaimSignupForm({
  installerId,
  installerName,
  defaultEmail,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Detect "this email is already on the system" — Supabase doesn't
  // surface a real error for this (anti-enumeration default). When we
  // spot it, switch the whole form into a "sign in instead" state so
  // the user doesn't sit waiting on an email that's never coming.
  const [existing, setExisting] = useState<ExistingAccountState | null>(null);

  function loginRedirectUrl(): string {
    // After sign-in, drop them back here so the page re-renders into
    // the one-click claim-as-self button.
    return `/auth/login?redirect=${encodeURIComponent(`/installer-signup?id=${installerId}`)}`;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!accepted) {
      setError("Please accept the terms before signing up.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Stashed in raw_user_meta_data — visible to the auth callback
        // as `user.user_metadata.claim_installer_id`.
        data: {
          claim_installer_id: installerId,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Supabase returns ok with `user.identities = []` when an account
    // already exists for that email — a deliberate anti-enumeration
    // behaviour. Detect it and surface a clear "sign in instead" CTA
    // rather than send the user off to the dead-end pending page.
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setExisting({ email });
      setLoading(false);
      return;
    }

    // Hand off to the "check your email" page. We pass the email
    // through so it can render a "we sent a link to <email>" line.
    const params = new URLSearchParams({ email, installer: installerName });
    router.push(`/installer-signup/pending?${params.toString()}`);
  }

  if (existing) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
          <p className="font-semibold text-amber-900">
            You&rsquo;ve already got a Propertoasty account
          </p>
          <p className="text-amber-900 mt-1">
            <strong>{existing.email}</strong> is already registered.
            Sign in and we&rsquo;ll bind {installerName} straight to
            your existing account — no second password, no extra
            email.
          </p>
        </div>
        <Link
          href={loginRedirectUrl()}
          className="w-full inline-flex items-center justify-center h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Sign in to claim {installerName}
        </Link>
        <button
          type="button"
          onClick={() => {
            setExisting(null);
            setEmail("");
          }}
          className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
        >
          Or use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label
          htmlFor="claim-email"
          className="text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          Email
        </label>
        <input
          id="claim-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
        />
        <p className="text-[11px] text-slate-500 leading-relaxed">
          This is where lead notifications + the calendar invite will
          land. Use the address you check most often.
        </p>
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="claim-password"
          className="text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          Password
        </label>
        <input
          id="claim-password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
        />
        <p className="text-[11px] text-slate-500">At least 8 characters.</p>
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600 leading-relaxed">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral"
        />
        <span>
          I&rsquo;m authorised to act on behalf of{" "}
          <strong className="text-navy">{installerName}</strong>, and I
          agree to the{" "}
          <Link
            href="/terms"
            className="text-coral hover:text-coral-dark underline"
            target="_blank"
          >
            Propertoasty terms
          </Link>
          .
        </span>
      </label>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !accepted}
        className="w-full h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
      >
        {loading ? "Creating account…" : "Create account & claim"}
      </button>
    </form>
  );
}
