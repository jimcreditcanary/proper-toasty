// At-risk installer detection.
//
// Two flavours of risk we care about, each surfaces in its own list
// on the performance dashboard:
//
// 1. STALE — claimed installers with zero lead acceptances in the
//    last 30 days. Claimed but inactive means we're paying support
//    cost (email, calendar, dashboard) without revenue. Worth a
//    nudge or, if persistent, a directory hide.
//
// 2. FAILING_RECHARGES — installers whose last 3 auto-recharge
//    attempts all failed. They've opted into auto top-up and Stripe
//    can't take the money — usually a card-on-file issue. The
//    auto-release path keeps releasing leads to them on credit, so
//    a quiet failure here loses real margin.
//
// Both queries are bounded — STALE caps at 50, FAILING_RECHARGES at
// 25 — so a slow service-degraded day doesn't render a 500-row dash.

import { createAdminClient } from "@/lib/supabase/admin";

export interface StaleInstaller {
  installer_id: number;
  company_name: string;
  user_email: string | null;
  claimed_at: string;
  last_acceptance_at: string | null;
  days_since_acceptance: number | null;
}

export interface FailingRechargeInstaller {
  installer_id: number;
  company_name: string;
  user_email: string | null;
  last_attempt_at: string;
  last_failure_message: string | null;
  consecutive_failures: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Claimed installers with no lead acceptance in the last 30 days.
 *
 * Approach: pull every claimed installer, then for each, check the
 * latest installer_acknowledged_at on their leads. Worst case this
 * is N+1 round trips, but N (claimed installers) is small at our
 * stage and the per-installer query is single-row + indexed. If
 * N > 100 this becomes painful — at that point we either move it
 * to a SQL view with LATERAL JOIN or run it as a nightly cron.
 */
export async function loadStaleInstallers(): Promise<StaleInstaller[]> {
  const admin = createAdminClient();
  const cutoffIso = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();

  // 1. All claimed installers (bounded — claimed installers are the
  //    revenue-relevant population, we're not going to have 10k of
  //    them any time soon). Pull oldest claimed first so an installer
  //    that's been around longer ranks higher when it goes stale.
  const { data: installers, error } = await admin
    .from("installers")
    .select("id, company_name, user_id, claimed_at")
    .not("claimed_at", "is", null)
    .order("claimed_at", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[at-risk.loadStaleInstallers] installers query", error);
    return [];
  }

  const ids = (installers ?? []).map((r) => r.id);
  if (ids.length === 0) return [];

  // 2. One query for every recent acceptance across the cohort.
  //    Builds a per-installer "most recent acceptance" map.
  const { data: recent } = await admin
    .from("installer_leads")
    .select("installer_id, installer_acknowledged_at")
    .in("installer_id", ids)
    .not("installer_acknowledged_at", "is", null)
    .gte("installer_acknowledged_at", cutoffIso)
    .limit(5000);

  const recentByInstaller = new Map<number, string>();
  for (const r of recent ?? []) {
    if (!r.installer_acknowledged_at) continue;
    const existing = recentByInstaller.get(r.installer_id);
    if (!existing || r.installer_acknowledged_at > existing) {
      recentByInstaller.set(r.installer_id, r.installer_acknowledged_at);
    }
  }

  // 3. Stale = no entry in the recent map. Pull the all-time latest
  //    acceptance for context (can be null if they've never accepted).
  const staleIds = (installers ?? [])
    .filter((i) => !recentByInstaller.has(i.id))
    .map((i) => i.id);

  if (staleIds.length === 0) return [];

  const { data: alltime } = await admin
    .from("installer_leads")
    .select("installer_id, installer_acknowledged_at")
    .in("installer_id", staleIds)
    .not("installer_acknowledged_at", "is", null)
    .order("installer_acknowledged_at", { ascending: false })
    .limit(5000);

  const lastByInstaller = new Map<number, string>();
  for (const r of alltime ?? []) {
    if (!r.installer_acknowledged_at) continue;
    if (!lastByInstaller.has(r.installer_id)) {
      lastByInstaller.set(r.installer_id, r.installer_acknowledged_at);
    }
  }

  // 4. Hydrate user emails so the row is actionable from the dash.
  const userIds = (installers ?? [])
    .filter((i) => staleIds.includes(i.id) && i.user_id)
    .map((i) => i.user_id!) as string[];
  let emailByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, email")
      .in("id", userIds);
    emailByUser = new Map((users ?? []).map((u) => [u.id, u.email ?? ""]));
  }

