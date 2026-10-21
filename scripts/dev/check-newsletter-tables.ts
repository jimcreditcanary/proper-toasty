// Verify newsletter-agent migrations 001 + 002 landed on
// propertoasty's Supabase project. Idempotent — safe to re-run.
//
// Usage: npx tsx scripts/dev/check-newsletter-tables.ts

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();

  const probes: Array<{ table: string; column: string; label: string }> = [
    {
      table: "newsletter_subscribers",
      column: "brand",
      label: "migration 001 — newsletter_subscribers",
    },
    {
      table: "newsletter_issues",
      column: "scheduled_for",
      label: "migration 002 — newsletter_issues",
    },
  ];

  let fail = 0;
  for (const p of probes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from(p.table)
      .select(p.column)
      .limit(0);
    if (error) {
      console.log(`  ✗  ${p.label}`);
      console.log(`     → ${error.message}`);
      fail += 1;
    } else {
      console.log(`  ✓  ${p.label}`);
    }
  }

  // Also count rows (both should be 0 on a fresh install).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: subCount } = await (admin as any)
    .from("newsletter_subscribers")
    .select("*", { count: "exact", head: true });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: issueCount } = await (admin as any)
    .from("newsletter_issues")
    .select("*", { count: "exact", head: true });
  console.log(`\n  ${subCount ?? 0} subscriber row(s)`);
  console.log(`  ${issueCount ?? 0} issue row(s)`);

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
