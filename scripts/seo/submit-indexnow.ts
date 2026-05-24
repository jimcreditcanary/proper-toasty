// One-shot (re-runnable) bulk IndexNow submission.
//
// Fetches the live child sitemaps, extracts every <loc>, and pushes the
// lot to IndexNow (Bing + friends). Use it to seed IndexNow with the
// current URL set, or after a big batch of new pages. Ongoing new blog
// posts auto-ping on publish, so this is for bulk/backfill only.
//
// Run:  npx tsx scripts/seo/submit-indexnow.ts
// Needs INDEX_NOW_KEY in .env.local (loaded below).

import "../../src/lib/dev/load-env";
import { pingIndexNow, indexNowEnabled } from "../../src/lib/seo/indexnow";
import { ORG_PROFILE } from "../../src/lib/seo/org-profile";

const ORIGIN = ORG_PROFILE.url.replace(/\/+$/, "");
const CHILD_SITEMAPS = [
  `${ORIGIN}/sitemap-pages.xml`,
  `${ORIGIN}/sitemap-guides.xml`,
  `${ORIGIN}/sitemap-towns.xml`,
];
const BATCH = 10_000; // IndexNow per-request cap

async function locsFromSitemap(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! ${url} → HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

async function main() {
  if (!indexNowEnabled()) {
    console.error("INDEX_NOW_KEY not set — add it to .env.local first.");
    process.exit(1);
  }

  const all: string[] = [];
  for (const sm of CHILD_SITEMAPS) {
    const locs = await locsFromSitemap(sm);
    console.log(`  ${sm.split("/").pop()}: ${locs.length} urls`);
    all.push(...locs);
  }

  const urls = Array.from(new Set(all));
  console.log(`\nSubmitting ${urls.length} unique URLs to IndexNow…`);

  for (let i = 0; i < urls.length; i += BATCH) {
    const chunk = urls.slice(i, i + BATCH);
    await pingIndexNow(chunk);
    console.log(`  submitted ${Math.min(i + BATCH, urls.length)}/${urls.length}`);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
