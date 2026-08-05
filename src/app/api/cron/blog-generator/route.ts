import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loadRecentGenTopics,
  loadRecentPostsForPillar,
  pillarForWeek,
  pillarLabel,
  type BlogPillar,
} from "@/lib/blog/pillars";
import { generateBlogPost } from "@/lib/blog/generator";
import { pickPhotoDeterministic } from "@/lib/services/pexels";

// Per-pillar Pexels query. Every query MUST contain a UK-specific
// visual anchor (terraced / semi-detached / victorian / brick / london)
// because generic terms like "modern house" pull American suburbs
// almost exclusively from Pexels' index. UK architecture cues get
// us photos that actually look like the audience's own street.
const COVER_QUERY: Record<BlogPillar, string> = {
  heat_pump: "brick terraced house uk",
  solar: "solar panels uk terraced",
  plug_in_solar: "london apartment balcony",
  boiler_vs_hp: "victorian semi detached house",
};

// GET /api/cron/blog-generator
//
// Weekly (Sunday 09:00 UTC per vercel.json). Steps:
//   1. Auth via CRON_SECRET Bearer.
//   2. Pick pillar from ISO week rotation (override via ?pillar=).
//   3. Load recent posts on this pillar + recent generator topics
//      so the writer avoids re-covering ground.
//   4. Generate the draft (Sonnet 5 + web_search, shape checks,
//      Haiku 4.5 guardrail).
//   5. If approved: insert into blog_posts (published=true). If not:
//      log the rejection but publish nothing.
//   6. Every outcome logs to blog_gen_runs.
//
// llms.txt / llms-full.txt auto-refresh from blog_posts on their
// 5-min ISR window, so no additional pipeline step needed.

export const runtime = "nodejs";
// Blog draft + guardrail = ~2min end-to-end. Give it plenty of
// headroom (Vercel Pro max is 900s).
export const maxDuration = 300;
export const dynamic = "force-dynamic";

interface RunResult {
  pillar: BlogPillar;
  status: "published" | "rejected" | "no_change" | "error";
  blog_post_slug: string | null;
  title: string | null;
  reason: string | null;
  word_count: number | null;
}

