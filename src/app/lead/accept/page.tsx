// /lead/accept — confirmation page that the "Accept this lead"
// link in the pending-installer email points at.
//
// Lives under /lead/* (not /installer/*) so the installer-portal
// layout's role-gate redirect doesn't block unauthenticated
// magic-link access. The HMAC token in the URL is the only auth.
//
// ── Why an interstitial page? ──────────────────────────────────────────
// Outlook / Microsoft Defender / most corporate email security
// scanners pre-fetch every URL in incoming email to scan for malware.
// They issue GET requests, sometimes multiple times. If our accept
// endpoint did its work on GET, the lead would auto-accept the moment
// the email arrived — bypassing the installer entirely. We've seen
// this in production: confirmed-emails fired three times before the
// installer's inbox even displayed the pending email.
//
// Fix: GET this page renders a friendly summary + an "Accept this
// lead" button. The button submits a POST to
// /api/installer-leads/acknowledge which is where the actual work
// happens. Email scanners don't submit forms, so the lead stays
// pending until a real human clicks.
//
// Token verification still runs server-side here so we can render a
// "link expired / invalid" state without making any DB writes.

import Link from "next/link";
import { CalendarDays, MapPin, ShieldCheck, Zap } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken } from "@/lib/email/tokens";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];
type MeetingRow = Database["public"]["Tables"]["installer_meetings"]["Row"];
type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface PageState {
  kind: "ok";
  leadId: string;
  token: string;
  installerName: string;
  postcodeArea: string | null;
  scheduledAt: string;
  durationMin: number;
  travelBufferMin: number;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  alreadyAccepted: boolean;
}

type State =
  | PageState
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "error"; message: string };

async function loadState(leadId: string, token: string): Promise<State> {
  if (!verifyLeadAckToken(leadId, token)) {
    return { kind: "invalid" };
  }
  const admin = createAdminClient();

  const { data: lead, error: leadErr } = await admin
    .from("installer_leads")
    .select(
      "id, installer_id, status, property_postcode, " +
        "wants_heat_pump, wants_solar, wants_battery",
    )
    .eq("id", leadId)
    .maybeSingle<
      Pick<
        LeadRow,
        | "id"
        | "installer_id"
        | "status"
        | "property_postcode"
        | "wants_heat_pump"
        | "wants_solar"
        | "wants_battery"
      >
    >();
  if (leadErr) {
    return { kind: "error", message: "Database error" };
  }
  if (!lead) return { kind: "invalid" };

  // Fetch meeting + installer in parallel.
  const [meetingResult, installerResult] = await Promise.all([
    admin
      .from("installer_meetings")
      .select(
        "id, scheduled_at, duration_min, travel_buffer_min, status",
      )
      .eq("installer_lead_id", leadId)
      .maybeSingle<
        Pick<
          MeetingRow,
          "id" | "scheduled_at" | "duration_min" | "travel_buffer_min" | "status"
        >
      >(),
    admin
      .from("installers")
      .select("id, company_name")
      .eq("id", lead.installer_id)
      .maybeSingle<Pick<InstallerRow, "id" | "company_name">>(),
  ]);

  if (!meetingResult.data || !installerResult.data) {
    return { kind: "error", message: "Booking details missing" };
  }

  return {
    kind: "ok",
    leadId,
    token,
    installerName: installerResult.data.company_name,
    postcodeArea: postcodeArea(lead.property_postcode),
    scheduledAt: meetingResult.data.scheduled_at,
    durationMin: meetingResult.data.duration_min,
    travelBufferMin: meetingResult.data.travel_buffer_min,
    wantsHeatPump: lead.wants_heat_pump,
    wantsSolar: lead.wants_solar,
    wantsBattery: lead.wants_battery,
    alreadyAccepted:
      meetingResult.data.status === "booked" || lead.status === "visit_booked",
  };
}

function postcodeArea(postcode: string | null): string | null {
  if (!postcode) return null;
  const trimmed = postcode.trim().toUpperCase();
  if (trimmed.length === 0) return null;
  const outward = trimmed.split(/\s+/)[0];
  return outward.length > 0 ? outward : null;
}

function formatSlot(utcIso: string): {
  dayLabel: string;
  timeLabel: string;
  longDateLabel: string;
} {
  const d = new Date(utcIso);
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(d);
  const timeLabel = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/London",
  }).format(d);
  return {
    dayLabel,
    timeLabel,
    longDateLabel: `${dayLabel} at ${timeLabel}`,
  };
}

