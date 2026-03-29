"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
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
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-6 text-center space-y-5">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="size-7 text-amber-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                You&apos;ve already used your free check
              </h2>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
                This email has already been used for a free verification. Create
                an account and buy credits to run more checks.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button render={<Link href="/auth/signup" />} className="w-full">
                Create account &amp; buy credits
              </Button>
              <Button
                variant="outline"
                render={<Link href="/auth/login" />}
                className="w-full"
              >
                Sign in
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 text-center space-y-5">
          <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="size-7 text-primary" />
          </div>

          <div>
            <h2 className="text-xl font-semibold">Your results are ready</h2>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-xs mx-auto">
              Enter your email to view your full verification report.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <Label htmlFor="lead-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="lead-email"
                  type="email"
                  placeholder="you@example.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full"
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

          <p className="text-xs text-muted-foreground">
            No spam. One free check per email.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
