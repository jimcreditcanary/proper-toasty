// /lead/accept — confirmation page that the "Accept this lead"
// link in the pending-installer email points at.
//
// PR-C3.2 redesign:
//
//   - No login required. The HMAC token in the URL is the auth — if
//     you got the email, you have permission to act on this lead.
//     Same trust model as any magic-link system.
//
//   - "The installer's account" is identified by email match between
//     `installers.email` (where the lead was sent) and `users.email`.
//     The user owning the matching email is whose credits get debited.
//     Until F2 (proper claim flow) installs a real `installer.user_id`
//     binding, this is the bridge.
//
//   - Three distinct actions, three buttons. Each is a separate form
//     POST so HTML alone routes the action — no JS required.
//
//       1. Accept the slot                  (action=accept)
//          Calendar invite + confirmed emails fire as before.
//
//       2. Take the lead, reschedule        (action=reschedule)
//          Same credit cost, but the meeting is cancelled (slot
//          freed). Installer gets contact details via the confirmed
//          email; homeowner gets a "they want to take it but
//          rescheduling — here's how to reach them" note.
//
//       3. Decline                          (action=decline)
//          No credit debit. Meeting + lead cancelled, slot freed.
//          Homeowner gets a "they couldn't take this — here are X
//          other installers nearby" email with a one-click link
//          back to their report.
//
// ── Why an interstitial page? (still applies) ──────────────────────────
// Outlook / Microsoft Defender / corporate email security gateways
// pre-fetch every URL in incoming email. If our acknowledge endpoint
// did its work on GET, the prefetch would auto-accept (or auto-decline)
// before the installer even saw the email. Forms aren't auto-submitted
// — that's how we stop the prefetch attack.

import Link from "next/link";
import {
  CalendarDays,
  Clock,
  MapPin,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyLeadAckToken } from "@/lib/email/tokens";
import {
  LEAD_ACCEPT_COST_CREDITS,
  effectiveLeadAcceptCost,
} from "@/lib/booking/credits";
import { resolveInstallerProfile } from "@/lib/installer-claim/resolve-profile";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];
type MeetingRow = Database["public"]["Tables"]["installer_meetings"]["Row"];
type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

interface BookingFacts {
  leadId: string;
  token: string;
  installerId: number;
  installerName: string;
  installerEmail: string | null;
  postcodeArea: string | null;
  scheduledAt: string;
  durationMin: number;
  travelBufferMin: number;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}

type State =
  | { kind: "invalid" }
  | { kind: "expired" }
  | { kind: "error"; message: string }
  | { kind: "already-accepted"; facts: BookingFacts }
  | { kind: "already-declined"; facts: BookingFacts }
  | {
      // No user account exists with the installer's email — they need
      // to sign up first. Decline is still available (free, no
      // account needed).
      kind: "needs-claim";
      facts: BookingFacts;
    }
  | {
      // User exists but doesn't have enough credits. Top-up requires
      // login (Stripe etc.); decline is still available.
      kind: "needs-topup";
      facts: BookingFacts;
      currentEmail: string;
      creditsHave: number;
      costCredits: number;
    }
  | {
      // All three actions available.
      kind: "ready";
      facts: BookingFacts;
      currentEmail: string;
      creditsHave: number;
      costCredits: number;
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
      .select("id, company_name, email, user_id, sponsored_until")
      .eq("id", lead.installer_id)
      .maybeSingle<
        Pick<
          InstallerRow,
          "id" | "company_name" | "email" | "user_id" | "sponsored_until"
        >
      >(),
  ]);

  if (!meetingResult.data || !installerResult.data) {
    return { kind: "error", message: "Booking details missing" };
  }

  const facts: BookingFacts = {
    leadId,
    token,
    installerId: installerResult.data.id,
    installerName: installerResult.data.company_name,
    installerEmail: installerResult.data.email,
    postcodeArea: postcodeArea(lead.property_postcode),
    scheduledAt: meetingResult.data.scheduled_at,
    durationMin: meetingResult.data.duration_min,
    travelBufferMin: meetingResult.data.travel_buffer_min,
    wantsHeatPump: lead.wants_heat_pump,
    wantsSolar: lead.wants_solar,
    wantsBattery: lead.wants_battery,
  };

  // ── Terminal states ──────────────────────────────────────────────
  if (
    meetingResult.data.status === "booked" ||
    lead.status === "visit_booked" ||
    lead.status === "installer_acknowledged"
  ) {
    return { kind: "already-accepted", facts };
  }
  if (
    meetingResult.data.status === "cancelled" ||
    lead.status === "cancelled" ||
    lead.status === "closed_lost"
  ) {
    return { kind: "already-declined", facts };
  }

  // ── Identify the installer's user account ────────────────────────
  // Two paths in priority order:
  //
  //   1. F2 binding: installers.user_id is set after the installer
  //      claims their profile via /installer-signup. This is the
  //      durable, intended attribution.
  //
  //   2. Email-match fallback: installers.email matches users.email.
  //      Bridge for unclaimed installers / test data — kept until
  //      F2 has rolled out for a few weeks then dropped.
  //
  // If neither matches, render the "claim your profile" CTA so the
  // installer can sign up before accepting.
  const profile = await resolveInstallerProfile({
    admin,
    boundUserId: installerResult.data.user_id ?? null,
    fallbackEmail: installerResult.data.email,
  });

  if (!profile || profile.blocked) {
    return { kind: "needs-claim", facts };
  }

  console.log("[lead/accept] gate decision", {
    leadId,
    matched_user_id: profile.id,
    matched_user_email: profile.email,
    via: profile.via,
    credits: profile.credits,
  });

  const costCredits = effectiveLeadAcceptCost(
    installerResult.data.sponsored_until,
  );

  if (profile.credits < costCredits) {
    return {
      kind: "needs-topup",
      facts,
      currentEmail: profile.email,
      creditsHave: profile.credits,
      costCredits,
    };
  }

  return {
    kind: "ready",
    facts,
    currentEmail: profile.email,
    creditsHave: profile.credits,
    costCredits,
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
    case "already-declined":
      return <AlreadyDeclined facts={state.facts} />;
    case "needs-claim":
      return <NeedsClaim state={state} />;
    case "needs-topup":
      return <NeedsTopup state={state} />;
    case "ready":
      return <Ready state={state} />;
  }
}

