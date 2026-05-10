// /installer/leads — installer-side inbox of every lead routed to
// this installer.
//
// Server-rendered. Tabs by status:
//
//   Pending   — status in ('new', 'sent_to_installer'). Needs an
//               accept/reschedule/decline. Each card carries an
//               "Open booking" link pointing at /lead/accept with
//               a fresh signed token, so the installer's existing
//               accept-page UX is the single source of truth for
//               actions (avoids duplicating the form here).
//
//   Accepted  — status in ('installer_acknowledged', 'visit_booked').
//               Homeowner contact details unlocked + visible inline.
//
//   Closed    — status in ('visit_completed', 'closed_won',
//               'closed_lost', 'cancelled'). Read-only history.
//
// Auto-released leads (cancelled with auto_released_at set) get a
// distinct badge so the installer can tell at a glance which
// closures were "I declined" vs "the cron released it".

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { signLeadAckToken } from "@/lib/email/tokens";
import {
  Inbox,
  Mail,
  Phone,
  CalendarDays,
  MapPin,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ArrowRight,
  UserPlus,
} from "lucide-react";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type LeadRow = Database["public"]["Tables"]["installer_leads"]["Row"];
type MeetingRow = Database["public"]["Tables"]["installer_meetings"]["Row"];
type ProposalRow = Database["public"]["Tables"]["installer_proposals"]["Row"];

// The latest proposal for a lead — captured here so the badge can
// switch to "Quote sent" / "Quote accepted" / "Quote declined" once
// the installer's started the quoting workflow. Only the fields the
// badge uses are pulled, to keep the SELECT narrow.
type LatestProposal = Pick<ProposalRow, "id" | "status" | "sent_at" | "accepted_at" | "declined_at" | "updated_at">;

type StatusKey = "pending" | "accepted" | "closed";
const TABS: { key: StatusKey; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "accepted", label: "Accepted" },
  { key: "closed", label: "Closed" },
];

function isStatusKey(s: string | undefined): s is StatusKey {
  return s === "pending" || s === "accepted" || s === "closed";
}

const STATUS_BUCKETS: Record<StatusKey, LeadRow["status"][]> = {
  pending: ["new", "sent_to_installer"],
  accepted: ["installer_acknowledged", "visit_booked"],
  closed: ["visit_completed", "closed_won", "closed_lost", "cancelled"],
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

interface LeadWithMeeting {
  lead: LeadRow;
  meeting: Pick<
    MeetingRow,
    "id" | "scheduled_at" | "duration_min" | "travel_buffer_min" | "status"
  > | null;
  proposal: LatestProposal | null;
}

async function loadInstallerId(): Promise<
  | { ok: true; installerId: number; companyName: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/leads");
  }
  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return { ok: false, error: "unbound" };
  }
  return {
    ok: true,
    installerId: installer.id,
    companyName: installer.company_name,
  };
}

async function loadCounts(installerId: number): Promise<Record<StatusKey, number>> {
  const admin = createAdminClient();
  const counts: Record<StatusKey, number> = {
    pending: 0,
    accepted: 0,
    closed: 0,
  };
  await Promise.all(
    (Object.keys(STATUS_BUCKETS) as StatusKey[]).map(async (key) => {
      const { count } = await admin
        .from("installer_leads")
        .select("id", { count: "exact", head: true })
        .eq("installer_id", installerId)
        .in("status", STATUS_BUCKETS[key]);
      counts[key] = count ?? 0;
    }),
  );
  return counts;
}

