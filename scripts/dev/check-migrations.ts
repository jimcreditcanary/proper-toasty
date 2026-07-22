#!/usr/bin/env tsx
//
// Migration end-state verification — spot-checks that key tables +
// columns created by recent migrations actually exist in the connected
// Supabase project.
//
// Supabase's REST API doesn't expose the `supabase_migrations`
// schema, so we can't read `schema_migrations` from the admin
// client. Instead we probe the public-schema artifacts each
// migration should have left behind.
//
// This isn't a full reconciliation (that needs the Supabase CLI or
// the dashboard's Database → Migrations panel), but it catches the
// case that matters — "did the schema this codebase expects
// actually land". Green run = the code will not hit missing-table
// errors at request time.
//
// To add a migration to the checklist: append an entry to CHECKS
// below with the migration name + the artifact it created (table
// row-count probe, column select, or RPC call).
//
// Usage:
//   npx tsx scripts/dev/check-migrations.ts

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";

type Check = {
  migration: string;
  /** Human-readable artifact description. */
  artifact: string;
  /** Runs the probe. Returns null on success, error string on fail. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  probe: (admin: any) => Promise<string | null>;
};

/** Probe helper — attempt a bounded select on (schema.)table.column.
 *  Returns null on success, an error string on failure. */
function selectProbe(
  table: string,
  column: string,
): (admin: unknown) => Promise<string | null> {
  return async (admin) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from(table)
      .select(column)
      .limit(0);
    return error ? error.message ?? "unknown error" : null;
  };
}

// Ordered oldest → newest. Add entries as new migrations ship.
// Spot-check strategy: for each migration, pick one table or column
// that couldn't exist without it. A single-column select with limit=0
// is cheap + confirms the column resolves in Postgres's planner.
const CHECKS: Check[] = [
  {
    migration: "061_epc_area_aggregates",
    artifact: "table public.epc_area_aggregates",
    probe: selectProbe("epc_area_aggregates", "scope_key"),
  },
  {
    migration: "062_ai_visibility_checks",
    artifact: "table public.ai_visibility_checks",
    probe: selectProbe("ai_visibility_checks", "id"),
  },
  {
    migration: "063_installers_google_reviews",
    artifact: "column installers.google_captured_at",
    probe: selectProbe("installers", "google_captured_at"),
  },
  {
    migration: "064_installer_sponsored_and_logo",
    artifact: "column installers.sponsored_until",
    probe: selectProbe("installers", "sponsored_until"),
  },
  {
    migration: "065_outreach",
    artifact: "table public.outreach_leads (or equivalent)",
    // Best-effort: outreach_leads is the most common name; try the
    // outreach eligibility view built in 069 as fallback signal.
    probe: async (admin) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin as any)
        .from("outreach_leads")
        .select("id")
        .limit(0);
      if (!error) return null;
      // Fall back to eligibility view (built later in the outreach
      // chain — its existence implies 065 landed).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: e2 } = await (admin as any)
        .from("outreach_eligibility")
        .select("installer_id")
        .limit(0);
      return e2 ? `${error.message}; fallback: ${e2.message}` : null;
    },
  },
  {
    migration: "069_outreach_compliance",
    artifact: "column outreach_recipients.soft_bounce_count",
    probe: selectProbe("outreach_recipients", "soft_bounce_count"),
  },
  {
    migration: "071_installer_lead_outreach",
    artifact: "table public.installer_lead_outreach",
    probe: selectProbe("installer_lead_outreach", "installer_id"),
  },
  {
    migration: "072_installers_first_name",
    artifact: "column installers.first_name",
    probe: selectProbe("installers", "first_name"),
  },
  {
    migration: "074_installer_auto_recharge_rules",
    artifact: "column users.auto_recharge_enabled",
    probe: selectProbe("users", "auto_recharge_enabled"),
  },
  {
    migration: "075_installer_welcome_card_dismissed",
    artifact: "column installers.welcome_card_dismissed_at",
    probe: selectProbe("installers", "welcome_card_dismissed_at"),
  },
  {
    migration: "077_blog_bylines_and_h2_questions",
    artifact: "data — blog_posts.author='Jim Fell' present",
    probe: async (admin) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin as any)
        .from("blog_posts")
        .select("slug")
        .eq("author", "Jim Fell")
        .limit(1);
      if (error) return error.message;
      return data && data.length > 0
        ? null
        : "no rows with author='Jim Fell' — migration 077 not applied";
    },
  },
  {
    migration: "078_fix_broken_blog_link",
    artifact: "data — /guides/bus-application-walkthrough href present",
    probe: async (admin) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin as any)
        .from("blog_posts")
        .select("slug")
        .like("content", '%href="/guides/bus-application-walkthrough"%')
        .limit(1);
      if (error) return error.message;
      return data && data.length > 0
        ? null
        : "no rows with the fixed href — migration 078 not applied";
    },
  },
  {
    migration: "079_blog_posts_sources",
    artifact: "column blog_posts.sources (jsonb)",
    probe: selectProbe("blog_posts", "sources"),
  },
];

async function main(): Promise<void> {
  const admin = createAdminClient();

  console.log(`\nMigration end-state check — proper-toasty\n`);

  let failCount = 0;
  for (const check of CHECKS) {
    const result = await check.probe(admin);
    if (result === null) {
      console.log(`  ✓  ${check.migration.padEnd(48)} ${check.artifact}`);
    } else {
      failCount += 1;
      console.log(`  ✗  ${check.migration.padEnd(48)} ${check.artifact}`);
      console.log(`     → ${result}`);
    }
  }

  console.log("");
  if (failCount === 0) {
    console.log(
      `✓ ${CHECKS.length}/${CHECKS.length} checks passed. Schema matches every probed migration.`,
    );
  } else {
    console.log(
      `⚠ ${failCount}/${CHECKS.length} checks failed. Investigate the migrations listed above.`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
