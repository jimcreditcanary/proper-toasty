"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-sm space-y-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Check your email</h1>
          <p className="text-muted-foreground text-sm">
            We&apos;ve sent a confirmation link to {email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Create an account</h1>
          <p className="text-muted-foreground text-sm">
            Sign up for whoamipaying.co.uk
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
