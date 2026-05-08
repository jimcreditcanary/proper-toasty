// /installer/reports/[leadId] — installer-flavoured pre-survey
// site-visit brief.
//
// Replaces the previous "wrap homeowner ReportShell with audience=
// installer" approach with a purpose-built dense brief aimed at a
// technical engineer arriving on site. See
// src/components/installer-report/site-brief.tsx for the layout.
//
// Auth: must be signed in, must be the bound owner of the installer
// that this lead was routed to. Admins are allowed too (the
// installer layout already lets them through). We never let
// installer A peek at installer B's leads even if they know the URL.
//
// Data: read straight from installer_leads.analysis_snapshot — the
// snapshot stored at lead-capture time. Cross-reference to the check
// row (via homeowner_lead_id when set, post migration 055) to fish
// out the floorplan_object_key so we can link/print the original
// uploaded image.

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { InstallerSiteBrief } from "@/components/installer-report/site-brief";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { AddressMetadata } from "@/lib/schemas/address-lookup";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ leadId: string }>;
}

// Shape of the snapshot blob the wizard sends to /api/leads/capture.
// We trust the data was Zod-validated upstream — this type just
// helps us narrow what's inside the JSONB.
interface SnapshotShape {
  analysis?: AnalyseResponse;
  floorplanAnalysis?: FloorplanAnalysis | null;
  electricityTariff?: FuelTariff | null;
  gasTariff?: FuelTariff | null;
}

