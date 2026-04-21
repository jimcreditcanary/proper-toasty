import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowRight, Coins, Home } from "lucide-react";

/**
 * Minimal dashboard while Phase 3 DB persistence of checks is pending.
 * Shows the user their credits balance and a prompt to start a new check.
 * A real "my checks" history will replace this once /api/analyse writes rows.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // users table in this project currently carries just the auth link — no
  // credits column yet. Default to 0 until we migrate that in Phase 3.
  const credits = 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-navy">Your dashboard</h1>
      <p className="mt-2 text-slate-600">Signed in as {user.email}.</p>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-coral-pale text-coral mb-3">
            <Coins className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-600">Credits</p>
          <p className="mt-1 text-3xl font-bold text-navy">{credits}</p>
          <p className="mt-2 text-xs text-slate-500">
            Pay-per-check pricing lands in Phase 3. For now, checks are free.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-coral-pale text-coral mb-3">
            <Home className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium text-slate-600">Ready to check a property?</p>
          <p className="mt-1 text-sm text-slate-500">
            Get a heat pump + solar pre-survey in minutes.
          </p>
          <Button
            className="mt-4 h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg"
            render={<Link href="/check" />}
          >
            Start a new check <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      <p className="mt-10 text-xs text-slate-400">
        Your saved checks will appear here once Phase 3 lands.
      </p>
    </div>
  );
}
