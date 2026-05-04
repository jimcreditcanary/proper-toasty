import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ArrowRight, Building2, Coins, Home } from "lucide-react";
import type { Database } from "@/types/database";

/**
 * Minimal dashboard while Phase 3 DB persistence of checks is pending.
 * Shows the user their credits balance and a prompt to start a new check.
 * A real "my checks" history will replace this once /api/analyse writes rows.
 *
 * Also surfaces an "Are you an installer?" CTA when the signed-in
 * user's email matches an unclaimed installer record. This catches
 * the case where someone signs up via /installer-signup but the
 * claim binding doesn't run during the auth flow (e.g. they
 * dropped through the existing-account sign-in path which doesn't
 * carry the installer id), and they otherwise end up dead-ended on
 * /dashboard with no obvious way back to the claim flow.
 */
export const dynamic = "force-dynamic";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface UnclaimedInstaller {
  id: number;
  companyName: string;
}

async function findUnclaimedInstallerByEmail(
  email: string,
): Promise<UnclaimedInstaller | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("installers")
    .select("id, company_name")
    .ilike("email", email)
    .is("user_id", null)
    .order("scraped_at", { ascending: false })
    .limit(1)
    .maybeSingle<Pick<InstallerRow, "id" | "company_name">>();
  if (!data) return null;
  return { id: data.id, companyName: data.company_name };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Role-aware redirect — there are two installer-flavoured "homes"
  // in this app (/dashboard and /installer) and we want one canonical
  // landing per role. /dashboard becomes the homeowner home; signed-
  // in installers go to /installer (richer features), admins to
  // /admin. Direct links from emails or bookmarks still resolve.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (profile?.role === "installer") redirect("/installer");
  if (profile?.role === "admin") redirect("/admin");

  const unclaimed = user.email
    ? await findUnclaimedInstallerByEmail(user.email)
    : null;

  // users table in this project currently carries just the auth link — no
  // credits column yet. Default to 0 until we migrate that in Phase 3.
  const credits = 0;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-10 sm:py-14">
      <h1 className="text-3xl font-bold tracking-tight text-navy">Your dashboard</h1>
      <p className="mt-2 text-slate-600">Signed in as {user.email}.</p>

      {unclaimed && (
        <Link
          href={`/installer-signup?id=${unclaimed.id}`}
          className="mt-6 block rounded-2xl border border-coral/30 bg-coral-pale/40 p-5 hover:border-coral/50 transition-colors"
        >
          <div className="flex items-start gap-4">
            <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-white text-coral border border-coral/30">
              <Building2 className="w-5 h-5" />
            </span>
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">
                Looks like you&rsquo;re an installer
              </p>
              <p className="mt-1 text-base font-bold text-navy leading-tight">
                Finish claiming {unclaimed.companyName}
              </p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Your email matches our directory record for this
                installer but the claim isn&rsquo;t complete yet. One
                click finishes binding so you can start accepting
                leads.
              </p>
            </div>
            <ArrowRight className="shrink-0 w-5 h-5 text-coral mt-2" />
          </div>
        </Link>
      )}

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
