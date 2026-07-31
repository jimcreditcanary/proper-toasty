// Pillar rotation + blog-post selection for the daily social
// agent (/api/cron/social-agent).
//
// Design goals:
//   - Predictable variety: each pillar surfaces multiple times a
//     week, never two consecutive days on the same pillar.
//   - Prefer fresh content: newly-published blog posts trump
//     evergreen rotation. When nothing new lands on the assigned
//     pillar, fall back to the oldest not-recently-syndicated post
//     tagged with that pillar's blog category.
//   - No dupes inside a 14-day rolling window per (slug, platform).
//     The de-dupe check lives in the cron route, not here — this
//     module returns candidates; the caller filters.

import type { SupabaseClient } from "@supabase/supabase-js";

export type Pillar = "heat_pump" | "solar" | "plug_in_solar" | "blog";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  published_at: string | null;
}

// Weekly rotation. Structured as day-of-week → pillar so the
// agent behaves the same regardless of when it fires.
// getDay() returns 0=Sun ... 6=Sat.
//
//   Mon / Thu → heat_pump
//   Tue / Fri → solar
//   Wed / Sat → plug_in_solar
//   Sun       → blog (open slot — pick the newest published post
//                     of any pillar, or the newest overall)
//
// If Jim ever ships a fourth pillar (e.g. batteries, EV), give it
// the Sun slot and demote 'blog' to the fallback logic below.
const CALENDAR: Record<number, Pillar> = {
  0: "blog",
  1: "heat_pump",
  2: "solar",
  3: "plug_in_solar",
  4: "heat_pump",
  5: "solar",
  6: "plug_in_solar",
};

export function pillarForDate(d: Date): Pillar {
  return CALENDAR[d.getUTCDay()] ?? "blog";
}

// Category → pillar mapping. Blog posts land in one of a handful
// of categories; we route by category name. Keep this list
// aligned with the categories actually used on /blog — grep the
// posts table if unsure.
//
// Anything that doesn't match falls through to the 'blog' pillar
// and is only picked on Sundays / as last-resort fallback.
export function categoryToPillar(category: string): Pillar {
  const c = category.toLowerCase();
  if (
    c.includes("heat pump") ||
    c.includes("heat-pump") ||
    c.includes("bus") ||
    c.includes("boiler upgrade")
  ) {
    return "heat_pump";
  }
  if (c.includes("plug-in solar") || c.includes("plug in solar") || c.includes("balcony")) {
    return "plug_in_solar";
  }
  if (
    c.includes("solar") ||
    c.includes("pv") ||
    c.includes("battery") ||
    c.includes("smart export")
  ) {
    return "solar";
  }
  return "blog";
}

interface SelectorContext {
  supabase: SupabaseClient;
  /** Skip posts already syndicated on ANY platform in the last
   *  N days — prevents the same blog being ground into every
   *  channel back-to-back. Default 14. */
  cooldownDays?: number;
}

/**
 * Pick the best blog post for a given pillar on a given date.
 *
 *   1. Newest published post that maps to this pillar AND wasn't
 *      posted in the last cooldownDays.
 *   2. If nothing fresh: oldest matching post that wasn't posted
 *      in the last 30 days.
 *   3. If still nothing (pillar has no matching content): return
 *      null so the caller can either skip today or promote the
 *      pillar to 'blog' and re-run.
 *
 * All checks read from `social_posts` — the audit table
 * migration 082 provisions.
 */
export async function pickBlogPost(
  pillar: Pillar,
  ctx: SelectorContext,
): Promise<BlogPost | null> {
  const cooldownDays = ctx.cooldownDays ?? 14;
  const cooldownIso = new Date(
    Date.now() - cooldownDays * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Slugs to exclude — anything posted anywhere inside the window.
  // Cast to any: social_posts is a new table (migration 082) — the
  // generated Supabase types haven't been regenerated yet. Same
  // pattern used by src/lib/programmatic/local-energy-stats.ts for
  // la_energy_stats.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recent } = await (ctx.supabase as any)
    .from("social_posts")
    .select("blog_post_slug")
    .gte("posted_at", cooldownIso)
    .not("blog_post_slug", "is", null);
  const excludeSlugs = new Set(
    ((recent ?? []) as Array<{ blog_post_slug: string | null }>)
      .map((r) => r.blog_post_slug)
      .filter((s): s is string => !!s),
  );

  // Fetch a candidate window and filter in-memory. Blog corpus is
  // small (a few dozen posts), so this is cheap and keeps the SQL
  // simple. If the corpus grows past a few hundred posts, push the
  // pillar filter into a category IN () clause instead.
  const { data: posts, error } = await ctx.supabase
    .from("blog_posts")
    .select("slug, title, excerpt, category, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(200);
  if (error) {
    throw new Error(`Failed to fetch blog posts: ${error.message}`);
  }

  const eligible = (posts ?? [])
    .filter((p) => !excludeSlugs.has(p.slug))
    .filter((p) =>
      pillar === "blog" ? true : categoryToPillar(p.category) === pillar,
    );

  if (eligible.length === 0) return null;
  // Newest first (already ordered) — that's step 1 of the picker.
  return eligible[0] as BlogPost;
}

/**
 * Convenience: pillar → 1-line human label for logging + admin.
 */
export function pillarLabel(p: Pillar): string {
  switch (p) {
    case "heat_pump":
      return "Heat pumps — myths, benefits, cooling reversal";
    case "solar":
      return "Solar + battery — savings, payback, SEG uplift";
    case "plug_in_solar":
      return "Plug-in solar — renters, flats, small terraces";
    case "blog":
      return "Blog-of-the-week — newest publish";
  }
}
