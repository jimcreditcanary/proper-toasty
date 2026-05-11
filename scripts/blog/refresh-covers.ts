#!/usr/bin/env tsx
//
// Refresh blog post cover images from a curated Unsplash list.
//
// What it does, in order:
//
//   1. For each `slug → unsplash-page-url` entry in COVERS:
//      a. Fetch the Unsplash page HTML and parse out the og:image URL
//         (this is the canonical direct images.unsplash.com URL we
//         can re-size via query params).
//      b. Strip existing transform params and set our own:
//         w=1600, q=80, fm=jpg, fit=crop, ar=16:9, auto=format.
//         16:9 matches the aspect ratio the blog cards + post pages
//         already render at, so we never crop in the browser.
//      c. Download the resulting image to public/blog/<slug>.jpg.
//   2. Print a single UPDATE SQL statement Jim can paste into
//      Supabase SQL Editor (or apply via --apply flag).
//
// Re-runnable: overwrites existing files. Safe to abort and rerun.
//
// Usage:
//
//   # Just download + show SQL (default, no DB writes)
//   npx tsx scripts/blog/refresh-covers.ts
//
//   # Apply the SQL too (requires SUPABASE_URL + SERVICE_ROLE_KEY env)
//   npx tsx scripts/blog/refresh-covers.ts --apply

import { writeFile } from "node:fs/promises";
import { resolve as pathResolve } from "node:path";

// ──────────────────────────────────────────────────────────────────
// Config — slug → Unsplash photo page URL
// ──────────────────────────────────────────────────────────────────
//
// One entry per published blog post. The slug must match the
// blog_posts.slug column exactly. Image is downloaded to
// public/blog/<slug>.jpg and the DB row updated to point at
// /blog/<slug>.jpg.

const COVERS: Record<string, string> = {
  "air-source-vs-ground-source-heat-pump":
    "https://unsplash.com/photos/outdoor-heat-pump-unit-next-to-a-brick-building-4VCm8l6wLQY",
  "do-heat-pumps-work-in-old-houses":
    "https://unsplash.com/photos/a-red-brick-house-with-white-windows-and-a-black-door-Hw67HuisCtU",
  "heat-pump-running-costs-uk":
    "https://unsplash.com/photos/a-white-and-black-air-conditioner-sitting-outside-of-a-building-ci0I3-1_oy0",
  "heat-pump-noise-rules-uk":
    "https://unsplash.com/photos/a-air-conditioner-sitting-on-the-side-of-a-building--nbWCvUiFJA",
  "solar-and-heat-pump-together":
    "https://unsplash.com/photos/brown-brick-house-with-solar-panels-on-roof-9CalgkSRZb8",
  // Original pick (a-solar-panel-with-wind-turbines-...-YtELR3Q5Y4E)
  // gated behind Unsplash sign-in — anonymous /download 403s. Swapped
  // for an unrestricted alternative: Watt A Lot's house-with-solar
  // panels shot.
  "smart-export-guarantee-explained":
    "https://unsplash.com/photos/a-house-with-solar-panels-Ja8t8nJN2I4",
  "best-tariff-for-heat-pump-uk":
    "https://unsplash.com/photos/graphical-user-interface-website-YTG6kkQweck",
  "heat-pump-for-flat-or-leasehold":
    "https://unsplash.com/photos/white-concrete-building-under-blue-sky-during-daytime-2NI2ZKDFbq8",
  "gas-boiler-ban-uk-2035":
    "https://unsplash.com/photos/a-machine-with-wires-7cNw5DZAVkc",
  // Original pick (foam-insulation-...-mrol6ctsQPM) gated behind
  // Unsplash sign-in. Swapped for Brett Jordan's attic-with-insulation
  // shot — same subject, anonymously downloadable.
  "insulation-before-heat-pump":
    "https://unsplash.com/photos/inside-of-an-attic-with-insulation-and-wood-beams-oXGlh4Dc-Do",
};

// Pretend we're a real browser when fetching Unsplash endpoints —
// curl-style UAs get 401'd.
const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

// ──────────────────────────────────────────────────────────────────

/**
 * Extract the 11-character Unsplash photo ID from a page URL.
 * Unsplash uses base64url-style IDs (A-Z, a-z, 0-9, _, -), so the
 * trailing `-` can be either a separator OR the first character of
 * the ID. We anchor on the 11-char tail to handle both.
 *
 *   https://unsplash.com/photos/some-description-4VCm8l6wLQY      → 4VCm8l6wLQY
 *   https://unsplash.com/photos/something--nbWCvUiFJA             → -nbWCvUiFJA
 *   https://unsplash.com/photos/something-ci0I3-1_oy0             → ci0I3-1_oy0
 */
function extractPhotoId(pageUrl: string): string {
  const m = pageUrl.match(/([A-Za-z0-9_-]{11})\/?$/);
  if (!m) throw new Error(`couldn't extract photo ID from ${pageUrl}`);
  return m[1];
}

/**
 * Use Unsplash's public /download endpoint to get the direct
 * images.unsplash.com URL for a given photo. The endpoint returns
 * HTTP 302 with the canonical URL in `Location`. We capture it
 * without following, so we can replace Unsplash's chosen transform
 * params with our own (uniform 1600×900 16:9 across the set).
 */