// ─── Ready (all three actions) ────────────────────────────────────────

function Ready({
  state,
}: {
  state: {
    facts: BookingFacts;
    currentEmail: string;
    creditsHave: number;
    costCredits: number;
  };
}) {
  const { facts } = state;
  const slot = formatSlot(facts.scheduledAt);
  const wants = listWants(
    facts.wantsHeatPump,
    facts.wantsSolar,
    facts.wantsBattery,
  );
  const isSponsored = state.costCredits > LEAD_ACCEPT_COST_CREDITS;

  return (
    <>
      <Header pillText="Lead waiting" title={facts.installerName} />
      <SignedInPill email={state.currentEmail} credits={state.creditsHave} />
      <BookingFactsCard facts={facts} slot={slot} wants={wants} />

      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Three options. Accepting either way debits{" "}
        <strong className="text-navy">
          {state.costCredits} credits
        </strong>{" "}
        and unlocks the homeowner&rsquo;s contact details.
        {isSponsored ? (
          <span className="block text-xs text-coral-dark mt-1">
            Sponsored placement is active — lead acceptance costs{" "}
            {state.costCredits} credits instead of the standard{" "}
            {LEAD_ACCEPT_COST_CREDITS}.
          </span>
        ) : null}
      </p>

      <ActionButton
        action="accept"
        leadId={facts.leadId}
        token={facts.token}
        primary
        icon={<ShieldCheck className="w-4 h-4" />}
      >
        Accept this slot
      </ActionButton>

      <ActionButton
        action="reschedule"
        leadId={facts.leadId}
        token={facts.token}
        icon={<Clock className="w-4 h-4" />}
      >
        Take the lead, but reschedule
      </ActionButton>

      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 mb-3 px-1">
        Frees the slot. We send the homeowner your contact details so
        you can sort a new time directly.
      </p>

      <DeclineButton leadId={facts.leadId} token={facts.token} />
    </>
  );
}

// ─── Needs top-up ─────────────────────────────────────────────────────

function NeedsTopup({
  state,
}: {
  state: {
    facts: BookingFacts;
    currentEmail: string;
    creditsHave: number;
    costCredits: number;
  };
}) {
  const { facts } = state;
  const slot = formatSlot(facts.scheduledAt);
  const wants = listWants(
    facts.wantsHeatPump,
    facts.wantsSolar,
    facts.wantsBattery,
  );
  const shortBy = state.costCredits - state.creditsHave;
  return (
    <>
      <Header pillText="Top up to accept" title={facts.installerName} />
      <SignedInPill email={state.currentEmail} credits={state.creditsHave} />
      <BookingFactsCard facts={facts} slot={slot} wants={wants} />

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-4 text-sm leading-relaxed">
        <p className="font-semibold text-amber-900">
          You&rsquo;re {shortBy} credit{shortBy === 1 ? "" : "s"} short.
        </p>
        <p className="text-amber-900 mt-1">
          Accepting this lead costs {state.costCredits} credits. Sign
          in to top up and come straight back to this page.
        </p>
      </div>

      <Link
        href="/installer/credits"
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Sign in &amp; buy credits
      </Link>
      <p className="mt-2 mb-4 text-[11px] text-slate-500 text-center">
        We&rsquo;ll hold the slot for you for 24 hours from when the
        homeowner booked.
      </p>

      <p className="text-xs text-slate-500 mb-2 text-center">
        Not interested?
      </p>
      <DeclineButton leadId={facts.leadId} token={facts.token} />
    </>
  );
}

