// /installer/leads/[leadId]/claim — installer-facing landing for the
// "no slots → email installer" CTA.
//
// The lead in the URL is a homeowner_leads.id (not an installer_leads
// row) — at this point in the flow the homeowner has finished a check
// and tried to book this installer, but the booking dropped because
// the installer's diary was empty. The installer_lead_outreach row
// (migration 071) is the only persisted handle between the two
// parties; this page is its detail view.
//
// What this page does:
//   - Verifies the signed-in user owns the installer that received
//     the "no slots" email for this lead. Anyone else hitting the
//     URL gets a not-found-y refusal (we don't expose homeowner PII
//     to other installers).
//   - Renders the homeowner's contact + property + report summary
//     so the installer can decide whether to reach out.
//   - Surfaces a "Reach out to homeowner" button (or, when
//     contacted_at is set, the green-tick "You reached out on X"
//     state).
//   - Captures `?source=no-slots` for analytics so the funnel
//     between "email sent" and "lead contacted" can be measured.

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, ChevronLeft, Mail, MapPin, Phone, Zap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { ReachOutButton } from "./reach-out-button";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ leadId: string }>;
  searchParams: Promise<{ source?: string }>;
}

export default async function ClaimLeadPage({ params, searchParams }: PageProps) {
  const { leadId } = await params;
  const sp = await searchParams;
  const source = sp.source ?? null;

  // Auth gate: the page is signed-in-only. Bounce anonymous users
  // through /auth/login, returning here after login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const back = `/installer/leads/${encodeURIComponent(leadId)}/claim${
      source ? `?source=${encodeURIComponent(source)}` : ""
    }`;
    redirect(`/auth/login?redirect=${encodeURIComponent(back)}`);
  }

  const admin = createAdminClient();

  // Resolve which installer this user owns. Same pattern as
  // /installer/leads.
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();

  if (!installer) {
    // Signed in but not a claimed installer. Don't 404 — point them
    // at the signup page so they can finish the claim.
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Claim this lead"
        backLink={{ href: "/installer", label: "Back to installer portal" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-amber-900">
            Finish claiming your installer profile first
          </h2>
          <p className="text-sm text-amber-900 mt-2 max-w-md mx-auto leading-relaxed">
            We can&rsquo;t show you this lead until your account is
            linked to a claimed installer profile.
          </p>
          <Link
            href="/installer-signup"
            className="inline-flex items-center justify-center h-11 px-5 mt-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Claim your profile →
          </Link>
        </div>
      </PortalShell>
    );
  }

  // Outreach row is the gatekeeper: if there's no outreach row for
  // (installer, lead) we never emailed this installer about this
  // lead, so they shouldn't see the homeowner's details.
  const { data: outreach } = await admin
    .from("installer_lead_outreach")
    .select("id, contacted_at, contact_method, email_sent_at")
    .eq("installer_id", installer.id)
    .eq("lead_id", leadId)
    .maybeSingle<{
      id: string;
      contacted_at: string | null;
      contact_method: "email" | "phone" | null;
      email_sent_at: string;
    }>();

  if (!outreach) {
    notFound();
  }

  // Pull the homeowner lead now we know the installer is entitled
  // to see it. We surface email + phone + name + postcode + a
  // one-line "what they want" pulled from analysis_snapshot.
  const { data: lead } = await admin
    .from("homeowner_leads")
    .select(
      "id, email, name, phone, address, postcode, analysis_snapshot, created_at",
    )
    .eq("id", leadId)
    .maybeSingle<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      address: string | null;
      postcode: string | null;
      analysis_snapshot: unknown;
      created_at: string;
    }>();

  if (!lead) {
    notFound();
  }

  const wants = readWants(lead.analysis_snapshot);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Claim this lead"
      pageSubtitle="A homeowner tried to book you — your diary was full, but they're still interested."
      backLink={{ href: "/installer/leads", label: "Back to all leads" }}
    >
      <div className="space-y-4">
        {/* Source banner — gentle reminder of how the lead got here */}
        {source === "no-slots" && (
          <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4 text-sm leading-relaxed">
            <p className="font-semibold text-coral-dark">
              No-slots side-channel
            </p>
            <p className="text-slate-700 mt-1">
              We emailed you because this homeowner opened the
              booking modal for {installer.company_name} but found
              no available slots in the next 28 days. They&rsquo;ve
              completed a full check, so they&rsquo;re a warm lead.
            </p>
          </div>
        )}

        {/* Contacted state — green tick when the installer has
            already pressed "Reach out to homeowner" once. */}
        {outreach.contacted_at && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-700" />
            <div className="text-sm leading-relaxed">
              <p className="font-semibold text-emerald-900">
                You reached out on {formatLongDate(outreach.contacted_at)}
              </p>
              <p className="text-emerald-900 mt-1">
                {outreach.contact_method === "phone"
                  ? "Logged as a phone call."
                  : outreach.contact_method === "email"
                    ? "Logged as an email."
                    : "Logged via the dashboard."}
              </p>
            </div>
          </div>
        )}

        {/* Homeowner contact card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            Homeowner
          </h2>
          <p className="text-lg font-semibold text-navy">
            {lead.name ?? "(name not provided)"}
          </p>
          <ul className="mt-3 space-y-2 text-sm">
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <a
                href={`mailto:${lead.email}`}
                className="text-coral hover:text-coral-dark underline break-all"
              >
                {lead.email}
              </a>
            </li>
            {lead.phone && (
              <li className="flex items-start gap-2.5">
                <Phone className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <a
                  href={`tel:${lead.phone}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {lead.phone}
                </a>
              </li>
            )}
            {(lead.address || lead.postcode) && (
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
                <span className="text-slate-700">
                  {lead.address ? `${lead.address}, ` : ""}
                  {lead.postcode ?? ""}
                </span>
              </li>
            )}
            <li className="flex items-start gap-2.5">
              <Zap className="w-4 h-4 mt-0.5 text-slate-400 shrink-0" />
              <span className="text-slate-700">
                Wants: <strong className="text-navy">{wants}</strong>
              </span>
            </li>
          </ul>
        </section>

        {/* Action card */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
            Next step
          </h2>
          {outreach.contacted_at ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-700 leading-relaxed">
                You&rsquo;ve logged this lead as contacted. If
                they&rsquo;re ready to book a full site visit, set
                some availability and they&rsquo;ll be able to pick
                a slot through the standard booking flow.
              </p>
              <Link
                href="/installer/availability"
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-coral text-coral-dark hover:bg-coral-pale font-semibold text-xs transition-colors"
              >
                Set my availability
                <ChevronLeft className="w-3 h-3 rotate-180" />
              </Link>
            </div>
          ) : (
            <ReachOutButton
              outreachId={outreach.id}
              installerId={installer.id}
              leadId={lead.id}
            />
          )}
        </section>
      </div>
    </PortalShell>
  );
}

function readWants(snap: unknown): string {
  if (!snap || typeof snap !== "object") return "Energy upgrades";
  const obj = snap as Record<string, unknown>;
  const sel = obj.selection as Record<string, unknown> | undefined;
  if (!sel) return "Energy upgrades";
  const parts: string[] = [];
  const has = (k: string) => Boolean(sel[k] ?? false);
  if (has("hasHeatPump") || has("has_heat_pump")) parts.push("Heat pump");
  if (has("hasSolar") || has("has_solar")) parts.push("Solar PV");
  if (has("hasBattery") || has("has_battery")) parts.push("Battery");
  if (parts.length === 0) return "Energy upgrades";
  return parts.join(" + ");
}

function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
