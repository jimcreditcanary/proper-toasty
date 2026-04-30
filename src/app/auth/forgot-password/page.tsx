"use client";

// Forgot-password landing.
//
// Asks for an email, sends a Supabase-managed reset link to it. The
// link drops the user on /auth/reset-password where they choose a new
// one. We always show the "check your email" success state regardless
// of whether the email exists in our DB — gives no signal to anyone
// probing for valid accounts.

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, MailCheck, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirectTo = `${window.location.origin}/auth/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
        <Link href="/" className="mb-10">
          <Logo size="md" variant="light" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-coral/5">
            <MailCheck className="size-7 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Check your email
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            If an account exists for{" "}
            <span className="font-medium text-slate-900">{email}</span> we&apos;ve
            sent a password-reset link to it.
          </p>
          <p className="text-xs text-slate-400 mt-3">
            Can&apos;t see it? Check your spam folder.
          </p>
          <Link
            href="/auth/login"
            className="block mt-6 text-sm font-medium text-coral hover:text-coral-dark"
          >
            Back to sign in
          </Link>
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
            <ShieldCheck className="size-6 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Forgot your password?
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Pop your email in below and we&apos;ll send a reset link.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-500">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
            disabled={loading}
          >
            {loading ? "Sending…" : "Send reset link"}
          </Button>
        </form>
        <Link
          href="/auth/login"
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="size-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
