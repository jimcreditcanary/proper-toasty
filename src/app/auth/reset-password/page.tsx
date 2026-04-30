"use client";

// Reset-password landing.
//
// Reached via the link Supabase sent in the password-reset email. The
// link contains an auth code that's been exchanged for a session by
// the time the user lands here (Supabase's auth-helpers do this in the
// background). All this page has to do is collect a new password and
// call updateUser({password}). On success we send them to login with
// a flash message.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Confirm we landed on this page with a valid recovery session.
  // Supabase's auth helpers exchange the code in the URL fragment for
  // a session before any client-side code runs, so a quick getSession()
  // tells us whether the user actually came in through a reset link.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasSession(Boolean(data.session));
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    // Sign out so the next thing they do is a fresh sign-in with the
    // new password — proves it works end-to-end.
    await supabase.auth.signOut();
    setTimeout(() => {
      router.push("/auth/login?reset=ok");
    }, 1500);
  }

  if (hasSession === false) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
        <Link href="/" className="mb-10">
          <Logo size="md" variant="light" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            Reset link expired
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            This reset link is no longer valid. Reset links last for one
            hour — request a new one from the sign-in page.
          </p>
          <Link
            href="/auth/forgot-password"
            className="block mt-6 text-sm font-medium text-coral hover:text-coral-dark"
          >
            Request a new reset link
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
        <Link href="/" className="mb-10">
          <Logo size="md" variant="light" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="size-7 text-emerald-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Password updated
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Taking you to sign in…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
      <Link href="/" className="mb-10">
        <Logo size="md" variant="light" />
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-coral/5">
            <KeyRound className="size-6 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Set a new password
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            At least 8 characters. Choose something memorable.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-500">
              New password
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-slate-500">
              Confirm password
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
            disabled={loading || hasSession !== true}
          >
            {loading ? "Updating…" : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
