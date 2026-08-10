// One-shot backfill: create stub check rows for every homeowner_leads
// row (source=check_flow) that doesn't already have a linked checks
// row. Run this AFTER migration 084 lands so the inserts don't hit
// the user_id NOT NULL constraint.
//
// Usage:
//   npx tsx scripts/dev/backfill-orphan-check-rows.ts        # dry run
//   npx tsx scripts/dev/backfill-orphan-check-rows.ts --apply # write

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

const APPLY = process.argv.includes("--apply");

async function main() {
  const admin = createAdminClient();

  console.log(`── loading homeowner_leads (source=check_flow) ──\n`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads, error: leadsErr } = await (admin as any)
    .from("homeowner_leads")
    .select("id, email, name, address, postcode, uprn, latitude, longitude, created_at")
    .eq("source", "check_flow")
    .order("created_at", { ascending: false })
    .limit(500);
  if (leadsErr) throw new Error(`homeowner_leads query: ${leadsErr.message}`);
  const leadRows = (leads ?? []) as Array<{
    id: string;
    email: string;
    name: string | null;
    address: string | null;
    postcode: string | null;
    uprn: string | null;
    latitude: number | null;
    longitude: number | null;
    created_at: string;
  }>;
  console.log(`  ${leadRows.length} lead rows total`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: linkedChecks } = await (admin as any)
    .from("checks")
    .select("homeowner_lead_id")
    .not("homeowner_lead_id", "is", null)
    .in("homeowner_lead_id", leadRows.map((l) => l.id));
  const linkedIds = new Set(
    ((linkedChecks ?? []) as Array<{ homeowner_lead_id: string | null }>)
      .map((c) => c.homeowner_lead_id)
      .filter((id): id is string => !!id),
  );

  const orphans = leadRows.filter((l) => !linkedIds.has(l.id));
  console.log(`  ${orphans.length} orphan leads (no linked checks row)\n`);

  if (orphans.length === 0) {
    console.log("nothing to backfill.");
    return;
  }

  for (const l of orphans) {
    const payload = {
      status: "complete" as const,
      user_id: null,
      client_session_id: null,
      homeowner_lead_id: l.id,
      uprn: l.uprn,
      address_formatted: l.address,
      postcode: l.postcode,
      latitude: l.latitude,
      longitude: l.longitude,
      created_at: l.created_at,
      updated_at: l.created_at,
    };
    if (APPLY) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin as any)
        .from("checks")
        .insert(payload)
        .select("id, short_id")
        .single();
      if (error) {
        console.log(`  ✗ ${l.email} — ${error.message}`);
      } else {
        console.log(
          `  ✓ ${l.email.padEnd(35)} → check ${data.short_id ?? data.id.slice(0, 8)}`,
        );
      }
    } else {
      console.log(
        `  · ${l.email.padEnd(35)} ${(l.postcode ?? "-").padEnd(10)} ${l.created_at.slice(0, 10)}`,
      );
    }
  }

  if (!APPLY) {
    console.log(
      `\ndry run — nothing written. re-run with --apply to insert.`,
    );
  } else {
    console.log(`\ndone.`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