export default async function InstallerReportPage({ params }: PageProps) {
  const { leadId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=/installer/reports/${leadId}`);
  }

  const admin = createAdminClient();

  // Check role first so we can let admins peek at any lead for
  // support, while still locking installer A out of installer B.
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();
  const isAdmin = profile?.role === "admin";

  // Resolve the bound installer for the calling user (skipped for
  // admins — they're not bound to a specific installer record).
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();

  if (!installer && !isAdmin) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Report"
        backLink={{ href: "/installer/reports", label: "Back to reports" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Your account isn&rsquo;t linked to an installer profile yet,
            so we can&rsquo;t show this report. Claim your profile from
            the installer signup page first.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Load the lead — auth-gate by installer_id so installer A can't
  // view installer B's leads even if they guess the URL. Admins
  // bypass the installer match.
  let leadQuery = admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, contact_name, contact_email, contact_phone, property_address, property_postcode, property_uprn, property_latitude, property_longitude, installer_acknowledged_at, visit_booked_for, wants_heat_pump, wants_solar, wants_battery, homeowner_lead_id, analysis_snapshot",
    )
    .eq("id", leadId);
  if (!isAdmin && installer) {
    leadQuery = leadQuery.eq("installer_id", installer.id);
  }
  const { data: lead } = await leadQuery.maybeSingle();
  if (!lead) {
    notFound();
  }

  // Pre-acknowledged leads aren't actionable here. Show a "accept
  // first" nudge rather than the brief.
  if (!lead.installer_acknowledged_at) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Report"
        backLink={{ href: "/installer/leads", label: "Back to leads" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm font-semibold text-amber-900">
            Accept this lead first
          </p>
          <p className="text-sm text-amber-900 mt-1 leading-relaxed">
            Reports unlock once you&rsquo;ve accepted a booking. Open
            it from your inbox to accept.
          </p>
        </div>
      </PortalShell>
    );
  }

  const snapshot = (lead.analysis_snapshot ?? {}) as SnapshotShape;
  if (!snapshot.analysis) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Report"
        backLink={{ href: "/installer/reports", label: "Back to reports" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            We don&rsquo;t have an analysis snapshot for this lead.
            Either it predates the snapshot capture (very early
            adopters) or the homeowner abandoned mid-flow. Email
            hello@propertoasty.com and we&rsquo;ll regenerate it.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Look up the matching check row's floorplan_object_key. Tries
  // every linkage path we have, in order of confidence:
  //
  //   1. lead.homeowner_lead_id → checks.homeowner_lead_id
  //      (the canonical link, set by /api/leads/capture). Skip if
  //      column missing on prod (migration 055 not run).
  //
  //   2. snapshot.floorplanObjectKey on the lead
  //      (added in this commit so new leads carry the key inline,
  //      regardless of whether the check ↔ lead linkage row
  //      survived schema drift).
  //
  //   3. fall back to UPRN / postcode + email match on checks. Last
  //      resort — the check row carries the same property identity
  //      so we can re-find it even when nothing else lines up.
  let floorplanObjectKey: string | null = null;
  let addressMetadata: AddressMetadata | null = null;

  if (lead.homeowner_lead_id) {
    try {
      const { data: check, error } = await admin
        .from("checks")
        .select("floorplan_object_key, address_metadata")
        .eq("homeowner_lead_id", lead.homeowner_lead_id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle<{
          floorplan_object_key: string | null;
          address_metadata: AddressMetadata | null;
        }>();
      if (error) {
        console.warn("[installer-report] homeowner_lead_id lookup failed", error);
      } else {
        floorplanObjectKey = check?.floorplan_object_key ?? null;
        addressMetadata = check?.address_metadata ?? null;
      }
    } catch (e) {
      console.warn("[installer-report] check lookup threw", e);
    }
  }

  // Inline fallback — the snapshot may carry the key directly for
  // new leads. Old leads that predate this won't have it, so the
  // postcode-match below picks up the slack.
  if (!floorplanObjectKey) {
    const snap = lead.analysis_snapshot as
      | { floorplanObjectKey?: string | null }
      | null;
    floorplanObjectKey = snap?.floorplanObjectKey ?? null;
  }

  // Last-resort lookup — match on UPRN (most specific) or
  // postcode + email. Solves the legacy + schema-drift case
  // without needing the homeowner_lead_id column to exist.
  if (!floorplanObjectKey && (lead.property_uprn || lead.property_postcode)) {
    try {
      let q = admin
        .from("checks")
        .select("floorplan_object_key, address_metadata")
        .order("updated_at", { ascending: false })
        .limit(1);
      if (lead.property_uprn) {
        q = q.eq("uprn", lead.property_uprn);
      } else if (lead.property_postcode) {
        q = q.ilike("postcode", lead.property_postcode);
      }
      const { data: fallback } = await q.maybeSingle<{
        floorplan_object_key: string | null;
        address_metadata: AddressMetadata | null;
      }>();
      if (fallback) {
        floorplanObjectKey = floorplanObjectKey ?? fallback.floorplan_object_key;
        addressMetadata = addressMetadata ?? fallback.address_metadata;
      }
    } catch (e) {
      // Some columns (address_uprn / address_postcode) may not exist
      // on every schema vintage — don't crash the page if so.
      console.warn("[installer-report] fallback check lookup failed", e);
    }
  }

  return (
    <PortalShell
      portalName="Installer"
      // Generic page title — the InstallerSiteBrief inside owns the
      // property identity (address + UPRN + classification). Showing
      // the address here too caused two giant H1s on the same page.
      pageTitle="Pre-survey site brief"
      pageSubtitle={`For ${lead.contact_name ?? "the homeowner"}.`}
      backLink={{ href: "/installer/reports", label: "Back to reports" }}
    >
      <InstallerSiteBrief
        contact={{
          name: lead.contact_name ?? null,
          email: lead.contact_email ?? null,
          phone: lead.contact_phone ?? null,
        }}
        property={{
          address: lead.property_address ?? null,
          postcode: lead.property_postcode ?? null,
          uprn: lead.property_uprn ?? null,
          latitude: lead.property_latitude ?? null,
          longitude: lead.property_longitude ?? null,
          metadata: addressMetadata,
        }}
        lead={{
          status: lead.status,
          acceptedAt: lead.installer_acknowledged_at,
          visitBookedFor: lead.visit_booked_for ?? null,
          wantsHeatPump: lead.wants_heat_pump ?? false,
          wantsSolar: lead.wants_solar ?? false,
          wantsBattery: lead.wants_battery ?? false,
        }}
        analysis={snapshot.analysis}
        floorplan={snapshot.floorplanAnalysis ?? null}
        electricityTariff={snapshot.electricityTariff ?? null}
        gasTariff={snapshot.gasTariff ?? null}
        floorplanObjectKey={floorplanObjectKey}
      />
    </PortalShell>
  );
}
