// /lead/accept — confirmation page that the "Accept this lead"
// link in the pending-installer email points at.
//
// Lives under /lead/* (not /installer/*) so the installer-portal
// layout's role-gate redirect doesn't block unauthenticated
// magic-link access. Auth checks happen here on the page.
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
// happens. Email scanners don't submit forms.
//
// ── Gates the accept button on (in order) ─────────────────────────────
//   1. HMAC token validates
//   2. Caller is signed in
//   3. Caller has `installer` (or `admin`) role
//   4. Caller has at least LEAD_ACCEPT_COST_CREDITS credits on file
// Each gate renders its own friendly explainer + next-step CTA.

import Link from "next/link";
import { CalendarDays, MapPin, ShieldCheck, Zap } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { verifyLeadAckToken } from "@/lib/email/tokens";
import { LEAD_ACCEPT_COST_CREDITS } from "@/lib/booking/credits";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];
type MeetingRow = Database["public"]["Tables"]["installer_meetings"]["Row"];
type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface BookingFacts {
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
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "error"; message: string }
  | { kind: "already-accepted"; facts: BookingFacts }
  | {
      kind: "needs-login";
      facts: BookingFacts;
      loginUrl: string;
    }
  | {
      kind: "needs-installer-role";
      facts: BookingFacts;
      currentEmail: string;
    }
  | {
      kind: "needs-credits";
      facts: BookingFacts;
      creditsHave: number;
      currentEmail: string;
    }
  | {
      kind: "ready";
      facts: BookingFacts;
      creditsHave: number;
      currentEmail: string;
    };

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
      .select("id, scheduled_at, duration_min, travel_buffer_min, status")
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

  const facts: BookingFacts = {
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

  if (facts.alreadyAccepted) {
    return { kind: "already-accepted", facts };
  }

  // ── Auth gate ─────────────────────────────────────────────────────
  // This must come AFTER the token / DB lookups so the link still
  // tells the installer they DO have a real lead waiting — they just
  // need to sign in first.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const next = `/lead/accept?lead=${encodeURIComponent(leadId)}&token=${encodeURIComponent(token)}`;
    return {
      kind: "needs-login",
      facts,
      loginUrl: `/auth/login?redirect=${encodeURIComponent(next)}`,
    };
  }

  // ── Role + credits gate ──────────────────────────────────────────
  const { data: profile } = await admin
    .from("users")
    .select("id, email, role, credits, blocked")
    .eq("id", user.id)
    .maybeSingle<{
      id: string;
      email: string;
      role: "admin" | "user" | "installer";
      credits: number;
      blocked: boolean;
    }>();
  // Diagnostic log — visible in Vercel logs every page render. Tells us
  // which auth user the page sees, alongside their public.users row.
  console.log("[lead/accept] gate decision", {
    leadId,
    auth_user_id: user.id,
    auth_email: user.email,
    public_users_id: profile?.id,
    public_email: profile?.email,
    role: profile?.role,
    credits: profile?.credits,
    blocked: profile?.blocked,
  });

  if (!profile) {
    return { kind: "error", message: "Account not found" };
  }
  if (profile.blocked) {
    return { kind: "error", message: "This account has been blocked" };
  }
  if (profile.role !== "installer" && profile.role !== "admin") {
    return {
      kind: "needs-installer-role",
      facts,
      currentEmail: profile.email,
    };
  }
  if (profile.credits < LEAD_ACCEPT_COST_CREDITS) {
    return {
      kind: "needs-credits",
      facts,
      creditsHave: profile.credits,
      currentEmail: profile.email,
    };
  }

  return {
    kind: "ready",
    facts,
    creditsHave: profile.credits,
    currentEmail: profile.email,
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
        {renderState(state)}
      </div>
    </main>
  );
}

function renderState(state: State) {
  switch (state.kind) {
    case "invalid":
    case "expired":
    case "error":
      return <ErrorState state={state} />;
    case "already-accepted":
      return <AlreadyAccepted facts={state.facts} />;
    case "needs-login":
      return <NeedsLogin state={state} />;
    case "needs-installer-role":
      return <NeedsInstallerRole state={state} />;
    case "needs-credits":
      return <NeedsCredits state={state} />;
    case "ready":
      return <ReadyForm state={state} />;
  }
}

// ─── Ready (all gates passed) ──────────────────────────────────────────

function ReadyForm({
  state,
}: {
  state: { facts: BookingFacts; creditsHave: number; currentEmail: string };
}) {
  const { facts } = state;
  const slot = formatSlot(facts.scheduledAt);
  const wants = listWants(
    facts.wantsHeatPump,
    facts.wantsSolar,
    facts.wantsBattery,
  );

  return (
    <>
      <Header pillText="Accept this lead" title={facts.installerName} />
      <SignedInPill email={state.currentEmail} credits={state.creditsHave} />
      <BookingFactsCard facts={facts} slot={slot} wants={wants} />

      <p className="text-sm text-slate-600 leading-relaxed mb-3">
        When you accept, we&rsquo;ll add the visit to your calendar with the
        homeowner&rsquo;s full contact details, debit{" "}
        <strong className="text-navy">
          {LEAD_ACCEPT_COST_CREDITS} credits
        </strong>{" "}
        from your balance ({state.creditsHave} remaining), and email the
        homeowner to confirm.
      </p>

      <form
        action="/api/installer-leads/acknowledge"
        method="POST"
        className="space-y-3"
      >
        <input type="hidden" name="lead" value={facts.leadId} />
        <input type="hidden" name="token" value={facts.token} />
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <ShieldCheck className="w-4 h-4" />
          Accept this lead
        </button>
      </form>
    </>
  );
}

