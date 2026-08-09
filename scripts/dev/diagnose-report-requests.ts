// Diagnose: Postmark shows N reports emailed but /admin/reports only
// shows Jim's own runs.
//
// The report email fires from POST /api/leads/capture, which inserts
// into homeowner_leads (email + address blob) and THEN best-effort
// links a checks row (via checkId or clientSessionId). /admin/reports
// queries the `checks` table — so any lead that never got a linked
// check row is invisible there.
//
// This script prints:
//   1. Last 30 days of homeowner_leads (source=check_flow)
//   2. Whether each one has a corresponding row in `checks` at all
//      (via homeowner_lead_id) — the linkage the admin UI relies on
//   3. Same-day check rows near each lead's created_at so we can eyeball
//      an unlinked-but-existing check
//
// Usage:
//   npx tsx scripts/dev/diagnose-report-requests.ts

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

const DAYS = 30;

async function main() {
  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString();

  console.log(`── homeowner_leads (source=check_flow, last ${DAYS}d) ──\n`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads, error: leadsErr } = await (admin as any)
    .from("homeowner_leads")
    .select("id, email, postcode, address, source, created_at")
    .eq("source", "check_flow")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(50);
  if (leadsErr) {
    console.error("homeowner_leads query failed:", leadsErr);
    process.exit(1);
  }
  const leadRows = (leads ?? []) as Array<{
    id: string;
    email: string;
    postcode: string | null;
    address: string | null;
    source: string;
    created_at: string;
  }>;
  console.log(`  ${leadRows.length} lead rows total\n`);

  console.log(`── checks (last ${DAYS}d) ──\n`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: checks, error: checksErr } = await (admin as any)
    .from("checks")
    .select("id, short_id, status, postcode, address_formatted, homeowner_lead_id, user_id, client_session_id, created_at")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(200);
  if (checksErr) {
    console.error("checks query failed:", checksErr);
    process.exit(1);
  }
  const checkRows = (checks ?? []) as Array<{
    id: string;
    short_id: string | null;
    status: string;
    postcode: string | null;
    address_formatted: string | null;
    homeowner_lead_id: string | null;
    user_id: string | null;
    client_session_id: string | null;
    created_at: string;
  }>;
  console.log(`  ${checkRows.length} check rows total`);
  const linkedIds = new Set(checkRows.filter((c) => c.homeowner_lead_id).map((c) => c.homeowner_lead_id!));
  console.log(`  ${linkedIds.size} checks link to a homeowner_lead (via homeowner_lead_id)`);
  console.log(`  ${checkRows.filter((c) => c.status === "complete").length} checks status=complete`);
  console.log(`  ${checkRows.filter((c) => c.status === "draft").length} checks status=draft\n`);

  console.log(`── per-lead reconciliation ──\n`);
  for (const l of leadRows) {
    const linked = checkRows.find((c) => c.homeowner_lead_id === l.id);
    const sameSession = linked
      ? []
      : checkRows.filter((c) => {
          // Match by postcode + time within +/- 60 min as a proxy
          if (!c.postcode || !l.postcode) return false;
          if (c.postcode.replace(/\s+/g, "").toLowerCase() !== l.postcode.replace(/\s+/g, "").toLowerCase())
            return false;
          const dtLead = new Date(l.created_at).getTime();
          const dtCheck = new Date(c.created_at).getTime();
          return Math.abs(dtLead - dtCheck) < 60 * 60 * 1000;
        });
    const status = linked
      ? `✓ linked to check ${linked.short_id ?? linked.id.slice(0, 8)} (${linked.status})`
      : sameSession.length > 0
        ? `⚠ unlinked but ${sameSession.length} check(s) match postcode+time: ${sameSession.map((c) => `${c.short_id ?? c.id.slice(0, 8)}[${c.status}]`).join(", ")}`
        : `✗ NO matching check row`;
    console.log(
      `[${l.created_at.slice(0, 19)}] ${l.email.padEnd(35)} ${(l.postcode ?? "-").padEnd(10)} ${status}`,
    );
  }

  const linkedCount = leadRows.filter((l) => checkRows.some((c) => c.homeowner_lead_id === l.id)).length;
  const orphanCount = leadRows.length - linkedCount;
  console.log(`\n── summary ──`);
  console.log(`  ${leadRows.length} homeowner_leads with source=check_flow in last ${DAYS}d`);
  console.log(`  ${linkedCount} have a linked checks row (visible in /admin/reports)`);
  console.log(`  ${orphanCount} are orphan leads (invisible in /admin/reports because that page lists checks, not leads)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