async function loadLeads(
  installerId: number,
  bucket: StatusKey,
): Promise<LeadWithMeeting[]> {
  const admin = createAdminClient();
  const { data: leads } = await admin
    .from("installer_leads")
    .select("*")
    .eq("installer_id", installerId)
    .in("status", STATUS_BUCKETS[bucket])
    .order("created_at", { ascending: false })
    .limit(50);
  if (!leads || leads.length === 0) return [];

  // Pull meetings + proposals in parallel batches keyed by lead id.
  const ids = leads.map((l) => l.id);
  const [meetingsRes, proposalsRes] = await Promise.all([
    admin
      .from("installer_meetings")
      .select("id, installer_lead_id, scheduled_at, duration_min, travel_buffer_min, status")
      .in("installer_lead_id", ids),
    admin
      .from("installer_proposals")
      .select("id, installer_lead_id, status, sent_at, accepted_at, declined_at, updated_at")
      .in("installer_lead_id", ids)
      .order("updated_at", { ascending: false }),
  ]);

  const meetingsByLead = new Map<string, LeadWithMeeting["meeting"]>();
  for (const m of meetingsRes.data ?? []) {
    if (!m.installer_lead_id) continue;
    meetingsByLead.set(m.installer_lead_id, {
      id: m.id,
      scheduled_at: m.scheduled_at,
      duration_min: m.duration_min,
      travel_buffer_min: m.travel_buffer_min,
      status: m.status,
    });
  }

  // Newest proposal per lead — Map.set keeps the first-seen for a key
  // when iterating in order, so we walk the already-DESC-sorted rows
  // and only set if not already set.
  const proposalByLead = new Map<string, LatestProposal>();
  for (const p of proposalsRes.data ?? []) {
    if (!p.installer_lead_id) continue;
    if (proposalByLead.has(p.installer_lead_id)) continue;
    proposalByLead.set(p.installer_lead_id, {
      id: p.id,
      status: p.status,
      sent_at: p.sent_at,
      accepted_at: p.accepted_at,
      declined_at: p.declined_at,
      updated_at: p.updated_at,
    });
  }

  return (leads as LeadRow[]).map((lead) => ({
    lead,
    meeting: meetingsByLead.get(lead.id) ?? null,
    proposal: proposalByLead.get(lead.id) ?? null,
  }));
}

