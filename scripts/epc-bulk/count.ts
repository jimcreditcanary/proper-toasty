// Quick page + DB row count for status reporting.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "../../src/lib/supabase/admin";

async function main(): Promise<void> {
  const admin = createAdminClient();

  // Supabase select has a default 1000-row limit. Use range() to
  // page through, OR use count="exact" which doesn't pull rows. We
  // want per-scope breakdowns so use head=true + paged scans.
  const scopes = ["town", "local_authority", "archetype", "postcode_district"];
  console.log("epc_area_aggregates row counts by scope:");
  for (const scope of scopes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const total = await (admin as any)
      .from("epc_area_aggregates")
      .select("*", { count: "exact", head: true })
      .eq("scope", scope);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const indexed = await (admin as any)
      .from("epc_area_aggregates")
      .select("*", { count: "exact", head: true })
      .eq("scope", scope)
      .eq("indexed", true);
    console.log(
      `  ${scope.padEnd(20)} total=${total.count ?? "?"}  indexed=${indexed.count ?? "?"}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
