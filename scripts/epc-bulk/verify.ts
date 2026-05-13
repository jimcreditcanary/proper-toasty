// Quick verify — read one LA + one town + one archetype row back
// and print the bulk-CSV fields. Sanity check after upload.

import "../../src/lib/dev/load-env";

import { createAdminClient } from "../../src/lib/supabase/admin";

async function fetchOne(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  scope: string,
  scopeKey: string,
): Promise<void> {
  const { data, error } = await admin
    .from("epc_area_aggregates")
    .select("scope, scope_key, display_name, sample_size, indexed, data, refreshed_at")
    .eq("scope", scope)
    .eq("scope_key", scopeKey)
    .maybeSingle();

  if (error || !data) {
    console.log(`[${scope}/${scopeKey}] NOT FOUND`);
    return;
  }

  console.log(`\n[${scope}/${scopeKey}] ${data.display_name}`);
  console.log(`  sample_size=${data.sample_size}, indexed=${data.indexed}`);
  console.log(`  refreshed_at=${data.refreshed_at}`);
  const d = data.data;
  console.log(`  median_band=${d.median_band}`);
  console.log(`  median_floor_area_m2=${d.median_floor_area_m2}`);
  console.log(`  median_heating_cost_current_gbp=${d.median_heating_cost_current_gbp}`);
  console.log(`  mains_gas_pct=${d.mains_gas_pct}`);
  console.log(
    `  built_form_distribution=`,
    d.built_form_distribution
      ? Object.entries(d.built_form_distribution).slice(0, 4)
      : null,
  );
}

async function main(): Promise<void> {
  const admin = createAdminClient();
  await fetchOne(admin, "local_authority", "la-e08000025"); // Birmingham
  await fetchOne(admin, "town", "sheffield");
  await fetchOne(admin, "archetype", "semi-detached-house--interwar-1930s");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
