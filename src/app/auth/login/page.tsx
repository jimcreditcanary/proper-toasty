"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
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

    router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-navy">
      <Link href="/" className="mb-10">
        <Logo size="md" variant="dark" />
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-navy-card border border-white/[0.06] p-8">
        <div className="text-center mb-6">
          <h1 className="text-xl font-semibold text-white">Welcome back</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Sign in to your account to continue
          </p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
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
              className="bg-white/[0.05] border-white/10 focus:border-coral text-white placeholder:text-brand-muted rounded-xl px-4 py-3"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-brand-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/signup"
            className="font-medium text-coral hover:text-coral-light underline underline-offset-4"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
