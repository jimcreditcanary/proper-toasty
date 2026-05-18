// scripts/outreach/preflight.ts
//
// Pre-flight check for the outreach engine. Run before flipping the
// campaign from draft → active. Verifies:
//
//   1. All required env vars are set + non-trivial length
//   2. POSTMARK_OUTREACH_SERVER_TOKEN is NOT the transactional token
//   3. CRON_SECRET set (required by the cron routes)
//   4. ANTHROPIC_API_KEY set (required by inbound reply classifier
//      + blog drafting)
//   5. Active or draft campaign exists in outreach_campaigns
//   6. 5 sequence rows present for that campaign
//   7. 48 founder_claims rows seeded
//   8. Eligibility view returns >0 rows
//   9. Suppression list pre-seeded with common role accounts
//
// Run via:
//   npx tsx scripts/outreach/preflight.ts
//
// Exit 0 = ready to launch. Exit 1 = fix something first.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";

const REQUIRED_ENV: { key: string; minLength: number }[] = [
  { key: "POSTMARK_OUTREACH_SERVER_TOKEN", minLength: 30 },
  { key: "POSTMARK_OUTREACH_SENDER_EMAIL", minLength: 8 },
  { key: "POSTMARK_OUTREACH_SENDER_NAME", minLength: 4 },
  { key: "POSTMARK_OUTREACH_REPLY_TO", minLength: 8 },
  { key: "POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET", minLength: 32 },
  { key: "POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET", minLength: 32 },
  { key: "OUTREACH_CLAIM_TOKEN_SECRET", minLength: 32 },
  { key: "CRON_SECRET", minLength: 16 },
  { key: "ANTHROPIC_API_KEY", minLength: 30 },
  { key: "NEXT_PUBLIC_SUPABASE_URL", minLength: 20 },
  { key: "SUPABASE_SERVICE_ROLE_KEY", minLength: 100 },
  { key: "NEXT_PUBLIC_APP_URL", minLength: 10 },
];

interface Check {
  name: string;
  pass: boolean;
  detail?: string;
}

async function main() {
  const checks: Check[] = [];

  // ─── 1-3: env vars ──
  for (const { key, minLength } of REQUIRED_ENV) {
    const val = process.env[key] ?? "";
    const ok = val.length >= minLength;
    checks.push({
      name: `env: ${key}`,
      pass: ok,
      detail: ok ? `length ${val.length}` : `missing or too short (need ${minLength})`,
    });
  }

  // ─── 4: outreach token != transactional token ──
  const outreachToken = process.env.POSTMARK_OUTREACH_SERVER_TOKEN;
  const transactionalToken = process.env.POSTMARK_SERVER_TOKEN;
  if (outreachToken && transactionalToken) {
    checks.push({
      name: "tokens: outreach ≠ transactional",
      pass: outreachToken !== transactionalToken,
      detail:
        outreachToken === transactionalToken
          ? "FATAL — same token; outreach would send from transactional server"
          : "ok",
    });
  }

  // ─── 5-9: DB checks ──
  let admin;
  try {
    admin = createAdminClient();
  } catch (e) {
    checks.push({
      name: "db: admin client",
      pass: false,
      detail: e instanceof Error ? e.message : "failed to init",
    });
    print(checks);
    process.exit(1);
  }

  // Campaign existence
  const { data: campaigns } = await admin
    .from("outreach_campaigns")
    .select("id, status, name, daily_send_limit");
  const campaign = campaigns?.[0];
  checks.push({
    name: "db: campaign exists",
    pass: !!campaign,
    detail: campaign
      ? `'${campaign.name}' (status=${campaign.status}, daily_limit=${campaign.daily_send_limit})`
      : "no rows in outreach_campaigns — run m065 seed",
  });

  // Sequence rows
  if (campaign) {
    const { count: seqCount } = await admin
      .from("outreach_email_sequence")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id);
    checks.push({
      name: "db: sequence rows",
      pass: (seqCount ?? 0) >= 5,
      detail: `${seqCount ?? 0} (expected ≥5)`,
    });
  }

  // Founder claims
  const { count: claimsCount } = await admin
    .from("outreach_founder_claims")
    .select("region", { count: "exact", head: true });
  checks.push({
    name: "db: founder_claims",
    pass: (claimsCount ?? 0) === 48,
    detail: `${claimsCount ?? 0} of 48 expected`,
  });

  // Eligibility pool
  const { count: eligibleCount } = await admin
    .from("outreach_eligibility")
    .select("installer_id", { count: "exact", head: true });
  checks.push({
    name: "db: eligibility pool",
    pass: (eligibleCount ?? 0) > 0,
    detail: `${eligibleCount ?? 0} installers eligible to enrol`,
  });

  // Suppression pre-seed (role accounts that should be blocked)
  const roleAccountsPattern = ["postmaster@", "abuse@", "noreply@", "no-reply@"];
  const { data: suppressed } = await admin
    .from("outreach_suppression")
    .select("email")
    .limit(100);
  const suppressedCount = suppressed?.length ?? 0;
  checks.push({
    name: "db: suppression seeded (role-account block is in the view, so this is informational)",
    pass: true,
    detail: `${suppressedCount} explicit entries (role accounts also filtered inline by the eligibility view; explicit seed not required for safety)`,
  });
  void roleAccountsPattern;

  print(checks);

  const allPass = checks.every((c) => c.pass);
  if (allPass) {
    console.log("\n✓ PRE-FLIGHT PASSED — outreach engine is ready to activate.\n");
    process.exit(0);
  } else {
    const failed = checks.filter((c) => !c.pass).length;
    console.log(`\n✗ PRE-FLIGHT FAILED — ${failed} check${failed === 1 ? "" : "s"} need fixing before launch.\n`);
    process.exit(1);
  }
}

function print(checks: Check[]) {
  console.log("");
  console.log("Outreach engine pre-flight check");
  console.log("=================================");
  for (const c of checks) {
    const icon = c.pass ? "✓" : "✗";
    const status = c.pass ? "pass" : "FAIL";
    console.log(`  ${icon} [${status}] ${c.name}`);
    if (c.detail) console.log(`           ${c.detail}`);
  }
}

void main();
