// /installer/onboarding/card — Step 3 of onboarding. Connect a
// card via Stripe SetupIntent (no charge today; stored for future
// top-ups + the auto-recharge flow when balance runs low).

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { CardSetupForm } from "./card-form";

export const dynamic = "force-dynamic";

export default async function OnboardingCardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/installer/onboarding/card");

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) redirect("/installer-signup");

  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Step 3 — Connect a card"
      pageSubtitle="Saves you re-entering details next time. We don't charge anything today."
      backLink={{ href: "/installer/onboarding", label: "Back to onboarding" }}
    >
      {publishableKey ? (
        <CardSetupForm publishableKey={publishableKey} />
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 leading-relaxed">
          <p className="font-semibold">Stripe isn&rsquo;t configured</p>
          <p className="mt-1">
            We can&rsquo;t collect card details right now. You can skip
            this step + come back later — your credits are already
            granted from the other steps.
          </p>
        </div>
      )}

      {/* Mode C — Skip. Lives outside the form so the user can opt
          out without committing to any of the recharge modes. The
          onboarding card stays unticked on the dashboard; they can
          come back any time. */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed flex items-start gap-3">
        <div className="flex-1">
          <p className="font-semibold text-navy">Not ready to add a card?</p>
          <p className="mt-1">
            Skip for now and come back from{" "}
            <Link
              href="/installer/billing/auto-recharge"
              className="text-coral hover:text-coral-dark underline"
            >
              Billing → Auto-recharge
            </Link>
            . Your existing credits stay valid either way.
          </p>
        </div>
        <Link
          href="/installer/onboarding"
          className="shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:border-slate-300 text-slate-700 transition-colors"
        >
          Skip for now
        </Link>
      </div>
    </PortalShell>
  );
}
