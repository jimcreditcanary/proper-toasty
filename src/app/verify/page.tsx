"use client";

import { useEffect, useState } from "react";
import { WizardProvider } from "@/components/wizard/context";
import { WizardShell } from "@/components/wizard/wizard-shell";
import { ShieldCheck } from "lucide-react";

export default function VerifyPage() {
  const [authState, setAuthState] = useState<{
    isAuthenticated: boolean;
    userCredits: number;
    userEmail: string | null;
  } | null>(null);

  useEffect(() => {
    // Check auth state on mount
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          // Fetch credits
          const { data: profile } = await supabase
            .from("users")
            .select("credits")
            .eq("id", user.id)
            .single();

          setAuthState({
            isAuthenticated: true,
            userCredits: profile?.credits ?? 0,
            userEmail: user.email ?? null,
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            userCredits: 0,
            userEmail: null,
          });
        }
      });
    });
  }, []);

  if (!authState) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <ShieldCheck className="size-10 text-coral mx-auto animate-pulse" />
          <p className="text-sm text-slate-500 mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="py-8 sm:py-12">
        <WizardProvider initialAuth={authState}>
          <WizardShell />
        </WizardProvider>
      </div>
    </div>
  );
}