export default async function LeadsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status: StatusKey = isStatusKey(params.status) ? params.status : "pending";

  const auth = await loadInstallerId();
  if (!auth.ok) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Leads"
        pageSubtitle="See every booking request routed to you in one place."
        backLink={{ href: "/installer", label: "Back to installer portal" }}
      >
        <UnboundState />
      </PortalShell>
    );
  }

  const [counts, leads] = await Promise.all([
    loadCounts(auth.installerId),
    loadLeads(auth.installerId, status),
  ]);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Leads"
      pageSubtitle="Accept or reject site-visit requests. 5 credits per accepted lead."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {/* Status tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {TABS.map((t) => {
          const active = t.key === status;
          return (
            <Link
              key={t.key}
              href={`/installer/leads?status=${t.key}`}
              className={`inline-flex items-center gap-2 h-9 px-4 rounded-full text-sm font-medium transition-colors ${
                active
                  ? "bg-coral text-white shadow-sm"
                  : "bg-white border border-slate-200 text-slate-700 hover:border-coral/40"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold ${
                  active
                    ? "bg-white/20 text-white"
                    : t.key === "pending" && counts[t.key] > 0
                      ? "bg-coral text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {counts[t.key]}
              </span>
            </Link>
          );
        })}
      </div>

      {leads.length === 0 ? (
        <EmptyState bucket={status} />
      ) : (
        <ul className="space-y-3">
          {leads.map(({ lead, meeting, proposal }) => (
            <li key={lead.id}>
              <LeadCard
                lead={lead}
                meeting={meeting}
                proposal={proposal}
                bucket={status}
              />
            </li>
          ))}
        </ul>
      )}
    </PortalShell>
  );
}

// ─── Card ────────────────────────────────────────────────────────────

function LeadCard({
  lead,
  meeting,
  proposal,
  bucket,
}: {
  lead: LeadRow;
  meeting: LeadWithMeeting["meeting"];
  proposal: LatestProposal | null;
  bucket: StatusKey;
}) {
  const wants = listWants(
    lead.wants_heat_pump,
    lead.wants_solar,
    lead.wants_battery,
  );
  const slot = meeting?.scheduled_at ? formatSlot(meeting.scheduled_at) : null;
  const acceptUrl = `/lead/accept?lead=${encodeURIComponent(lead.id)}&token=${encodeURIComponent(signLeadAckToken(lead.id))}`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy">
            {lead.contact_name ?? "Homeowner"}
            {lead.property_postcode && (
              <span className="text-slate-400 font-normal text-xs ml-2">
                · {postcodeArea(lead.property_postcode)}
              </span>
            )}
            {lead.pre_survey_request_id && (
              <span
                className="inline-flex items-center gap-1 ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-coral-pale text-coral-dark border border-coral/20"
                title="You sent this customer a pre-survey link — they completed the check and the lead came back to you."
              >
                <UserPlus className="w-2.5 h-2.5" />
                You requested
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {lead.pre_survey_request_id ? "Completed " : "Booked "}
            {formatRelative(lead.created_at)}
          </p>
        </div>
        <StatusBadge lead={lead} meeting={meeting} proposal={proposal} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[160px,1fr] gap-x-4 gap-y-2 text-sm mb-4">
        {slot && (
          <Row icon={<CalendarDays className="w-3.5 h-3.5" />} label="Slot">
            <strong className="text-navy">{slot.longDateLabel}</strong>{" "}
            <span className="text-slate-500">
              ({meeting!.duration_min} min)
            </span>
          </Row>
        )}
        <Row icon={<Zap className="w-3.5 h-3.5" />} label="Wants">
          {wants}
        </Row>
        {lead.property_postcode && (
          <Row icon={<MapPin className="w-3.5 h-3.5" />} label="Postcode">
            {lead.property_postcode}
          </Row>
        )}
        {bucket !== "pending" && lead.contact_email && (
          <Row icon={<Mail className="w-3.5 h-3.5" />} label="Email">
            <a
              href={`mailto:${lead.contact_email}`}
              className="text-coral hover:text-coral-dark underline"
            >
              {lead.contact_email}
            </a>
          </Row>
        )}
        {bucket !== "pending" && lead.contact_phone && (
          <Row icon={<Phone className="w-3.5 h-3.5" />} label="Phone">
            <a
              href={`tel:${lead.contact_phone}`}
              className="text-coral hover:text-coral-dark underline"
            >
              {lead.contact_phone}
            </a>
          </Row>
        )}
        {bucket !== "pending" && lead.notes && (
          <Row icon={<Inbox className="w-3.5 h-3.5" />} label="Notes">
            <span className="whitespace-pre-wrap text-slate-700">
              {lead.notes}
            </span>
          </Row>
        )}
      </div>

      {bucket === "pending" ? (
        <Link
          href={acceptUrl}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
        >
          Open booking
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      ) : bucket === "accepted" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/installer/reports/${lead.id}`}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
          >
            View pre-survey report
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/installer/leads/${lead.id}/propose`}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-coral hover:bg-coral-pale text-coral-dark font-semibold text-xs transition-colors"
          >
            Send quote
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <p className="text-[11px] text-slate-500 leading-relaxed flex-1 min-w-[200px]">
            Reply to the original confirmation email to reach the
            homeowner — your reply lands directly in their inbox.
          </p>
        </div>
      ) : bucket === "closed" ? (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/installer/reports/${lead.id}`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            View pre-survey report
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            href={`/installer/leads/${lead.id}/propose`}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            Send quote
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}

// Lead-lifecycle badge. Renders the most-progressed signal across:
//   1. lead.status                 (terminal closures)
//   2. proposal.status             (sent / accepted / declined)
//   3. meeting/lead intermediates  (visit_booked, visit_completed)
//
// Order matters: a closed_won always reads "Won" even if there's a
// stale "sent" proposal hanging around. Inside the open lifecycle,
// proposal status is the most-progressed signal.
function StatusBadge({
  lead,
  meeting,
  proposal,
}: {
  lead: LeadRow;
  meeting: LeadWithMeeting["meeting"];
  proposal: LatestProposal | null;
}) {
  const { status, auto_released_at, pre_survey_request_id } = lead;
  // Tailwind classes per tone — kept inline to avoid a config map
  // for a one-place use.
  const cls = {
    amber: "bg-amber-100 text-amber-900",
    slate: "bg-slate-200 text-slate-700",
    sky: "bg-sky-100 text-sky-900",
    emerald: "bg-emerald-100 text-emerald-900",
    emeraldStrong: "bg-emerald-200 text-emerald-900",
    rose: "bg-rose-100 text-rose-900",
    coral: "bg-coral-pale text-coral-dark",
  } as const;

  function pill(tone: keyof typeof cls, icon: React.ReactNode, label: string) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${cls[tone]}`}
      >
        {icon}
        {label}
      </span>
    );
  }

  // 1. Terminal closures always win.
  if (status === "closed_won") {
    return pill("emeraldStrong", <CheckCircle2 className="w-3 h-3" />, "Won");
  }
  if (status === "closed_lost") {
    return pill("slate", <XCircle className="w-3 h-3" />, "Lost");
  }
  if (status === "cancelled") {
    return auto_released_at
      ? pill("amber", <Clock className="w-3 h-3" />, "Auto-released (24h)")
      : pill("slate", <XCircle className="w-3 h-3" />, "Cancelled");
  }

  // 2. Proposal-driven states (when there's an active quote).
  if (proposal) {
    if (proposal.status === "accepted") {
      return pill(
        "emeraldStrong",
        <CheckCircle2 className="w-3 h-3" />,
        "Quote accepted",
      );
    }
    if (proposal.status === "declined") {
      return pill("rose", <XCircle className="w-3 h-3" />, "Quote declined");
    }
    if (proposal.status === "sent") {
      return pill("coral", <Mail className="w-3 h-3" />, "Quote sent");
    }
    if (proposal.status === "draft") {
      return pill("sky", <Sparkles className="w-3 h-3" />, "Quote drafting");
    }
  }

  // 3. Open lead, no proposal yet — meeting + lead-status intermediates.
  if (status === "visit_completed") {
    return pill(
      "emerald",
      <CheckCircle2 className="w-3 h-3" />,
      "Visit completed",
    );
  }
  if (status === "visit_booked") {
    return pill(
      "emerald",
      <CalendarDays className="w-3 h-3" />,
      "Meeting booked",
    );
  }
  if (status === "installer_acknowledged") {
    // Disambiguate the previous "Taken — rescheduling" copy. For
    // pre-survey-origin leads where the customer hasn't booked a
    // slot yet, this is a "you accepted, no diary entry yet" state
    // — not a reschedule. For directory leads it usually means the
    // installer accepted via /lead/accept with action="reschedule".
    if (pre_survey_request_id) {
      return pill(
        "sky",
        <Sparkles className="w-3 h-3" />,
        "Lead taken — awaiting booking",
      );
    }
    if (meeting && meeting.status === "cancelled") {
      return pill(
        "sky",
        <Sparkles className="w-3 h-3" />,
        "Lead taken — rescheduling",
      );
    }
    return pill("sky", <Sparkles className="w-3 h-3" />, "Lead taken");
  }
  if (status === "new" || status === "sent_to_installer") {
    return pill(
      "amber",
      <Clock className="w-3 h-3" />,
      "Pending — needs response",
    );
  }

  // Defensive default for any future enum value we haven't taught
  // the badge about.
  return pill("slate", <XCircle className="w-3 h-3" />, status);
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
    <>
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <div className="text-sm text-slate-800 -mt-0.5 sm:mt-0">{children}</div>
    </>
  );
}

function EmptyState({ bucket }: { bucket: StatusKey }) {
  if (bucket === "pending") {
    // The most-trafficked empty state — and the one with the
    // clearest "what now" answer. Push to /pre-survey-requests
    // since installers can self-source leads instead of waiting
    // for the directory to route one in.
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-coral-pale text-coral-dark mb-3">
          <Inbox className="w-5 h-5" />
        </span>
        <p className="text-sm font-semibold text-navy">
          No pending leads — yet
        </p>
        <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
          We&rsquo;ll email you the moment one lands from the
          directory. Or get ahead of it — send a customer of yours
          a personalised check link and the lead routes straight to
          you.
        </p>
        <Link
          href="/installer/pre-survey-requests"
          className="inline-flex items-center gap-1.5 h-10 px-4 mt-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
        >
          Send your first check link
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    );
  }
  const copy =
    bucket === "accepted"
      ? "No active bookings. Accepted leads land here once you've taken the slot."
      : "Nothing closed yet. Completed visits, declined leads, and auto-released bookings show up here.";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 mb-3">
        <Inbox className="w-5 h-5" />
      </span>
      <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
        {copy}
      </p>
    </div>
  );
}

function UnboundState() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-amber-100 text-amber-700 mb-3">
        <Inbox className="w-5 h-5" />
      </span>
      <h2 className="text-lg font-semibold text-amber-900">
        Claim your installer profile first
      </h2>
      <p className="text-sm text-amber-900 mt-2 leading-relaxed max-w-md mx-auto">
        Your account isn&rsquo;t linked to an installer record yet, so we
        can&rsquo;t show your leads. Find your MCS profile and finish the
        claim, then come back here.
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

// ─── Helpers ─────────────────────────────────────────────────────────

function listWants(hp: boolean, solar: boolean, battery: boolean): string {
  const parts: string[] = [];
  if (hp) parts.push("Heat pump");
  if (solar) parts.push("Solar PV");
  if (battery) parts.push("Battery");
  if (parts.length === 0) return "Energy upgrades";
  return parts.join(" + ");
}

function formatSlot(utcIso: string): {
  dayLabel: string;
  timeLabel: string;
  longDateLabel: string;
} {
  const d = new Date(utcIso);
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
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

function postcodeArea(postcode: string): string {
  const trimmed = postcode.trim().toUpperCase();
  return trimmed.split(/\s+/)[0] || trimmed;
}

// "2 hours ago" / "3 days ago" — keeps the row terse. We don't need
// exact timestamps in the inbox; the slot date itself carries the
// when-it-matters info.
function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 60) return `${Math.max(mins, 1)} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  // Older than a month — fall back to a date.
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
