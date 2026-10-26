"use client";

// Forced-password-change page.
//
// Reached when the user signs in with an admin-issued temporary
// password (public.users.must_change_password = true). Portal layouts
// (admin / dashboard / installer) redirect here on every request
// until the user picks a new password; this page submits it, the
// API clears the flag, and we send them back to where they were going.

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";

export default function ChangePasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Password change failed");
        return;
      }
      router.push(next);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 bg-slate-50">
      <div className="mb-10">
        <Logo size="md" variant="light" />
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-8">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-coral/5">
            <KeyRound className="size-6 text-coral" />
          </div>
          <h1 className="text-xl font-semibold text-slate-900">
            Set a new password
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            You signed in with a temporary password. Please pick a new one to
            continue.
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
              autoFocus
              autoComplete="new-password"
              className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 rounded-xl px-4 py-3"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm" className="text-slate-500">
              Confirm new password
            </Label>
            <Input
              id="confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-slate-50 border-slate-200 focus:border-coral text-slate-900 rounded-xl px-4 py-3"
            />
          </div>
          <Button
            type="submit"
            className="w-full h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
            disabled={loading}
          >
            {loading ? "Saving…" : "Save password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