async function run(req: Request): Promise<RunResult | { error: string }> {
  const admin = createAdminClient();
  const url = new URL(req.url);
  const searchParams = url.searchParams;

  // Pillar for this run — ?pillar= override for smoke tests.
  const validPillars: BlogPillar[] = [
    "heat_pump",
    "solar",
    "plug_in_solar",
    "boiler_vs_hp",
  ];
  const forcedPillar = searchParams.get("pillar") as BlogPillar | null;
  const pillar: BlogPillar =
    forcedPillar && validPillars.includes(forcedPillar)
      ? forcedPillar
      : pillarForWeek(new Date());

  console.log("[cron/blog-generator] starting", {
    pillar,
    label: pillarLabel(pillar),
  });

  const [existingPosts, recentGeneratedTopics] = await Promise.all([
    loadRecentPostsForPillar(pillar, admin),
    loadRecentGenTopics(pillar, admin),
  ]);

  const gen = await generateBlogPost({
    pillar,
    existingPosts,
    recentGeneratedTopics,
  });

  // Deduplicate — never re-publish under a slug that already exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (admin as any)
    .from("blog_posts")
    .select("slug")
    .eq("slug", gen.draft.slug)
    .maybeSingle();
  const slugTaken = !!existing;

  // Log every outcome to blog_gen_runs.
  const logGen = async (
    status: "published" | "rejected" | "error",
    error: string | null,
    blogSlug: string | null,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin as any).from("blog_gen_runs").insert({
      pillar,
      topic: gen.draft.title,
      blog_post_slug: blogSlug,
      status,
      error,
      word_count: gen.wordCount,
    });
  };

  if (slugTaken) {
    await logGen("rejected", `slug already exists: ${gen.draft.slug}`, null);
    return {
      pillar,
      status: "rejected",
      blog_post_slug: null,
      title: gen.draft.title,
      reason: `slug already exists: ${gen.draft.slug}`,
      word_count: gen.wordCount,
    };
  }

  if (!gen.verdict.passed) {
    await logGen("rejected", gen.verdict.reason, null);
    console.log("[cron/blog-generator] draft rejected", {
      reason: gen.verdict.reason,
      shapeError: gen.shapeError,
    });
    return {
      pillar,
      status: "rejected",
      blog_post_slug: null,
      title: gen.draft.title,
      reason: gen.verdict.reason,
      word_count: gen.wordCount,
    };
  }

  // Fetch a Pexels cover — landscape orientation for the blog card
  // + hero. Seeded on the slug so each post gets a stable photo
  // (re-visits show the same image) but different posts land on
  // different photos in the pillar's result pool. Falls back to
  // null on any failure — the /blog page has a hero-uk-home.jpg
  // fallback baked in, so no publish is blocked by a missing cover.
  const cover = await pickPhotoDeterministic({
    query: COVER_QUERY[pillar],
    orientation: "landscape",
    seed: gen.draft.slug,
  });
  const coverImage = cover?.url ?? null;

  // Approved — insert into blog_posts. author = 'Jim Fell' matches
  // migration 077's byline convention; the /blog/[slug] page maps
  // it to the DEFAULT_AUTHOR_SLUG for Person schema.
  const nowIso = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (admin as any)
    .from("blog_posts")
    .insert({
      slug: gen.draft.slug,
      title: gen.draft.title,
      excerpt: gen.draft.excerpt,
      content: gen.draft.content,
      category: gen.draft.category,
      author: "Jim Fell",
      sources: gen.draft.sources,
      cover_image: coverImage,
      published: true,
      published_at: nowIso,
    });

  if (insertError) {
    await logGen("error", `insert failed: ${insertError.message}`, null);
    return {
      pillar,
      status: "error",
      blog_post_slug: null,
      title: gen.draft.title,
      reason: `insert failed: ${insertError.message}`,
      word_count: gen.wordCount,
    };
  }

  await logGen("published", null, gen.draft.slug);
  console.log("[cron/blog-generator] published", {
    slug: gen.draft.slug,
    title: gen.draft.title,
    wordCount: gen.wordCount,
  });
  return {
    pillar,
    status: "published",
    blog_post_slug: gen.draft.slug,
    title: gen.draft.title,
    reason: null,
    word_count: gen.wordCount,
  };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    console.error("[cron/blog-generator] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  const url = new URL(req.url);
  // ?backfill_cover=<slug> — one-off: fetch a Pexels cover for an
  // existing blog_posts row that was published before the cron
  // started setting cover_image. UK-visual queries per pillar.
  // Doesn't touch the writer / guardrail; pure UPDATE.
  const backfillSlug = url.searchParams.get("backfill_cover");
  if (backfillSlug) {
    return backfillCover(backfillSlug);
  }
  try {
    const result = await run(req);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/blog-generator] fatal", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function backfillCover(slug: string) {
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: row } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, category")
    .eq("slug", slug)
    .maybeSingle();
  if (!row) {
    return NextResponse.json({ error: `slug not found: ${slug}` }, { status: 404 });
  }
  // Heuristic pillar mapping — matches src/lib/blog/pillars.ts
  // classification. Enough for a one-off.
  const s = slug.toLowerCase();
  const pillar: BlogPillar = s.includes("plug-in-solar")
    ? "plug_in_solar"
    : s.includes("boiler") && !s.includes("heat-pump")
      ? "heat_pump" // "boiler upgrade scheme" etc. — still HP-adjacent
      : s.includes("heat-pump") || s.includes("bus") || s.includes("air-source")
        ? "heat_pump"
        : s.includes("solar") || s.includes("battery")
          ? "solar"
          : "heat_pump";
  const cover = await pickPhotoDeterministic({
    query: COVER_QUERY[pillar],
    orientation: "landscape",
    seed: slug,
  });
  if (!cover) {
    return NextResponse.json(
      { error: "no cover fetched — PEXELS_API_KEY unset or API failed" },
      { status: 502 },
    );
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("blog_posts")
    .update({ cover_image: cover.url })
    .eq("slug", slug);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    slug,
    pillar,
    cover_image: cover.url,
    photographer: cover.photographer,
    pexels_page: cover.pexelsUrl,
  });
}