// ─── Already accepted (idempotent re-click) ───────────────────────────

function AlreadyAccepted({ facts }: { facts: BookingFacts }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 text-xl font-bold bg-emerald-100 text-emerald-700">
        ✓
      </span>
      <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
        You&rsquo;ve already accepted this lead
      </h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Calendar invite is already on its way and the homeowner has been
        notified. Their contact details are in the confirmation email we
        sent — just hit Reply to get the conversation going.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Booking: {facts.installerName} · {formatSlot(facts.scheduledAt).longDateLabel}
      </p>
      <Link
        href="/installer"
        className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Go to installer portal
      </Link>
    </div>
  );
}

// ─── Gates ────────────────────────────────────────────────────────────

function NeedsLogin({
  state,
}: {
  state: { facts: BookingFacts; loginUrl: string };
}) {
  return (
    <>
      <Header pillText="Sign in to accept" title={state.facts.installerName} />
      <p className="text-sm text-slate-600 leading-relaxed mb-5">
        You&rsquo;ve got a lead waiting — please sign in to your installer
        account to review the slot, debit credits, and confirm.
      </p>
      <Link
        href={state.loginUrl}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Sign in to continue
      </Link>
      <p className="mt-3 text-[11px] text-slate-500 text-center">
        We&rsquo;ll bring you straight back here once you&rsquo;re in.
      </p>
    </>
  );
}

function NeedsInstallerRole({
  state,
}: {
  state: { facts: BookingFacts; currentEmail: string };
}) {
  return (
    <>
      <Header
        pillText="Verify your installer profile"
        title={state.facts.installerName}
      />
      <p className="text-sm text-slate-600 leading-relaxed mb-5">
        You&rsquo;re signed in as{" "}
        <strong className="text-navy">{state.currentEmail}</strong>, but
        your account isn&rsquo;t linked to an installer profile yet. Claim
        your record by searching for your MCS number, company name or
        company number — pre-fills everything we have on file.
      </p>
      <Link
        href="/installer-signup"
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Claim my installer profile
      </Link>
      <p className="mt-3 text-[11px] text-slate-500 text-center">
        Approval takes a few minutes if we&rsquo;ve got you on file. Manual
        review otherwise.
      </p>
    </>
  );
}

function NeedsCredits({
  state,
}: {
  state: { facts: BookingFacts; creditsHave: number; currentEmail: string };
}) {
  const slot = formatSlot(state.facts.scheduledAt);
  const wants = listWants(
    state.facts.wantsHeatPump,
    state.facts.wantsSolar,
    state.facts.wantsBattery,
  );
  const shortBy = LEAD_ACCEPT_COST_CREDITS - state.creditsHave;
  return (
    <>
      <Header pillText="Top up to accept" title={state.facts.installerName} />
      <SignedInPill email={state.currentEmail} credits={state.creditsHave} />
      <BookingFactsCard facts={state.facts} slot={slot} wants={wants} />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm leading-relaxed">
        <p className="font-semibold text-amber-900">
          You&rsquo;re {shortBy} credit{shortBy === 1 ? "" : "s"} short.
        </p>
        <p className="text-amber-900 mt-1">
          Accepting a lead costs {LEAD_ACCEPT_COST_CREDITS} credits. You
          currently have <strong>{state.creditsHave}</strong>. Top up below
          and come straight back to this page to accept.
        </p>
      </div>

      <Link
        href="/installer/credits"
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Buy credits
      </Link>
      <p className="mt-3 text-[11px] text-slate-500 text-center">
        We&rsquo;ll hold the slot for you for 24 hours from when the
        homeowner booked.
      </p>
    </>
  );
}

// ─── Shared chrome ────────────────────────────────────────────────────

// Surface the currently-signed-in account so testers can immediately
// spot account-mismatch issues (e.g. they're logged in as a different
// auth user than the one they SQL-updated). Visible on the gate views
// where the credit balance matters.
function SignedInPill({
  email,
  credits,
}: {
  email: string;
  credits: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-4 text-xs text-slate-600 leading-relaxed">
      Signed in as <strong className="text-navy">{email}</strong>{" "}
      <span className="text-slate-400">·</span>{" "}
      Balance:{" "}
      <strong className={credits >= 5 ? "text-emerald-700" : "text-amber-700"}>
        {credits} credit{credits === 1 ? "" : "s"}
      </strong>
    </div>
  );
}

function Header({ pillText, title }: { pillText: string; title: string }) {
  return (
    <div className="text-center mb-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-coral">
        {pillText}
      </p>
      <h1 className="mt-1 text-xl font-bold text-navy leading-tight">
        {title}
      </h1>
    </div>
  );
}

function BookingFactsCard({
  facts,
  slot,
  wants,
}: {
  facts: BookingFacts;
  slot: { longDateLabel: string };
  wants: string;
}) {
  return (
    <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4 mb-4 space-y-2">
      <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="Slot">
        <strong className="text-navy">{slot.longDateLabel}</strong>{" "}
        <span className="text-slate-500">
          ({facts.durationMin} min visit + {facts.travelBufferMin} min travel
          either side)
        </span>
      </Row>
      {facts.postcodeArea && (
        <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Area">
          {facts.postcodeArea}
        </Row>
      )}
      <Row icon={<Zap className="w-3.5 h-3.5" />} label="Wants">
        {wants}
      </Row>
    </div>
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
  state:
    | { kind: "invalid" }
    | { kind: "expired" }
    | { kind: "error"; message: string };
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
