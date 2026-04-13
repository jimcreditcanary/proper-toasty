"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { ShieldCheck } from "lucide-react";

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
        <Logo size="md" variant="light" />
      </div>
    }>
      <AuthPageInner />
    </Suspense>
  );
}

function AuthPageInner() {
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") === "signup" ? "signup" : "signin";

  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  function switchTab(t: "signin" | "signup") {
    setTab(t);
    setError(null);
  }

  async function handleSignin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const redirect = searchParams.get("redirect") || "/dashboard";
    router.push(redirect);
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const redirect = searchParams.get("redirect") || "/dashboard";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirect)}`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSignupSuccess(true);
    setLoading(false);
  }

  if (signupSuccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
        <Link href="/" className="mb-10">
          <Logo size="md" variant="light" />
        </Link>
        <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-coral/5">
            <ShieldCheck className="size-7 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">Check your email</h1>
          <p className="text-sm text-slate-500 mt-2">
            We&apos;ve sent a confirmation link to{" "}
            <span className="font-medium text-slate-900">{email}</span>
          </p>
          <Button
            className="w-full mt-6 bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-xl"
            onClick={() => {
              setSignupSuccess(false);
              switchTab("signin");
            }}
          >
            Back to sign in
          </Button>
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
        {/* Tab switcher */}
        <div className="flex rounded-xl bg-slate-50 border border-slate-200 p-1 mb-6">
          <button
            onClick={() => switchTab("signin")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "signin"
                ? "bg-coral text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => switchTab("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              tab === "signup"
                ? "bg-coral text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Create account
          </button>
        </div>

        {/* Sign in form */}
        {tab === "signin" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500 mt-1">
                Sign in to your account to continue
              </p>
            </div>
            <form onSubmit={handleSignin} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-500">Email</Label>
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
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-500">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </>
        )}

        {/* Sign up form */}
        {tab === "signup" && (
          <>
            <div className="text-center mb-6">
              <h1 className="text-xl font-semibold text-slate-900">Create an account</h1>
              <p className="text-sm text-slate-500 mt-1">
                Start verifying invoices in seconds
              </p>
            </div>
            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email-signup" className="text-slate-500">Email</Label>
                <Input
                  id="email-signup"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password-signup" className="text-slate-500">Password</Label>
                <Input
                  id="password-signup"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
                />
                <p className="text-xs text-slate-400">
                  Must be at least 8 characters
                </p>
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create account"}
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
