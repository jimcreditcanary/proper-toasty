import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Circle,
  Coins,
  CreditCard,
  FileEdit,
  FileText,
  Inbox,
  KeyRound,
  PoundSterling,
  Send,
  Sparkles,
  TrendingUp,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import {
  buildChecklist,
  type ChecklistResult,
} from "@/lib/installer-onboarding/checklist";
import { loadInstallerDashboardMetrics } from "@/lib/installer/dashboard-metrics";
import { formatGbp } from "@/lib/proposals/schema";
import { OnboardingDismissButton } from "@/components/installer/onboarding-dismiss-button";

// Installer portal landing — redesigned around deal-flow signal.
//
// The previous grid of nine equally-weighted feature tiles was
// noisy: every feature got the same screen weight regardless of
// whether the installer needed it today. The redesign splits the
// surface into three layers:
//
//   1. Onboarding wizard (kept) — hides automatically once the
//      installer has completed the four core setup steps.
//   2. Deal-flow tiles — what's happening right now (upcoming
//      meetings, this-month booked, quotes out / won, value of
//      pipeline). Plus a prominent credit balance + top-up card.
//   3. Quick nav strip — every feature reachable in one click,
//      compact, no body copy. The grid was duplicating navigation
//      as a marketing pitch; here it's just a way to get there.

interface NavLink {
  title: string;
  icon: LucideIcon;
  href: string;
  /** Coral pip on the right of the title. 0 hides it. */
  badge?: number;
}

export const dynamic = "force-dynamic";

