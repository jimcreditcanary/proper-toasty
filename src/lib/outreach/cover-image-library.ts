// Cover-image library for installer-bylined blog posts.
//
// Each theme maps to a hand-curated Unsplash image URL. Direct
// `images.unsplash.com` URLs (already an allowed Image domain in
// next.config.ts) so Next can optimise + lazy-load them. Transform
// params kept consistent with scripts/blog/refresh-covers.ts:
//   - w=1600, q=80, fm=jpg, auto=format
//   - fit=crop, ar=16:9 (matches the blog hero aspect ratio)
//
// Why a curated library rather than a live Unsplash API call:
//   - No UNSPLASH_ACCESS_KEY in any deploy env. Adding one means
//     rotating + sharing a secret across vercel envs for a marginal
//     win — Claude already classifies the post's theme well, and
//     8 hand-picked photos covers the realistic topic distribution.
//   - Editorial sanity: every cover gets a quick human eyeball
//     when we add a new theme. Live API returns the occasional
//     unflattering shot (lone person in a hard hat, abstract circuit
//     board) that we'd then have to revert one-post-at-a-time.
//
// Adding a theme: pick a photo on unsplash.com → copy the direct
// images.unsplash.com URL from the share dialog → add the (theme,
// url, credit) tuple below. Keep the credit string in the
// "Photographer Name on Unsplash" shape so the post footer renders
// consistently.

import type { CoverImageTheme } from "@/lib/outreach/blog-draft";

interface CoverImageEntry {
  /** Direct images.unsplash.com URL with our transform params. */
  url: string;
  /** Photographer credit line, rendered in the post footer. */
  credit: string;
  /** Permalink to the photographer's profile — clickable credit. */
  creditUrl: string;
}

const LIBRARY: Record<CoverImageTheme, CoverImageEntry> = {
  heat_pump_outdoor_unit: {
    url: "https://images.unsplash.com/photo-1697894353389-3540deca87e0?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Mert Kahveci on Unsplash",
    creditUrl: "https://unsplash.com/@mertkahveci",
  },
  solar_panels_on_roof: {
    url: "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Watt A Lot on Unsplash",
    creditUrl: "https://unsplash.com/@watt_a_lot",
  },
  battery_storage_indoor: {
    url: "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Kumpan Electric on Unsplash",
    creditUrl: "https://unsplash.com/@kumpan_electric",
  },
  uk_home_exterior: {
    url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Phil Hearing on Unsplash",
    creditUrl: "https://unsplash.com/@philhearing",
  },
  boiler_and_pipes: {
    url: "https://images.unsplash.com/photo-1635274602170-d1c97cc4d4d2?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Anatolii Tarasov on Unsplash",
    creditUrl: "https://unsplash.com/@onehundred1",
  },
  loft_insulation: {
    url: "https://images.unsplash.com/photo-1605152276897-4f618f831968?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Brett Jordan on Unsplash",
    creditUrl: "https://unsplash.com/@brett_jordan",
  },
  engineer_at_work: {
    url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "ThisisEngineering on Unsplash",
    creditUrl: "https://unsplash.com/@thisisengineering",
  },
  energy_bill_paperwork: {
    url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=1600&q=80&fm=jpg&fit=crop&ar=16:9&auto=format",
    credit: "Kelly Sikkema on Unsplash",
    creditUrl: "https://unsplash.com/@kellysikkema",
  },
};

/** Resolve a theme to its curated cover image. Theme is already
 *  validated upstream by draftInstallerBlog, but the lookup falls
 *  back to uk_home_exterior defensively if a stale theme reaches
 *  the publish path. */
export function coverImageForTheme(
  theme: CoverImageTheme | null | undefined,
): CoverImageEntry {
  if (!theme || !(theme in LIBRARY)) {
    return LIBRARY.uk_home_exterior;
  }
  return LIBRARY[theme];
}

/** Reverse lookup: given a stored cover_image URL, find the credit
 *  metadata. Used by the blog post page to render a photographer
 *  credit in the footer. Returns null when the URL isn't one of
 *  ours (editorial posts using /public covers, custom uploads, etc).
 *
 *  Compares on the photo ID prefix rather than the full URL — the
 *  transform params after the `?` may drift over time but the
 *  `photo-XXXX` slug stays stable. */
export function creditForCoverImage(
  url: string | null,
): { credit: string; creditUrl: string } | null {
  if (!url) return null;
  const idMatch = /\/(photo-[a-z0-9-]+)\b/i.exec(url);
  if (!idMatch) return null;
  const targetId = idMatch[1].toLowerCase();
  for (const entry of Object.values(LIBRARY)) {
    const entryMatch = /\/(photo-[a-z0-9-]+)\b/i.exec(entry.url);
    if (entryMatch && entryMatch[1].toLowerCase() === targetId) {
      return { credit: entry.credit, creditUrl: entry.creditUrl };
    }
  }
  return null;
}
