"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Loader2, Mail, AlertCircle } from "lucide-react";

export function EmailGateForm({ verificationId }: { verificationId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alreadyUsed, setAlreadyUsed] = useState(false);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidEmail) return;
    setLoading(true);
    setError(null);
    setAlreadyUsed(false);

    try {
      const res = await fetch("/api/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, verificationId }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "ALREADY_USED") {
          setAlreadyUsed(true);
          return;
        }
        throw new Error(data.message || data.error || "Something went wrong");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (alreadyUsed) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-warn/10">
            <AlertCircle className="size-7 text-warn" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              You&apos;ve already used your free check
            </h2>
            <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
              This email has already been used for a free verification. Create
              an account and buy credits to run more checks.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-coral hover:bg-coral-dark text-white font-bold rounded-xl hover:shadow-md transition-all"
              render={<Link href="/auth/login" />}
            >
              Sign in or create account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-8 text-center space-y-5">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral/5">
          <ShieldCheck className="size-7 text-coral" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-slate-900">Your results are ready</h2>
          <p className="text-sm text-slate-500 mt-1.5 max-w-xs mx-auto">
            Enter your email to view your full verification report.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-slate-500">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                id="lead-email"
                type="email"
                placeholder="you@example.com"
                className="pl-9 bg-slate-50 border-slate-200 focus:border-coral text-slate-900 placeholder:text-slate-400 rounded-xl px-4 py-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-md transition-all"
            disabled={!isValidEmail || loading}
          >
            {loading ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Unlocking results...
              </>
            ) : (
              "View my results"
            )}
          </Button>
        </form>

        <p className="text-xs text-slate-400">
          No spam. One free check per email.
        </p>
      </div>
    </div>
  );
}