export default async function InstallerHomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let failureReason: string | null = null;
  let pendingLeads = 0;
  let companyName: string | null = null;
  let checklist: ChecklistResult | null = null;
  let creditBalance = 0;
  let onboardingDismissedAt: string | null = null;
  // PT-DEBUG — surface the page-level read error to the HTML marker
  // because Vercel's runtime-logs UI keeps reporting "no logs" for
  // these requests. If profileRes.error is non-null, that error
  // explains why creditBalance silently defaults to 0 even though
  // the row exists with credits=30.
  let pageReadError: string | null = null;
  let pageReadDataKeys: string = "n/a";
  let metrics: Awaited<
    ReturnType<typeof loadInstallerDashboardMetrics>
  > | null = null;

  if (user) {
    const admin = createAdminClient();
    // Read public.users via the admin client (RLS-bypassed) — when
    // we did this through the user-scoped supabase client, an
    // accidentally-strict SELECT policy on public.users returned
    // empty rows for the freshly-claimed installer, surfacing as
    // "0 credits" on the dashboard despite the row carrying 30.
    // We've already authenticated the user above; the lookup is
    // keyed on user.id, so admin-keying the read is safe and
    // consistent with how we read public.installers next door.
    const [profileRes, installerRes] = await Promise.all([
      admin
        .from("users")
        .select(
          "auto_recharge_failed_at, auto_recharge_failure_reason, credits, installer_onboarding_dismissed_at",
        )
        .eq("id", user.id)
        .maybeSingle<{
          auto_recharge_failed_at: string | null;
          auto_recharge_failure_reason: string | null;
          credits: number;
          installer_onboarding_dismissed_at: string | null;
        }>(),
      admin
        .from("installers")
        .select("id, company_name")
        .eq("user_id", user.id)
        .maybeSingle<{ id: number; company_name: string }>(),
    ]);

    pageReadError = profileRes.error?.message ?? null;
    pageReadDataKeys = profileRes.data
      ? Object.keys(profileRes.data).join(",")
      : "data-is-null";

    if (profileRes.data?.auto_recharge_failed_at) {
      failureReason =
        profileRes.data.auto_recharge_failure_reason ?? "Card declined";
    }
    creditBalance = profileRes.data?.credits ?? 0;
    onboardingDismissedAt =
      profileRes.data?.installer_onboarding_dismissed_at ?? null;

    console.log("[PT-DEBUG-installer-dashboard] profile read", {
      userId: user.id,
      userEmail: user.email,
      profileFound: !!profileRes.data,
      profileError: profileRes.error?.message ?? null,
      creditBalance,
      buildSha: process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown",
    });

    if (installerRes.data) {
      companyName = installerRes.data.company_name;
      const installerId = installerRes.data.id;
      const [pendingRes, availabilityRes, preSurveyRes, proposalRes, dealMetrics] =
        await Promise.all([
          admin
            .from("installer_leads")
            .select("id", { count: "exact", head: true })
            .eq("installer_id", installerId)
            .in("status", ["new", "sent_to_installer"]),
          admin
            .from("installer_availability")
            .select("id", { count: "exact", head: true })
            .eq("installer_id", installerId),
          admin
            .from("installer_pre_survey_requests")
            .select("id", { count: "exact", head: true })
            .eq("installer_id", installerId),
          admin
            .from("installer_proposals")
            .select("id", { count: "exact", head: true })
            .eq("installer_id", installerId)
            .not("sent_at", "is", null),
          loadInstallerDashboardMetrics(admin, installerId),
        ]);
      pendingLeads = pendingRes.count ?? 0;
      checklist = buildChecklist({
        hasAvailability: (availabilityRes.count ?? 0) > 0,
        creditBalance,
        preSurveyRequestCount: preSurveyRes.count ?? 0,
        proposalSentCount: proposalRes.count ?? 0,
      });
      metrics = dealMetrics;
    }
  }

  // Nav strip — every feature, compact. Order roughly by frequency
  // of use: leads on the left (where the eye lands), credits + admin
  // bits on the right.
  const navLinks: NavLink[] = [
    { title: "Leads", icon: Inbox, href: "/installer/leads", badge: pendingLeads },
    { title: "Quotes", icon: Send, href: "/installer/proposals" },
    { title: "Reports", icon: FileText, href: "/installer/reports" },
    { title: "Pre-survey requests", icon: Zap, href: "/installer/pre-survey-requests" },
    { title: "Availability", icon: CalendarDays, href: "/installer/availability" },
    { title: "Performance", icon: TrendingUp, href: "/installer/performance" },
    { title: "Credits", icon: CreditCard, href: "/installer/credits" },
    { title: "Billing", icon: Wallet, href: "/installer/billing" },
    { title: "API access", icon: KeyRound, href: "/installer/api-access" },
  ];

  const pageTitle = companyName ?? "Welcome back";
  const pageSubtitle = companyName
    ? "Manage your availability, accept leads, and quote with confidence."
    : "Claim your installer profile to start accepting leads.";

  // TEMP — visible in "View Page Source" so we can verify what the
  // server actually rendered without depending on Vercel's logs UI.
  // Search for PT-DEBUG in the page source.
  //
  // serviceRoleSet tells us whether SUPABASE_SERVICE_ROLE_KEY is
  // actually present at runtime. If it shows "no", that's the smoking
  // gun for the "DB has 30, dashboard reads 0" bug — the admin client
  // falls back to the anon key, RLS blocks the read.
  // Decode the JWT role claim.
  const srKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  let jwtRole = "n/a";
  let jwtRef = "n/a";
  try {
    const middle = srKey.split(".")[1];
    if (middle) {
      const decoded = Buffer.from(middle, "base64").toString("utf-8");
      const json = JSON.parse(decoded) as { role?: string; ref?: string };
      jwtRole = json.role ?? "no-role-claim";
      jwtRef = json.ref ?? "no-ref-claim";
    }
  } catch {
    jwtRole = "decode-failed";
  }

  // Surface the host of NEXT_PUBLIC_SUPABASE_URL — the JWT.ref claim
  // identifies which Supabase project the key was issued for; the
  // URL host says which project the client is talking to. They MUST
  // match. Mismatch = key for project A but client pointed at project
  // B → PostgREST treats the JWT as anon (signature won't validate
  // against project B's secret) and the read is RLS-blocked.
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const urlHost = url.match(/https?:\/\/([^./]+)/)?.[1] ?? "unknown";

  // Real-world admin client tests. Dump:
  //   - adminUsersCount: total row count via service-role
  //   - allRows:         id+credits of every row (we know it's 1 row;
  //                      lets us see if the id matches user.id)
  //   - targetedRow:     result of the actual .eq("id", user.id)
  //                      query we use on the page — shows us whether
  //                      data is null (no match) or present
  let adminUsersCount: string = "n/a";
  let allRows: string = "n/a";
  let targetedRow: string = "n/a";
  try {
    const admin = createAdminClient();
    const { count, error } = await admin
      .from("users")
      .select("id", { count: "exact", head: true });
    adminUsersCount = error ? `err:${error.message}` : String(count ?? "null");

    const { data: dump, error: dumpErr } = await admin
      .from("users")
      .select("id, credits")
      .limit(5);
    allRows = dumpErr
      ? `err:${dumpErr.message}`
      : JSON.stringify(dump);

    if (user) {
      const { data: pData, error: pErr } = await admin
        .from("users")
        .select("id, credits, role")
        .eq("id", user.id)
        .maybeSingle();
      targetedRow = pErr
        ? `err:${pErr.message}`
        : JSON.stringify(pData);
    }
  } catch (e) {
    adminUsersCount = `threw:${e instanceof Error ? e.message : String(e)}`;
  }

  const debugBanner = `<!-- PT-DEBUG creditBalance=${creditBalance} userId=${user?.id ?? "no-user"} sha=${process.env.VERCEL_GIT_COMMIT_SHA ?? "unknown"} role=${jwtRole} jwtRef=${jwtRef} urlHost=${urlHost} adminUsersCount=${adminUsersCount} allRows=${allRows} targetedRow=${targetedRow} pageReadError=${pageReadError ?? "null"} pageReadDataKeys=${pageReadDataKeys} -->`;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle={pageTitle}
      pageSubtitle={pageSubtitle}
    >
      <div dangerouslySetInnerHTML={{ __html: debugBanner }} />
      {failureReason && (
        <Link
          href="/installer/credits"
          className="block rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 hover:border-amber-300 transition-colors"
        >
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900">
                Auto top-up didn&rsquo;t go through
              </p>
              <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                {failureReason}
              </p>
              <p className="text-xs text-amber-800 mt-1.5 font-medium">
                Top up manually to keep accepting leads →
              </p>
            </div>
          </div>
        </Link>
      )}

      {checklist && !checklist.isComplete && !onboardingDismissedAt && (
        <OnboardingChecklist checklist={checklist} companyName={companyName} />
      )}

      {/* ─── Credits card — pulled out of the metrics grid because
          it's the only one with a CTA and the action is high-stakes
          (running out kills lead acceptance). Full-width, action on
          the right, balance on the left. ───────────────────────── */}
      {companyName && (
        <CreditCardBlock
          balance={creditBalance}
          autoRechargeFailed={Boolean(failureReason)}
        />
      )}

      {/* ─── Deal-flow metrics ─────────────────────────────────── */}
      {companyName && metrics && (
        <DealFlowGrid metrics={metrics} pendingLeads={pendingLeads} />
      )}

      {/* ─── Quick nav strip ───────────────────────────────────── */}
      {companyName && <QuickNav links={navLinks} />}

      {/* If they don't have a bound installer profile yet (between
          signup and claim), the rest of the page is empty — nothing
          to show until claim completes. The onboarding wizard above
          will already be prompting them to finish. */}
    </PortalShell>
  );
}

