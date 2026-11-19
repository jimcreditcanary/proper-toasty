// /installer/onboarding/confirm-business — Step 1 of the onboarding
// flow (propertoasty#217).
//
// The installer sees the Companies House match the scraper attached
// to their listing and picks one of three paths:
//   1. "Yes, that's us"       → confirm, done
//   2. "Different company"    → CH search picker, overwrite
//   3. "Not a limited company" → declare sole trader / partnership / llp
//
// Trading address / phone / website are editable on all three paths.

import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundInstallerId } from "@/lib/installer-auth/get-bound-installer";
import { PortalShell } from "@/components/portal-shell";
import { ConfirmBusinessForm } from "./confirm-business-form";
import type { Database } from "@/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

export const dynamic = "force-dynamic";

export default async function OnboardingConfirmBusinessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/onboarding/confirm-business");
  }

  const admin = createAdminClient();
  const installerId = await getBoundInstallerId(admin, user.id);
  if (!installerId) redirect("/installer-signup");

  const { data: installer } = await admin
    .from("installers")
    .select("*")
    .eq("id", installerId)
    .maybeSingle<InstallerRow>();
  if (!installer) redirect("/installer-signup");

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Step 1 — Confirm your business"
      pageSubtitle="Check the company we've attached to your listing. If it's wrong, correct it now — this is what the public directory will show."
      backLink={{
        href: "/installer/onboarding",
        label: "Back to onboarding",
      }}
    >
      <ConfirmBusinessForm
        installerId={installer.id}
        companyName={installer.company_name}
        mcsNumber={installer.certification_number}
        initial={{
          company_number: installer.company_number,
          ch_matched_name: installer.ch_matched_name,
          ch_matched_address: installer.ch_matched_address,
          legal_structure: installer.legal_structure,
          address_line_1: installer.address_line_1,
          address_line_2: installer.address_line_2,
          address_line_3: installer.address_line_3,
          county: installer.county,
          postcode: installer.postcode,
          telephone: installer.telephone,
          website: installer.website,
          alreadyConfirmedAt: installer.business_details_confirmed_at,
        }}
      />

      <p className="mt-5 text-center text-xs text-slate-500">
        <Link
          href="/installer/onboarding"
          className="hover:text-navy underline"
        >
          Skip for now
        </Link>{" "}
        — but a listing showing the wrong company is the first thing
        homeowners will spot.
      </p>
    </PortalShell>
  );
}
