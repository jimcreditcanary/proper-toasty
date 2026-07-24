// Warm every sitemap URL so ISR cold renders don't hit external
// crawlers. Ahrefs (23 Jul 2026) flagged 88 slow pages — all
// programmatic PCD/LA guides where the first crawler hit triggered a
// full server render (Supabase + Postcodes.io fallback) and got timed
// at 1-12s TTFB. Every subsequent hit is edge-cached, so real users
// were never affected — but the Ahrefs score was.
//
// Run post-deploy (Vercel deploy hook or GitHub Action) to prime the
// cache before crawlers arrive:
//
//   npx tsx scripts/seo/warm-sitemap.ts
//   npx tsx scripts/seo/warm-sitemap.ts --origin=https://propertoasty.vercel.app
//   npx tsx scripts/seo/warm-sitemap.ts --concurrency=20
//
// No env vars required — just fetches over the public HTTPS surface.

import { ORG_PROFILE } from "../../src/lib/seo/org-profile";

const ARGS = new Map(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, ...rest] = a.replace(/^--/, "").split("=");
      return [k, rest.join("=") || "true"] as const;
    }),
);

const ORIGIN = (
  ARGS.get("origin") ?? ORG_PROFILE.url
).replace(/\/+$/, "");
const CONCURRENCY = Number(ARGS.get("concurrency") ?? 10);
const TIMEOUT_MS = Number(ARGS.get("timeout") ?? 30_000);
// Skip URLs already on the CDN — a HEAD returning HIT / 200 with a
// warm `age` header means no cold-render tax to pay. We still warm
// misses. Vercel exposes `x-vercel-cache` = HIT|MISS|STALE|BYPASS.
const SKIP_WARM = ARGS.get("skip-warm") !== "false";

const CHILD_SITEMAPS = [
  `${ORIGIN}/sitemap-pages.xml`,
  `${ORIGIN}/sitemap-guides.xml`,
  `${ORIGIN}/sitemap-towns.xml`,
  `${ORIGIN}/sitemap-data.xml`,
];

async function locsFromSitemap(url: string): Promise<string[]> {
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  ! ${url} → HTTP ${res.status}`);
    return [];
  }
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].trim(),
  );
}

interface Result {
  url: string;
  status: number | "TIMEOUT" | "ERROR";
  cache: string;
  ms: number;
}

async function warmOne(url: string): Promise<Result> {
  const start = performance.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // GET (not HEAD) — HEAD can skip the render on some
    // frameworks; GET guarantees the ISR page is actually built.
    const res = await fetch(url, {
      signal: controller.signal,
      // Bypass any intermediate caches on our end — we want the
      // origin/edge state, not our local network cache.
      cache: "no-store",
      headers: {
        "user-agent": "propertoasty-warmup/1 (+ops)",
      },
    });
    // Drain the body so keep-alive can reuse the socket.
    await res.arrayBuffer();
    return {
      url,
      status: res.status,
      cache:
        res.headers.get("x-vercel-cache") ??
        res.headers.get("cf-cache-status") ??
        "-",
      ms: Math.round(performance.now() - start),
    };
  } catch (err) {
    return {
      url,
      status: (err as Error).name === "AbortError" ? "TIMEOUT" : "ERROR",
      cache: "-",
      ms: Math.round(performance.now() - start),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runPool<T, U>(
  items: T[],
  n: number,
  worker: (item: T, index: number) => Promise<U>,
  onDone: (r: U, i: number, total: number) => void,
): Promise<U[]> {
  const results: U[] = new Array(items.length);
  let next = 0;
  let completed = 0;
  const runners = Array.from({ length: n }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      const r = await worker(items[i], i);
      results[i] = r;
      completed++;
      onDone(r, completed, items.length);
    }
  });
  await Promise.all(runners);
  return results;
}

async function main(): Promise<void> {
  console.log(`Warming sitemap URLs on ${ORIGIN}`);
  console.log(
    `  concurrency=${CONCURRENCY} timeout=${TIMEOUT_MS}ms skip-warm=${SKIP_WARM}`,
  );

  const all: string[] = [];
  for (const sm of CHILD_SITEMAPS) {
    const locs = await locsFromSitemap(sm);
    console.log(`  ${sm.split("/").pop()}: ${locs.length} URLs`);
    all.push(...locs);
  }
  const urls = Array.from(new Set(all));
  console.log(`\nWarming ${urls.length} unique URLs…\n`);

  const results = await runPool(urls, CONCURRENCY, warmOne, (r, i, n) => {
    if (i % 100 === 0 || i === n) {
      console.log(`  ${i}/${n} … last: ${r.status} ${r.cache} ${r.ms}ms`);
    }
  });

  // Summary buckets.
  const buckets = new Map<string, number>();
  const slow: Result[] = [];
  const failed: Result[] = [];
  let totalMs = 0;
  for (const r of results) {
    const bucket =
      typeof r.status === "number" ? `${r.status} ${r.cache}` : r.status;
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    totalMs += r.ms;
    if (typeof r.status !== "number" || r.status >= 400) failed.push(r);
    else if (r.ms > 3_000) slow.push(r);
  }

  console.log(`\nSummary:`);
  console.log(
    `  ${urls.length} URLs · mean ${Math.round(totalMs / urls.length)}ms`,
  );
  for (const [k, v] of [...buckets.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(5)}  ${k}`);
  }

  if (slow.length) {
    console.log(`\nSlowest 20 (>3s):`);
    for (const r of slow.sort((a, b) => b.ms - a.ms).slice(0, 20)) {
      console.log(`  ${r.ms.toString().padStart(6)}ms  ${r.url}`);
    }
  }
  if (failed.length) {
    console.log(`\n${failed.length} failures:`);
    for (const r of failed.slice(0, 50)) {
      console.log(`  ${r.status}  ${r.url}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