async function resolveDirectUrl(pageUrl: string): Promise<string> {
  const id = extractPhotoId(pageUrl);
  // Unsplash's /download endpoint is sometimes 403-fussy without a
  // Referer header — likely a hotlink-protection heuristic. Sending
  // the parent page URL as Referer mimics a normal browser flow.
  const downloadUrl = `https://unsplash.com/photos/${id}/download`;
  const headers: Record<string, string> = {
    "User-Agent": BROWSER_UA,
    Accept: "*/*",
    "Accept-Language": "en-GB,en;q=0.9",
    Referer: pageUrl,
  };

  // Two attempts: bare /download, then with a `?w=1600` hint (some
  // photo permissions return 403 on the bare endpoint but 302 once
  // sizing is specified — observed behaviour, not documented).
  for (const attempt of ["", "?w=1600"]) {
    const res = await fetch(`${downloadUrl}${attempt}`, {
      headers,
      redirect: "manual",
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (loc) return loc;
    }
    if (res.status === 403 && attempt === "") {
      // Retry with the sizing param.
      continue;
    }
    throw new Error(
      `/download${attempt} returned HTTP ${res.status} for ${id}`,
    );
  }
  throw new Error(`couldn't resolve direct URL for ${id} after retries`);
}

/**
 * Normalise an images.unsplash.com URL so we get a 1600×900 JPG
 * regardless of what crop the og:image was set to. Existing
 * transform params get stripped first so they don't compound.
 */
function withTransform(rawUrl: string): string {
  const u = new URL(rawUrl);
  // Strip every existing query param (ixlib, ixid, fm, fit, w, h,
  // crop, auto, q, ...). We're entirely replacing the transform.
  const params = Array.from(u.searchParams.keys());
  for (const k of params) u.searchParams.delete(k);
  u.searchParams.set("w", "1600");
  u.searchParams.set("h", "900");
  u.searchParams.set("fit", "crop");
  u.searchParams.set("crop", "entropy");
  u.searchParams.set("auto", "format");
  u.searchParams.set("fm", "jpg");
  u.searchParams.set("q", "80");
  return u.toString();
}

async function downloadOne(slug: string, pageUrl: string): Promise<number> {
  const directUrl = await resolveDirectUrl(pageUrl);
  const transformed = withTransform(directUrl);
  const res = await fetch(transformed, {
    headers: { "User-Agent": BROWSER_UA, Accept: "image/jpeg,image/*" },
  });
  if (!res.ok) {
    throw new Error(`image fetch failed: ${res.status} ${res.statusText}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const outPath = pathResolve(process.cwd(), `public/blog/${slug}.jpg`);
  await writeFile(outPath, buffer);
  return buffer.length;
}

function buildUpdateSql(): string {
  // Single statement using CASE WHEN per slug — atomic, idempotent,
  // and easy to eyeball before applying.
  const cases = Object.keys(COVERS)
    .map((slug) => `    when slug = '${slug}' then '/blog/${slug}.jpg'`)
    .join("\n");
  const slugList = Object.keys(COVERS)
    .map((s) => `'${s}'`)
    .join(", ");
  return `update public.blog_posts
   set cover_image = case
${cases}
   end,
   updated_at = now()
 where slug in (${slugList});`;
}

async function applySql(sql: string): Promise<void> {
  // Dynamic import — keeps Supabase off the path when --apply is not
  // passed (so the dry-run works without env vars set).
  const { createAdminClient } = await import("../../src/lib/supabase/admin");
  const admin = createAdminClient();
  // Per-row update — Postgres RPC for a single bulk SQL string would
  // require a `pg_exec` function, which we don't have. Per-row is
  // cheap at 10 rows and keeps the script self-contained.
  for (const [slug] of Object.entries(COVERS)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin as any)
      .from("blog_posts")
      .update({ cover_image: `/blog/${slug}.jpg`, updated_at: new Date().toISOString() })
      .eq("slug", slug);
    if (error) {
      console.error(`  ✗ ${slug} — ${error.message}`);
    } else {
      console.log(`  ✓ ${slug} — updated`);
    }
  }
  console.log("\nDB updates complete. Manual SQL also printed below for audit:");
  console.log(sql);
}

async function main() {
  const apply = process.argv.includes("--apply");
  console.log(
    `\nRefreshing ${Object.keys(COVERS).length} blog covers → public/blog/\n`,
  );

  let totalBytes = 0;
  let failed = 0;
  for (const [slug, pageUrl] of Object.entries(COVERS)) {
    try {
      const bytes = await downloadOne(slug, pageUrl);
      totalBytes += bytes;
      console.log(`  ✓ ${slug.padEnd(40)} ${(bytes / 1024).toFixed(0).padStart(4)} KB`);
    } catch (err) {
      failed += 1;
      console.error(
        `  ✗ ${slug.padEnd(40)} ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  console.log("");
  if (failed > 0) {
    console.error(`${failed} failures — fix before applying SQL.\n`);
    process.exit(1);
  }
  console.log(
    `All ${Object.keys(COVERS).length} downloaded, total ${(totalBytes / 1024 / 1024).toFixed(1)} MB\n`,
  );

  const sql = buildUpdateSql();
  if (apply) {
    console.log("Applying DB updates...\n");
    await applySql(sql);
  } else {
    console.log("--- SQL to apply (pass --apply to run automatically) ---");
    console.log(sql);
    console.log("--- end SQL ---\n");
  }
}

main().catch((err) => {
  console.error("Crashed:", err);
  process.exit(2);
});