// ─── Needs claim (no Propertoasty account yet) ────────────────────────

function NeedsClaim({ state }: { state: { facts: BookingFacts } }) {
  const { facts } = state;
  const slot = formatSlot(facts.scheduledAt);
  const wants = listWants(
    facts.wantsHeatPump,
    facts.wantsSolar,
    facts.wantsBattery,
  );
  // Deep-link to the F2 signup page with the installer ID baked in,
  // so they don't have to search for themselves. Email pre-fill is
  // appended when we have one on file.
  const signupQs = new URLSearchParams({ id: String(facts.installerId) });
  if (facts.installerEmail) signupQs.set("email", facts.installerEmail);
  return (
    <>
      <Header pillText="Claim your installer profile" title={facts.installerName} />
      <BookingFactsCard facts={facts} slot={slot} wants={wants} />

      <p className="text-sm text-slate-600 leading-relaxed mb-4">
        Looks like nobody&rsquo;s claimed{" "}
        <strong className="text-navy">{facts.installerName}</strong>{" "}
        on Propertoasty yet. Set up your account in under a minute and
        come back to accept this lead.
      </p>

      <Link
        href={`/installer-signup?${signupQs.toString()}`}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Claim your profile
      </Link>
      <p className="mt-2 mb-4 text-[11px] text-slate-500 text-center">
        We&rsquo;ve already linked this signup to your MCS record.
        You just need to confirm your email and set a password.
      </p>

      <p className="text-xs text-slate-500 mb-2 text-center">
        Not your area? Not interested?
      </p>
      <DeclineButton leadId={facts.leadId} token={facts.token} />
    </>
  );
}

// ─── Already accepted / declined (terminal) ───────────────────────────

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
        Calendar invite is on its way and the homeowner has been
        notified. Their contact details are in the confirmation email
        we sent.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Booking: {facts.installerName} ·{" "}
        {formatSlot(facts.scheduledAt).longDateLabel}
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

function AlreadyDeclined({ facts }: { facts: BookingFacts }) {
  return (
    <div className="text-center">
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5 text-xl font-bold bg-slate-100 text-slate-700">
        <XCircle className="w-6 h-6" />
      </span>
      <h1 className="text-xl sm:text-2xl font-bold text-navy leading-tight">
        This lead has been closed
      </h1>
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">
        Either you (or someone with the link) declined this lead.
        We&rsquo;ve let the homeowner know and pointed them at other
        installers.
      </p>
      <p className="mt-2 text-xs text-slate-500">
        Was: {facts.installerName} ·{" "}
        {formatSlot(facts.scheduledAt).longDateLabel}
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

// ─── Shared chrome ────────────────────────────────────────────────────

function SignedInPill({
  email,
  credits,
}: {
  email: string;
  credits: number;
}) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 mb-4 text-xs text-slate-600 leading-relaxed">
      Account on file: <strong className="text-navy">{email}</strong>{" "}
      <span className="text-slate-400">·</span>{" "}
      Balance:{" "}
      <strong
        className={
          credits >= LEAD_ACCEPT_COST_CREDITS
            ? "text-emerald-700"
            : "text-amber-700"
        }
      >
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

function ActionButton({
  action,
  leadId,
  token,
  children,
  icon,
  primary,
}: {
  action: "accept" | "reschedule" | "decline";
  leadId: string;
  token: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  primary?: boolean;
}) {
  const cls = primary
    ? "bg-coral hover:bg-coral-dark text-white"
    : "bg-white border border-slate-200 hover:border-coral/40 text-navy";
  return (
    <form
      action="/api/installer-leads/acknowledge"
      method="POST"
      className="mb-3"
    >
      <input type="hidden" name="lead" value={leadId} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="action" value={action} />
      <button
        type="submit"
        className={`w-full inline-flex items-center justify-center gap-2 h-12 rounded-full font-semibold text-sm shadow-sm transition-colors ${cls}`}
      >
        {icon}
        {children}
      </button>
    </form>
  );
}

function DeclineButton({ leadId, token }: { leadId: string; token: string }) {
  return (
    <form action="/api/installer-leads/acknowledge" method="POST">
      <input type="hidden" name="lead" value={leadId} />
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="action" value="decline" />
      <button
        type="submit"
        className="w-full inline-flex items-center justify-center gap-2 h-11 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline"
      >
        <XCircle className="w-3.5 h-3.5" />
        Decline this lead
      </button>
      <p className="text-[11px] text-slate-500 leading-relaxed mt-1 text-center">
        No charge. We let the homeowner know and point them at other
        nearby installers.
      </p>
    </form>
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