  const now = Date.now();
  const stale: StaleInstaller[] = [];
  for (const i of installers ?? []) {
    if (!staleIds.includes(i.id)) continue;
    const lastAcc = lastByInstaller.get(i.id) ?? null;
    stale.push({
      installer_id: i.id,
      company_name: i.company_name,
      user_email: i.user_id ? (emailByUser.get(i.user_id) ?? null) : null,
      claimed_at: i.claimed_at!,
      last_acceptance_at: lastAcc,
      days_since_acceptance: lastAcc
        ? Math.floor((now - new Date(lastAcc).getTime()) / 86400000)
        : null,
    });
  }

  // Cap at 50 — we want a list that fits on one screen, not a
  // dump. If you need the full list, that's a CSV export job.
  return stale.slice(0, 50);
}

/**
 * Installers whose last 3 auto-recharge attempts all failed.
 *
 * "Last 3" means: if they only have 2 attempts, both failed counts
 * (we can't verify a third). If they have <2 attempts, they're not
 * surfaced even if every one failed — too noisy for a dashboard.
 */
export async function loadFailingRechargeInstallers(): Promise<
  FailingRechargeInstaller[]
> {
  const admin = createAdminClient();

  // Pull the last ~500 attempts ordered desc, group by installer in
  // memory. Bounded by created_at desc so we always have the most
  // recent. 500 covers ~16 attempts/installer for 30 active
  // installers — generous.
  const { data, error } = await admin
    .from("installer_auto_recharge_attempts")
    .select(
      "installer_id, user_id, status, failure_message, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[at-risk.loadFailingRechargeInstallers]", error);
    return [];
  }

  // Group by installer_id, preserving the desc order.
  const byInstaller = new Map<
    number,
    { status: string; failure_message: string | null; created_at: string; user_id: string | null }[]
  >();
  for (const r of data ?? []) {
    if (r.installer_id == null) continue;
    const arr = byInstaller.get(r.installer_id) ?? [];
    arr.push({
      status: r.status,
      failure_message: r.failure_message,
      created_at: r.created_at,
      user_id: r.user_id,
    });
    byInstaller.set(r.installer_id, arr);
  }

  // Filter: last 3 (or last 2 if only 2 exist) all 'failed'.
  // 'requires_action' is a soft fail; we count it as failure for
  // surfacing purposes since the installer hasn't recovered yet.
  const candidates: { installer_id: number; attempts: typeof byInstaller extends Map<number, infer V> ? V : never; user_id: string | null }[] = [];
  for (const [installer_id, attempts] of byInstaller.entries()) {
    if (attempts.length < 2) continue;
    const recent = attempts.slice(0, Math.min(3, attempts.length));
    const allFailed = recent.every(
      (a) => a.status === "failed" || a.status === "requires_action",
    );
    if (allFailed) {
      candidates.push({
        installer_id,
        attempts: recent,
        user_id: attempts[0].user_id,
      });
    }
  }

  if (candidates.length === 0) return [];

  // Hydrate company name + user email.
  const installerIds = candidates.map((c) => c.installer_id);
  const { data: installers } = await admin
    .from("installers")
    .select("id, company_name, user_id")
    .in("id", installerIds);

  const installerById = new Map(
    (installers ?? []).map((i) => [i.id, i]),
  );

  const userIds = candidates
    .map((c) => c.user_id)
    .filter((u): u is string => Boolean(u));
  let emailByUser = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: users } = await admin
      .from("users")
      .select("id, email")
      .in("id", userIds);
    emailByUser = new Map((users ?? []).map((u) => [u.id, u.email ?? ""]));
  }

  const out: FailingRechargeInstaller[] = candidates.map((c) => {
    const inst = installerById.get(c.installer_id);
    const lastAttempt = c.attempts[0];
    return {
      installer_id: c.installer_id,
      company_name: inst?.company_name ?? `#${c.installer_id}`,
      user_email: c.user_id ? (emailByUser.get(c.user_id) ?? null) : null,
      last_attempt_at: lastAttempt.created_at,
      last_failure_message: lastAttempt.failure_message,
      consecutive_failures: c.attempts.length,
    };
  });

  // Most recent failure first — typically what an admin wants to
  // act on.
  out.sort((a, b) => (a.last_attempt_at < b.last_attempt_at ? 1 : -1));
  return out.slice(0, 25);
}
