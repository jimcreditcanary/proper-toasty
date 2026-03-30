"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ShieldCheck } from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-navy">
        <Link href="/" className="mb-10">
          <Logo size="md" variant="dark" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl bg-navy-card border border-white/[0.06] p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-coral/10">
            <ShieldCheck className="size-7 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-white">Check your email</h1>
          <p className="text-sm text-brand-muted-light mt-2">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-white">{email}</span>
          </p>
          <Button
            className="w-full mt-6 bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12] rounded-xl"
            render={<Link href="/auth/login" />}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-navy">
      <Link href="/" className="mb-10">
        <Logo size="md" variant="dark" />
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-navy-card border border-white/[0.06] p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white">Create an account</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Start verifying invoices in seconds
          </p>
        </div>
        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-fail/10 border border-fail/20 px-3 py-2 text-sm text-fail">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-brand-muted-light">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="bg-white/[0.05] border-white/10 focus:border-coral text-white placeholder:text-brand-muted rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-brand-muted-light">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="bg-white/[0.05] border-white/10 focus:border-coral text-white placeholder:text-brand-muted rounded-xl px-4 py-3"
            />
            <p className="text-xs text-brand-muted">
              Must be at least 8 characters
            </p>
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create account"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-brand-muted">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-coral hover:text-coral-light underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
