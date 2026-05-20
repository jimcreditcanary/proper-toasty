// /installer/onboarding/card — Step 3 of onboarding. Connect a
// card via Stripe SetupIntent (no charge today) + optionally
// set auto top-up rules in the same step.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { CardSetupForm } from "./card-form";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";

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
      pageTitle="Step 3 — Card on file"
      pageSubtitle="No charge today. You decide when (and if) we ever charge it."
      backLink={{ href: "/installer/onboarding", label: "Back to onboarding" }}
    >
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed mb-5 space-y-1.5">
        <p>
          <strong className="text-navy">No charge today.</strong> We
          save your card via Stripe — Propertoasty never sees the full
          card details.
        </p>
        <p>
          <strong className="text-navy">Future charges only happen
          when YOU set a rule.</strong> Below you pick whether we
          auto-recharge when your balance runs low, or just save the
          card for manual top-ups.
        </p>
        <p className="text-slate-500">
          You can change the rule any time from{" "}
          <a
            href="/installer/billing/auto-recharge"
            className="underline hover:text-coral"
          >
            Billing → Auto top-up
          </a>
          .
        </p>
      </div>

      {publishableKey ? (
        <CardSetupForm
          publishableKey={publishableKey}
          packs={CREDIT_PACKS.map((p) => ({
            id: p.id,
            label: p.label,
            credits: p.credits,
            pricePence: p.pricePence,
            highlight: p.highlight ?? false,
          }))}
        />
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
    </PortalShell>
  );
}
