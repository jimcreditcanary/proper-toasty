// /installer/profile — installer-side surface for things that
// shape how the installer is presented to homeowners on the public
// directory pages.
//
// Two sections in v1:
//
//   1. Logo  — upload a square logo (PNG/JPEG/WEBP/SVG, up to 2 MiB).
//      Replaces the auto-generated initials avatar on every
//      installer card (town pages, LA pages, /heat-pump-installers,
//      /solar-panel-installers).
//
//   2. Sponsored placement  — paid boost. While the boost window is
//      open the installer floats to the top of directory listings +
//      pays 10 credits per accepted lead (vs the standard 5). They
//      pick a duration (7 / 30 days), we set sponsored_until, and it
//      auto-expires when the timestamp passes.
//
// Both surfaces are gated on installer-claim — an unbound user gets
// the "claim your profile first" CTA instead.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { Image as ImageIcon } from "lucide-react";
import { ProfileEditor } from "./profile-editor";

export const dynamic = "force-dynamic";

export default async function InstallerProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/profile");
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name, logo_url, sponsored_until")
    .eq("user_id", user.id)
    .maybeSingle<{
      id: number;
      company_name: string;
      logo_url: string | null;
      sponsored_until: string | null;
    }>();

  // Credit balance — sponsored toggle shows "you'll need 10 credits
  // per lead" so installers with zero balance see a useful warning.
  const { data: profile } = await admin
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .maybeSingle<{ credits: number }>();

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Profile + boost"
      pageSubtitle="Upload a logo and manage sponsored placement on the public directory."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {!installer ? (
        <UnboundState />
      ) : (
        <ProfileEditor
          companyName={installer.company_name}
          initialLogoUrl={installer.logo_url}
          initialSponsoredUntil={installer.sponsored_until}
          creditBalance={profile?.credits ?? 0}
        />
      )}
    </PortalShell>
  );
}

function UnboundState() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 mb-3">
        <ImageIcon className="w-5 h-5" />
      </span>
      <h2 className="text-lg font-semibold text-amber-900">
        Claim your installer profile first
      </h2>
      <p className="text-sm text-amber-900 mt-2 leading-relaxed max-w-md mx-auto">
        Your account isn&rsquo;t linked to an installer record yet, so
        there&rsquo;s no profile to attach a logo or boost to. Find
        your MCS profile + finish the claim, then come back here.
      </p>
      <Link
        href="/installer-signup"
        className="inline-flex items-center justify-center h-11 px-5 mt-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Claim your profile →
      </Link>
    </div>
  );
}
