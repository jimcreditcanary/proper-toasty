// Quick page + DB row count for status reporting.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";

async function main(): Promise<void> {
  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("epc_area_aggregates")
    .select("scope, indexed");
  if (error || !data) {
    console.error("query failed:", error);
    return;
  }

  const counts: Record<string, { total: number; indexed: number }> = {};
  for (const row of data as Array<{ scope: string; indexed: boolean }>) {
    if (!counts[row.scope]) counts[row.scope] = { total: 0, indexed: 0 };
    counts[row.scope].total += 1;
    if (row.indexed) counts[row.scope].indexed += 1;
  }

  console.log("epc_area_aggregates row counts by scope:");
  for (const scope of Object.keys(counts).sort()) {
    const c = counts[scope];
    console.log(`  ${scope.padEnd(20)} total=${c.total}  indexed=${c.indexed}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
