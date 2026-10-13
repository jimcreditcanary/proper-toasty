// One-shot IndexNow push for the installer-bound /check deep-links.
//
// Context: Bing Webmaster Tools flagged "Large number of pages
// pointing to the same canonical URL" because the installer
// directory generates ~2000 URLs of the shape
//   /check?installer=<id>&capability=heat_pump
//   /check?installer=<id>&capability=solar
// — one per installer × per capability they offer. All of them
// correctly canonicalise to /check, but Bing was treating the
// cluster as a potential bug.
//
// We fixed the root cause by adding `robots: { index: false }` to
// /check whenever any session query param (installer / capability /
// presurvey / postcode) is present. But Bing's existing index still
// holds the old (indexable) versions and will only drop them on its
// next crawl of each — which, for low-value session URLs, could be
// weeks.
//
// This script enumerates every installer-capability combo currently
// in the DB, builds the matching /check URLs, and pushes them to
// IndexNow. Bing re-fetches each one, sees the new noindex, drops it
// from the index. Warning clears in days instead of weeks.
//
// Safe to re-run — IndexNow dedupes server-side and idempotent push
// is the whole point of the protocol.
//
// Run:  npx tsx scripts/seo/submit-indexnow-installer-check-urls.ts
// Needs POSTCODER / Supabase service key + INDEX_NOW_KEY in .env.local.

import "../../src/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { pingIndexNow, indexNowEnabled } from "@/lib/seo/indexnow";
import { ORG_PROFILE } from "@/lib/seo/org-profile";

const ORIGIN = ORG_PROFILE.url.replace(/\/+$/, "");
const BATCH = 10_000;

async function main() {
  if (!indexNowEnabled()) {
    console.error("INDEX_NOW_KEY not set — add it to .env.local first.");
    process.exit(1);
  }

  const admin = createAdminClient();

  // Only pull installers that are actually surfaced in the directory
  // (status + verification + at least one capability we care about).
  // Everything else was never generating a deep-link in the first
  // place, so recrawling it would be noise.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("installers")
    .select("id, cap_air_source_heat_pump, cap_solar_pv")
    .or("cap_air_source_heat_pump.eq.true,cap_solar_pv.eq.true");
  if (error) {
    console.error("installers query failed:", error.message);
    process.exit(1);
  }
  const rows = (data ?? []) as Array<{
    id: number;
    cap_air_source_heat_pump: boolean;
    cap_solar_pv: boolean;
  }>;
  console.log(`  ${rows.length} installer rows with ≥1 capability`);

  const urls: string[] = [];
  for (const r of rows) {
    if (r.cap_air_source_heat_pump) {
      urls.push(`${ORIGIN}/check?installer=${r.id}&capability=heat_pump`);
    }
    if (r.cap_solar_pv) {
      urls.push(`${ORIGIN}/check?installer=${r.id}&capability=solar`);
    }
  }
  const unique = Array.from(new Set(urls));
  console.log(`  ${unique.length} unique installer × capability URLs to recrawl\n`);

  if (unique.length === 0) {
    console.log("nothing to submit.");
    return;
  }

  for (let i = 0; i < unique.length; i += BATCH) {
    const chunk = unique.slice(i, i + BATCH);
    await pingIndexNow(chunk);
    console.log(
      `  submitted ${Math.min(i + BATCH, unique.length)}/${unique.length}`,
    );
  }
  console.log("Done. Bing will re-crawl, see the new noindex, drop these from the cluster.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
