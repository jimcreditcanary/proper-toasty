// /installer/onboarding/profile — Step 1 of the four-step setup.
//
// What we capture here:
//   - Logo (reuses the existing logo-upload endpoint from m064)
//   - Bio (new — installers.bio column from m067)
//
// What we DON'T re-capture:
//   - Services (cap_* flags — set at MCS scrape time, read-only)
//   - Regions covered (region_* flags — same)
// Both are surfaced as a confirmation summary so the installer
// knows what we have on file; if it's wrong, they email support.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { ProfileOnboardingForm } from "./profile-form";
import {
  primaryRegion,
  primaryTechBucket,
  regionDisplayName,
  techBucketDisplayName,
} from "@/lib/outreach/tier-preview";
import type { Database } from "@/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

export const dynamic = "force-dynamic";

export default async function OnboardingProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/installer/onboarding/profile");

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<InstallerRow>();
  if (!installer) redirect("/installer-signup");

  const region = primaryRegion(installer);
  const bucket = primaryTechBucket(installer);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Step 1 — Complete your profile"
      pageSubtitle="Add a logo + a short bio. We use these on every directory page."
      backLink={{
        href: "/installer/onboarding",
        label: "Back to onboarding",
      }}
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-5">
        <h2 className="text-sm font-semibold text-navy mb-3">
          What we have on file for {installer.company_name}
        </h2>
        <dl className="space-y-2 text-xs">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Primary service</dt>
            <dd className="text-navy font-medium text-right">
              {bucket ? techBucketDisplayName(bucket) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Primary region</dt>
            <dd className="text-navy font-medium text-right">
              {region ? regionDisplayName(region) : "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">Postcode</dt>
            <dd className="text-navy font-medium text-right">
              {installer.postcode ?? "—"}
            </dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-500">MCS certificate</dt>
            <dd className="text-navy font-medium text-right">
              {installer.certification_number}
            </dd>
          </div>
        </dl>
        <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
          These come from the MCS register. Wrong?{" "}
          <a
            href="mailto:hello@propertoasty.com"
            className="text-coral hover:text-coral-dark underline"
          >
            Email us
          </a>{" "}
          and we&rsquo;ll fix the source record.
        </p>
      </div>

      <ProfileOnboardingForm
        installerId={installer.id}
        companyName={installer.company_name}
        initialLogoUrl={installer.logo_url}
        initialBio={installer.bio}
      />

      <p className="mt-5 text-center text-xs text-slate-500">
        <Link
          href="/installer/onboarding"
          className="hover:text-navy underline"
        >
          Skip for now
        </Link>{" "}
        — you can come back later, but the credits don&rsquo;t land
        until you complete this step.
      </p>
    </PortalShell>
  );
}
