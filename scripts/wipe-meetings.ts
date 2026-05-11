// Wipe every meeting from the database — used to reset bookings
// state during testing without going row-by-row in the dashboard.
//
// What gets deleted / reset:
//
//   1. `installer_meetings` rows — fully truncated (every row).
//      This is the canonical meetings table; everything else is
//      denormalised state that points back to it.
//
//   2. `installer_leads.visit_booked_for` — cleared. This is the
//      denormalised meeting timestamp on the lead row; the
//      "Taken — booked for …" badge reads from here. Without this
//      reset, leads would keep showing "booked" even after the
//      underlying meeting row disappears.
//
//   3. `installer_leads.status` — leads currently at `visit_booked`
//      get rewound to `installer_acknowledged` (the previous state
//      in the lead lifecycle: `new → sent_to_installer →
//      installer_acknowledged → visit_booked → visit_completed →
//      closed_*`). Leads at any other status are untouched.
//
//   4. `installer_pre_survey_requests.meeting_status` /
//      `meeting_at` — pre-survey requests where the installer
//      pre-booked a meeting at send-time get reset to
//      "not_booked" / null. The DB CHECK constraint
//      `pre_survey_meeting_at_consistency` enforces these stay
//      in sync, so we update both together.
//
// What's NOT touched:
//   - `homeowner_leads` / the wizard state — pre-survey leads still
//     exist, they just lose their booking. The homeowner-side report
//     will re-render with the "book a site visit" tab visible again.
//   - `installer_availability` rules — installer's working hours +
//     daily caps survive.
//   - Calendar invites that were already emailed — we can't recall
//     those. Anyone who received an .ics is on their own.
//
// Usage:
//
//   # Dry-run (default) — counts what would be deleted, nothing
//   # actually wiped:
//   npx tsx --env-file=.env.local scripts/wipe-meetings.ts
//
//   # Wipe for real:
//   npx tsx --env-file=.env.local scripts/wipe-meetings.ts --confirm
//
// Safety: this is a destructive script. Default is dry-run so a
// stray `npm run` style invocation doesn't nuke prod. Requires
// `--confirm` to actually delete.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const args = process.argv.slice(2);
const confirm = args.includes("--confirm");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — pass --env-file=.env.local.",
  );
  process.exit(1);
}

const admin = createClient<Database>(SUPABASE_URL, SERVICE_KEY);

async function main() {
  if (!confirm) {
    console.log(
      "── DRY RUN ── (no rows will be deleted) — pass --confirm to actually wipe.\n",
    );
  }

  // ── 1. installer_meetings — count + delete ──────────────────────
  const { count: meetingsCount, error: meetingsCountErr } = await admin
    .from("installer_meetings")
    .select("id", { count: "exact", head: true });
  if (meetingsCountErr) {
    console.error("✗ installer_meetings count failed:", meetingsCountErr.message);
    process.exit(1);
  }
  console.log(`→ installer_meetings: ${meetingsCount ?? 0} row(s)`);

  // ── 2 + 3. installer_leads with visit booked — count ────────────
  const { count: bookedLeadCount, error: bookedLeadCountErr } = await admin
    .from("installer_leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "visit_booked");
  if (bookedLeadCountErr) {
    console.error(
      "✗ installer_leads count failed:",
      bookedLeadCountErr.message,
    );
    process.exit(1);
  }
  console.log(
    `→ installer_leads w/ status='visit_booked': ${bookedLeadCount ?? 0} row(s) (will revert to 'installer_acknowledged')`,
  );

  const { count: visitForCount } = await admin
    .from("installer_leads")
    .select("id", { count: "exact", head: true })
    .not("visit_booked_for", "is", null);
  console.log(
    `→ installer_leads w/ visit_booked_for set: ${visitForCount ?? 0} row(s) (will clear)`,
  );

  // ── 4. installer_pre_survey_requests w/ pre-booked meetings ─────
  const { count: presurveyCount } = await admin
    .from("installer_pre_survey_requests")
    .select("id", { count: "exact", head: true })
    .eq("meeting_status", "booked");
  console.log(
    `→ installer_pre_survey_requests w/ meeting_status='booked': ${presurveyCount ?? 0} row(s) (will reset to 'not_booked')`,
  );

  if (!confirm) {
    console.log("\nDry run complete. Re-run with --confirm to actually wipe.");
    return;
  }

  console.log("\n→ Wiping…");

  // 1. Truncate installer_meetings. Supabase JS doesn't expose a
  // TRUNCATE — we delete with a "where always true" sentinel.
  // The PK is uuid, so `neq("id", "00000000-0000-0000-0000-000000000000")`
  // is the idiomatic way to match every row.
  const { error: delErr } = await admin
    .from("installer_meetings")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000");
  if (delErr) {
    console.error("✗ installer_meetings delete failed:", delErr.message);
    process.exit(1);
  }
  console.log(`✓ installer_meetings: ${meetingsCount ?? 0} row(s) deleted`);

  // 2 + 3. Revert booked leads. Two-step so leads at status
  // 'visit_booked' lose the status flag AND their denorm timestamp;
  // leads at other statuses (rare, but possible if a meeting was
  // cancelled without status rewind) just lose the timestamp.
  const { error: leadStatusErr, count: leadStatusAffected } = await admin
    .from("installer_leads")
    .update({ status: "installer_acknowledged", visit_booked_for: null }, {
      count: "exact",
    })
    .eq("status", "visit_booked");
  if (leadStatusErr) {
    console.error("✗ installer_leads status reset failed:", leadStatusErr.message);
    process.exit(1);
  }
  console.log(
    `✓ installer_leads: ${leadStatusAffected ?? 0} row(s) reverted from 'visit_booked' → 'installer_acknowledged'`,
  );

  // Belt-and-braces: clear visit_booked_for on any lead that still
  // has one set (e.g. status wasn't 'visit_booked' but the
  // timestamp lingered). Cheap; only touches the orphans.
  const { error: vbErr, count: vbAffected } = await admin
    .from("installer_leads")
    .update({ visit_booked_for: null }, { count: "exact" })
    .not("visit_booked_for", "is", null);
  if (vbErr) {
    console.error("✗ visit_booked_for cleanup failed:", vbErr.message);
    process.exit(1);
  }
  console.log(
    `✓ installer_leads: ${vbAffected ?? 0} orphan visit_booked_for value(s) cleared`,
  );

  // 4. Reset pre-survey-request meetings. Both fields together so
  // the DB CHECK constraint stays happy.
  const { error: psErr, count: psAffected } = await admin
    .from("installer_pre_survey_requests")
    .update({ meeting_status: "not_booked", meeting_at: null }, {
      count: "exact",
    })
    .eq("meeting_status", "booked");
  if (psErr) {
    console.error("✗ pre-survey request reset failed:", psErr.message);
    process.exit(1);
  }
  console.log(
    `✓ installer_pre_survey_requests: ${psAffected ?? 0} row(s) reset to meeting_status='not_booked'`,
  );

  console.log("\n──────────────── Done ────────────────\n");
  console.log(
    "All meeting state cleared. Leads previously at 'visit_booked' are now 'installer_acknowledged'; the homeowner-side report will show the 'book a site visit' tab again.",
  );
}

main().catch((e) => {
  console.error("Unhandled error:", e);
  process.exit(1);
});
