// /installer/reports/[leadId] — installer-flavoured pre-survey
// report viewer.
//
// Wraps the same ReportShell the homeowner sees, but with
// audience="installer" — strips consumer-flavoured cards (the
// "what could your home benefit from", "how to get the best out
// of installers", savings tab, book-a-visit tab, email button)
// and leaves only the technical detail an installer needs to prep
// for the visit.
//
// Auth: must be signed in, must be the bound owner of the
// installer that this lead was routed to. We never let installer
// A peek at installer B's leads, even if they know the URL.
//
// The actual report payload is loaded via the existing
// /api/reports/[token]/load endpoint using the per-lead token
// stamped on installer_leads.installer_report_url. This keeps the
// data path identical to the homeowner /r/[token] view — only the
// audience prop differs.

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { issueReportUrl } from "@/lib/booking/report-link";
import { InstallerReportClient } from "./client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ leadId: string }>;
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

  // Resolve the bound installer for the calling user.
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
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
  // view installer B's leads even if they guess the URL.
  const { data: lead } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, contact_name, property_address, property_postcode, installer_report_url, installer_acknowledged_at, homeowner_lead_id, contact_email, analysis_snapshot, property_latitude, property_longitude",
    )
    .eq("id", leadId)
    .eq("installer_id", installer.id)
    .maybeSingle();
  if (!lead) {
    notFound();
  }

  // Pre-acknowledged leads don't have a report URL yet — they
  // haven't been accepted. Show a "accept first" nudge rather
  // than 404 (the lead is real, just not actionable here).
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
            it from your inbox to accept first.
          </p>
        </div>
      </PortalShell>
    );
  }

  // Backfill the installer_report_url if it's missing — same
  // self-heal pattern as /installer/reports listing.
  let reportUrl = lead.installer_report_url;
  if (!reportUrl) {
    const appBaseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
    ).replace(/\/+$/, "");
    try {
      reportUrl = await issueReportUrl({ admin, lead, appBaseUrl });
      await admin
        .from("installer_leads")
        .update({ installer_report_url: reportUrl })
        .eq("id", lead.id);
    } catch (e) {
      console.warn("[installer-report] backfill failed", {
        leadId: lead.id,
        err: e instanceof Error ? e.message : e,
      });
    }
  }
  if (!reportUrl) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Report"
        backLink={{ href: "/installer/reports", label: "Back to reports" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            We couldn&rsquo;t mint a report link for this lead. Email
            hello@propertoasty.com and we&rsquo;ll sort it out.
          </p>
        </div>
      </PortalShell>
    );
  }

  // The URL ends in /r/<token>. Pull the token out so the client can
  // hit /api/reports/<token>/load directly (saves a round-trip
  // through the page render).
  const token = reportUrl.split("/").pop() ?? "";

  return (
    <PortalShell
      portalName="Installer"
      pageTitle={
        lead.property_address ?? lead.property_postcode ?? "Pre-survey report"
      }
      pageSubtitle={`Pre-survey detail for ${lead.contact_name ?? "the homeowner"}.`}
      backLink={{ href: "/installer/reports", label: "Back to reports" }}
    >
      <InstallerReportClient token={token} />

      <div className="mt-8 text-center">
        <Link
          href="/installer/leads"
          className="text-xs text-slate-500 hover:text-coral underline"
        >
          ← Back to leads inbox
        </Link>
      </div>
    </PortalShell>
  );
}
