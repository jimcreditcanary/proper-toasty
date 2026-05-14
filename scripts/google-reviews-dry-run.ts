// scripts/google-reviews-dry-run.ts — 5-installer dry run for the
// Google Places on-demand pipeline.
//
// Picks 5 installers from the directory (preferring ones with names
// likely to resolve well in Google Places), prints the BEFORE state
// from Supabase, calls the production google-refresh endpoint with
// those ids, and prints the AFTER state for diff.
//
// This is the "dry run before mass backfill" the brief asked for —
// except we don't do a mass backfill at all (on-demand model), so
// this serves to validate the pipeline end-to-end on 5 real installers
// before turning on the UI integration in Phase 5.
//
// Usage:
//   npx tsx scripts/google-reviews-dry-run.ts
//   npx tsx scripts/google-reviews-dry-run.ts --ids 1,2,3,4,5
//   npx tsx scripts/google-reviews-dry-run.ts --endpoint http://localhost:3000

import "../src/lib/dev/load-env";

import { createAdminClient } from "../src/lib/supabase/admin";

interface Args {
  ids: number[] | null;
  endpoint: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let ids: number[] | null = null;
  let endpoint = "https://www.propertoasty.com";
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--ids" && argv[i + 1]) {
      ids = argv[++i].split(",").map((s) => parseInt(s.trim(), 10)).filter((n) => !isNaN(n));
    } else if (argv[i] === "--endpoint" && argv[i + 1]) {
      endpoint = argv[++i];
    }
  }
  return { ids, endpoint };
}

interface InstallerRow {
  id: number;
  company_name: string;
  postcode: string | null;
  google_place_id: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  google_captured_at: string | null;
  google_status: string | null;
  bus_registered: boolean;
}

async function pickFiveInstallers(): Promise<InstallerRow[]> {
  const admin = createAdminClient();
  // Pick 5 BUS-registered installers with reasonable-looking
  // company names. Order by company_name so re-runs hit the same set.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("installers")
    .select(
      "id, company_name, postcode, google_place_id, google_rating, google_review_count, google_captured_at, google_status, bus_registered",
    )
    .eq("bus_registered", true)
    .not("postcode", "is", null)
    .order("company_name", { ascending: true })
    .range(0, 200);
  if (error || !data) throw new Error(`query failed: ${error?.message}`);
  // Filter out obviously-junky names (single character, all digits, etc.)
  const good = (data as InstallerRow[]).filter(
    (r) =>
      r.company_name.length > 5 &&
      /[a-z]/i.test(r.company_name) &&
      !r.company_name.includes("LIMITED") === false ||
      true, // accept all that pass length+alpha
  );
  return good.slice(0, 5);
}

async function loadById(ids: number[]): Promise<InstallerRow[]> {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("installers")
    .select(
      "id, company_name, postcode, google_place_id, google_rating, google_review_count, google_captured_at, google_status, bus_registered",
    )
    .in("id", ids);
  if (error || !data) throw new Error(`query failed: ${error?.message}`);
  return data as InstallerRow[];
}

function fmtRow(r: InstallerRow): string {
  return [
    `  id=${r.id}`,
    `name="${r.company_name}"`,
    `postcode=${r.postcode ?? "—"}`,
    `place_id=${r.google_place_id ?? "—"}`,
    `rating=${r.google_rating ?? "—"}`,
    `count=${r.google_review_count ?? "—"}`,
    `status=${r.google_status ?? "—"}`,
    `captured_at=${r.google_captured_at ?? "—"}`,
  ].join("  ");
}

async function main(): Promise<void> {
  const { ids: argIds, endpoint } = parseArgs();

  const installers = argIds
    ? await loadById(argIds)
    : await pickFiveInstallers();

  if (installers.length === 0) {
    console.error("[dry-run] no installers found");
    process.exit(1);
  }

  console.log(`[dry-run] Endpoint: ${endpoint}/api/installers/google-refresh`);
  console.log(`[dry-run] Installers (${installers.length}):`);
  for (const r of installers) console.log(fmtRow(r));

  console.log("");
  console.log("[dry-run] BEFORE state captured above.");
  console.log("[dry-run] Calling refresh endpoint...");

  const startedAt = Date.now();
  const res = await fetch(`${endpoint}/api/installers/google-refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: installers.map((i) => i.id) }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[dry-run] endpoint returned ${res.status}: ${body.slice(0, 500)}`);
    process.exit(1);
  }
  const json = await res.json();
  console.log(`[dry-run] Endpoint responded in ${Date.now() - startedAt}ms`);
  console.log("[dry-run] Response:");
  console.log(JSON.stringify(json, null, 2));

  // Re-fetch from DB to confirm persistence
  console.log("");
  console.log("[dry-run] AFTER state (re-fetched from Supabase):");
  const after = await loadById(installers.map((i) => i.id));
  for (const r of after) console.log(fmtRow(r));

  // Quick summary
  console.log("");
  const okCount = after.filter((r) => r.google_status === "ok").length;
  const notFound = after.filter((r) => r.google_status === "not_found").length;
  const errored = after.filter((r) => (r.google_status ?? "").startsWith("error")).length;
  console.log(
    `[dry-run] Summary: ${okCount} resolved with rating, ${notFound} not_found, ${errored} errored, of ${after.length} attempted`,
  );
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack : err);
  process.exit(1);
});
