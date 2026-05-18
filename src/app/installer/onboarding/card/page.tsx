// /installer/onboarding/card — Step 3 of onboarding. Connect a
// card via Stripe SetupIntent (no charge today; stored for future
// top-ups + the auto-recharge flow when balance runs low).

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
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed mb-5">
        <strong className="text-navy">Why we ask:</strong> when your credit
        balance drops low, you can opt into auto top-up. That uses this
        saved card to add credits in the background so you never miss a
        lead. You can also just use it for manual top-ups from the
        credits portal. Either way, <strong className="text-navy">no
        charge happens today</strong>.
      </div>

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
    </PortalShell>
  );
}