// ─── Credits card ──────────────────────────────────────────────────

function CreditCardBlock({
  balance,
  autoRechargeFailed,
}: {
  balance: number;
  autoRechargeFailed: boolean;
}) {
  const low = balance <= 10;
  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 mb-6 flex flex-col sm:flex-row sm:items-center gap-4 ${
        autoRechargeFailed
          ? "border-amber-200 bg-amber-50/40"
          : low
            ? "border-amber-200 bg-amber-50/30"
            : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <span className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-xl bg-coral-pale text-coral-dark">
          <Coins className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Available
          </p>
          <p className="text-3xl font-bold text-navy leading-tight">
            {balance.toLocaleString("en-GB")} credit{balance === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            5 credits per accepted lead · 1 credit per pre-survey send
          </p>
        </div>
      </div>
      <Link
        href="/installer/credits"
        className="shrink-0 inline-flex items-center justify-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Top up
        <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

// ─── Deal-flow metrics grid ────────────────────────────────────────

function DealFlowGrid({
  metrics,
  pendingLeads,
}: {
  metrics: NonNullable<
    Awaited<ReturnType<typeof loadInstallerDashboardMetrics>>
  >;
  pendingLeads: number;
}) {
  const nextLabel = metrics.nextMeetingAt
    ? `Next: ${formatRelative(metrics.nextMeetingAt)}`
    : metrics.upcomingMeetings === 0
      ? "Nothing booked yet"
      : "—";

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        Your deal flow
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricTile
          label="Upcoming meetings"
          value={metrics.upcomingMeetings.toLocaleString("en-GB")}
          sub={nextLabel}
          icon={CalendarClock}
          accent="coral"
        />
        <MetricTile
          label="Booked this month"
          value={metrics.meetingsThisMonth.toLocaleString("en-GB")}
          sub={
            metrics.meetingsThisMonth === 0
              ? "—"
              : `${metrics.upcomingMeetings} still to come`
          }
          icon={CalendarDays}
        />
        <MetricTile
          label="Pending leads"
          value={pendingLeads.toLocaleString("en-GB")}
          sub={pendingLeads === 0 ? "Inbox is clear" : "Accept to lock in"}
          icon={Inbox}
          accent={pendingLeads > 0 ? "coral" : undefined}
        />
        <MetricTile
          label="Quotes sent this month"
          value={metrics.quotesSentThisMonth.toLocaleString("en-GB")}
          sub={
            metrics.quotesSentThisMonth === 0
              ? "Send your first this month"
              : "Awaiting decision"
          }
          icon={FileEdit}
        />
        <MetricTile
          label="Pipeline value"
          value={formatGbp(metrics.quotesOutstandingPence)}
          sub="Across quotes still out"
          icon={TrendingUp}
        />
        <MetricTile
          label="Won this month"
          value={formatGbp(metrics.quotesWonValuePence)}
          sub={
            metrics.quotesWonThisMonth === 0
              ? "—"
              : `${metrics.quotesWonThisMonth} accepted`
          }
          icon={PoundSterling}
          accent={metrics.quotesWonValuePence > 0 ? "emerald" : undefined}
        />
      </div>
    </section>
  );
}

function MetricTile({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: LucideIcon;
  accent?: "coral" | "emerald";
}) {
  const iconCls =
    accent === "coral"
      ? "bg-coral-pale text-coral-dark"
      : accent === "emerald"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-slate-100 text-slate-500";
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 mb-2">
        <span
          className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${iconCls}`}
        >
          <Icon className="w-3.5 h-3.5" />
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-2xl font-bold text-navy leading-none">{value}</p>
      <p className="text-[11px] text-slate-500 mt-2 leading-snug">{sub}</p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffH = diffMs / (1000 * 60 * 60);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(d);
  if (diffH < 24) return `today ${time}`;
  if (diffH < 48) return `tomorrow ${time}`;
  // Within a week → "Wed 3:00 pm"
  if (diffH < 24 * 7) {
    const day = new Intl.DateTimeFormat("en-GB", {
      weekday: "short",
      timeZone: "Europe/London",
    }).format(d);
    return `${day} ${time}`;
  }
  // Otherwise → "14 Apr"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(d);
}

// ─── Quick nav strip ───────────────────────────────────────────────

function QuickNav({ links }: { links: NavLink[] }) {
  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        Jump to
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {links.map((l) => {
          const Icon = l.icon;
          return (
            <Link
              key={l.href}
              href={l.href}
              className="group flex items-center gap-2 px-3 h-12 rounded-xl border border-slate-200 bg-white hover:border-coral/40 hover:shadow-sm transition-all"
            >
              <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-coral-pale group-hover:text-coral-dark transition-colors">
                <Icon className="w-3.5 h-3.5" />
              </span>
              <span className="flex-1 text-sm font-medium text-navy truncate">
                {l.title}
              </span>
              {l.badge && l.badge > 0 ? (
                <span className="shrink-0 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold bg-coral text-white">
                  {l.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ─── Onboarding checklist ──────────────────────────────────────────
//
// Renders above everything else when the installer hasn't yet
// completed the four core steps. Highlights one current step at a
// time so first-time visitors aren't presented with four equal
// CTAs and end up doing none of them. Hides automatically once
// every step is done — and the installer can also dismiss it
// manually via the X (writes installer_onboarding_dismissed_at).

function OnboardingChecklist({
  checklist,
  companyName,
}: {
  checklist: ChecklistResult;
  companyName: string | null;
}) {
  return (
    <div className="rounded-2xl border border-coral/30 bg-coral-pale/40 p-5 sm:p-6 mb-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-coral-dark shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-navy">
              {companyName ? `Welcome, ${companyName}` : "Welcome to Propertoasty"} 👋
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              A few quick things to set up before your first lead lands.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-white border border-coral/20 text-coral-dark">
            {checklist.doneCount} of {checklist.totalCount} done
          </span>
          <OnboardingDismissButton />
        </div>
      </div>

      <ul className="space-y-2">
        {checklist.items.map((item) => (
          <li key={item.id}>
            <ChecklistRow item={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChecklistRow({
  item,
}: {
  item: ChecklistResult["items"][number];
}) {
  return (
    <div
      className={`rounded-xl border p-3 sm:p-4 flex items-start gap-3 ${
        item.done
          ? "bg-white/60 border-slate-200 opacity-70"
          : item.current
            ? "bg-white border-coral shadow-sm"
            : "bg-white/60 border-slate-200"
      }`}
    >
      <span className="shrink-0 mt-0.5">
        {item.done ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        ) : item.current ? (
          <Circle className="w-5 h-5 text-coral fill-coral/15" />
        ) : (
          <Circle className="w-5 h-5 text-slate-300" />
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-semibold ${
            item.done ? "text-slate-500 line-through" : "text-navy"
          }`}
        >
          {item.title}
        </p>
        {!item.done && (
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            {item.body}
          </p>
        )}
      </div>
      {!item.done && item.current && (
        <Link
          href={item.ctaHref}
          className="shrink-0 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors self-center"
        >
          {item.ctaLabel}
          <ArrowRight className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

