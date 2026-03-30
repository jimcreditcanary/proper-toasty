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
        <div className="w-full max-w-md rounded-2xl bg-navy-card border border-white/[0.06] p-8 text-center space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-warn/10">
            <AlertCircle className="size-7 text-warn" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">
              You&apos;ve already used your free check
            </h2>
            <p className="text-sm text-brand-muted-light mt-1.5 max-w-xs mx-auto">
              This email has already been used for a free verification. Create
              an account and buy credits to run more checks.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-coral hover:bg-coral-dark text-white font-bold rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
              render={<Link href="/auth/signup" />}
            >
              Create account &amp; buy credits
            </Button>
            <Button
              className="w-full bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12] rounded-xl"
              render={<Link href="/auth/login" />}
            >
              Sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-full max-w-md rounded-2xl bg-navy-card border border-white/[0.06] p-8 text-center space-y-5">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-coral/10">
          <ShieldCheck className="size-7 text-coral" />
        </div>

        <div>
          <h2 className="text-xl font-semibold text-white">Your results are ready</h2>
          <p className="text-sm text-brand-muted-light mt-1.5 max-w-xs mx-auto">
            Enter your email to view your full verification report.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="lead-email" className="text-brand-muted-light">Email address</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-brand-muted" />
              <Input
                id="lead-email"
                type="email"
                placeholder="you@example.com"
                className="pl-9 bg-white/[0.05] border-white/10 focus:border-coral text-white placeholder:text-brand-muted rounded-xl px-4 py-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-fail">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
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

        <p className="text-xs text-brand-muted">
          No spam. One free check per email.
        </p>
      </div>
    </div>
  );
}
