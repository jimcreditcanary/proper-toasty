// /installer/availability — installer-side editor for weekly
// site-visit availability + visit duration + travel buffer.
//
// Server component handles the auth gate (must be signed in,
// installer-bound) and renders a thin shell. The actual editor is
// a client island that pulls the current settings via
// /api/installer/availability and writes them back.
//
// We also surface a "claim your profile" CTA when the user is
// signed in but not bound to an installer record yet — better than
// a confusing empty form.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { CalendarDays } from "lucide-react";
import { AvailabilityEditor } from "./availability-editor";

export const dynamic = "force-dynamic";

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    // Middleware should already redirect, but defence in depth.
    redirect("/auth/login?redirect=/installer/availability");
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Availability"
      pageSubtitle="Set when you're free to do site visits. Homeowners book directly into open slots."
    >
      {!installer ? (
        <UnboundState />
      ) : (
        <AvailabilityEditor installerName={installer.company_name} />
      )}
    </PortalShell>
  );
}

function UnboundState() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 mb-3">
        <CalendarDays className="w-5 h-5" />
      </span>
      <h2 className="text-lg font-semibold text-amber-900">
        Claim your installer profile first
      </h2>
      <p className="text-sm text-amber-900 mt-2 leading-relaxed max-w-md mx-auto">
        Your account isn&rsquo;t linked to an installer record yet, so
        we don&rsquo;t know which company&rsquo;s schedule to update.
        Find your MCS profile + finish the claim, then come back here.
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