function listWants(hp: boolean, solar: boolean, battery: boolean): string {
  const parts: string[] = [];
  if (hp) parts.push("a heat pump");
  if (solar) parts.push("solar PV");
  if (battery) parts.push("a battery");
  if (parts.length === 0) return "energy upgrades";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

export default async function AcceptPage({
  searchParams,
}: {
  searchParams: Promise<{ lead?: string; token?: string }>;
}) {
  const params = await searchParams;
  const leadId = params.lead ?? "";
  const token = params.token ?? "";

  const state =
    leadId && token
      ? await loadState(leadId, token)
      : ({ kind: "invalid" } as const);

  return (
    <main className="min-h-screen bg-gradient-to-b from-cream-deep to-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white border border-[var(--border)] shadow-sm p-6 sm:p-8">
        {state.kind === "ok" ? (
          <AcceptForm state={state} />
        ) : (
          <ErrorState state={state} />
        )}
      </div>
    </main>
  );
}

function AcceptForm({ state }: { state: PageState }) {
  const slot = formatSlot(state.scheduledAt);
  const wants = listWants(
    state.wantsHeatPump,
    state.wantsSolar,
    state.wantsBattery,
  );

  if (state.alreadyAccepted) {
    return (
      <div className="text-center">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 text-xl font-bold bg-emerald-100 text-emerald-700">
          ✓
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
          You&rsquo;ve already accepted this lead
        </h1>
        <p className="mt-3 text-sm text-slate-600 leading-relaxed">
          The Google Calendar invite is already on its way and the
          homeowner has been notified. Their contact details are in the
          confirmation email we sent — just hit Reply to get the
          conversation going.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Back to Propertoasty
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral">
          Accept this lead
        </p>
        <h1 className="mt-1 text-xl font-bold text-navy leading-tight">
          {state.installerName}
        </h1>
      </div>

      <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4 mb-4 space-y-2">
        <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="Slot">
          <strong className="text-navy">{slot.longDateLabel}</strong>{" "}
          <span className="text-slate-500">
            ({state.durationMin} min visit + {state.travelBufferMin} min travel
            either side)
          </span>
        </Row>
        {state.postcodeArea && (
          <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Area">
            {state.postcodeArea}
          </Row>
        )}
        <Row icon={<Zap className="w-3.5 h-3.5" />} label="Wants">
          {wants}
        </Row>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-5">
        When you accept, we&rsquo;ll add the visit to your Google Calendar
        with the homeowner&rsquo;s full contact details, and email them the
        confirmation.
      </p>

      <form
        action="/api/installer-leads/acknowledge"
        method="POST"
        className="space-y-3"
      >
        <input type="hidden" name="lead" value={state.leadId} />
        <input type="hidden" name="token" value={state.token} />
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Accept this lead
        </button>
        <p className="text-[11px] text-slate-500 text-center">
          One click. Cost will be debited from your credit balance once
          billing goes live.
        </p>
      </form>
    </>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="shrink-0 inline-flex items-center justify-center w-6 h-6 rounded-md bg-white text-coral border border-coral/30">
        {icon}
      </span>
      <span className="flex-1">
        <span className="text-xs text-coral-dark font-semibold uppercase tracking-wider mr-1.5">
          {label}
        </span>
        <span className="text-slate-700">{children}</span>
      </span>
    </div>
  );
}

function ErrorState({
  state,
}: {
  state: { kind: "invalid" } | { kind: "expired" } | { kind: "error"; message: string };
}) {
  let title: string;
  let body: string;
  let tone: "warn" | "error";
  if (state.kind === "expired") {
    title = "This link has expired";
    body =
      "The accept link is no longer valid. The booking is still in our system — reply to the original email to get in touch with the homeowner directly.";
    tone = "warn";
  } else if (state.kind === "invalid") {
    title = "Hmm, this link isn't quite right";
    body =
      "The accept link looks broken or has been tampered with. Try opening it from the original email message. Still stuck? Reply to that email and we'll sort it.";
    tone = "warn";
  } else {
    title = "Something went wrong";
    body = state.message;
    tone = "error";
  }

  return (
    <div className="text-center">
      <span
        className={`inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 text-xl font-bold ${
          tone === "warn" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"
        }`}
      >
        {tone === "warn" ? "?" : "!"}
      </span>
      <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
        {title}
      </h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{body}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Back to Propertoasty
      </Link>
    </div>
  );
}
