import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createPost as bufferCreatePost,
  findChannelId,
  type BufferService,
} from "@/lib/services/buffer";
import {
  pickBlogPost,
  pillarForDate,
  pillarLabel,
  type Pillar,
} from "@/lib/social/pillars";
import {
  generateReviewedPosts,
  pillarCtaUrl,
} from "@/lib/social/generator";
import type { Platform } from "@/lib/social/prompts";

// GET /api/cron/social-agent
//
// Daily social agent. Runs at 07:00 UTC via Vercel cron
// (vercel.json). Steps:
//
//   1. Auth — Bearer CRON_SECRET, same pattern as the other crons.
//   2. Pick today's pillar from the calendar.
//   3. Pick a blog post for that pillar (cooldown-aware).
//   4. Generate 4 platform posts with Sonnet 5 + web_search.
//   5. Run the Haiku 4.5 guardrail on each — reject anything that
//      fails.
//   6. For each approved draft: resolve the Buffer channel id,
//      call createPost (shareNow), log to social_posts.
//   7. Log rejected drafts too so we can inspect misses.
//
// Idempotency: the pillar/blog selection is deterministic per day
// (the cooldown check reads social_posts). If the run is re-fired
// on the same day, the same blog will already be logged and the
// selector will return null → the run is a no-op. Deliberate — we
// prefer a quiet no-op to duplicate posts.

export const runtime = "nodejs";
export const maxDuration = 300; // web_search + 4 gens + guardrails
export const dynamic = "force-dynamic";

// Platform → Buffer service. Keep the two aligned by construction.
const PLATFORM_TO_SERVICE: Record<Platform, BufferService> = {
  linkedin: "linkedin",
  twitter: "twitter",
  facebook: "facebook",
  instagram: "instagram",
};

interface RunResult {
  pillar: Pillar;
  blog_post_slug: string | null;
  attempted: number;
  posted: number;
  rejected: number;
  errors: number;
  detail: Array<{
    platform: Platform;
    outcome: "posted" | "rejected" | "error" | "no_channel";
    reason?: string;
    buffer_update_id?: string;
  }>;
}

async function run(req: Request): Promise<RunResult | { error: string }> {
  const admin = createAdminClient();
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ??
    new URL(req.url).origin.replace(/\/+$/, "");

  // Pillar for today (UTC). If explicit ?pillar=... passed (e.g.
  // manual smoke test), use that instead — handy for verifying a
  // specific pillar without waiting for the calendar day.
  const searchParams = new URL(req.url).searchParams;
  const forcedPillar = searchParams.get("pillar") as Pillar | null;
  const validPillars: Pillar[] = [
    "heat_pump",
    "solar",
    "plug_in_solar",
    "blog",
  ];
  const pillar: Pillar =
    forcedPillar && validPillars.includes(forcedPillar)
      ? forcedPillar
      : pillarForDate(new Date());

  console.log("[cron/social-agent] starting", {
    pillar,
    label: pillarLabel(pillar),
    baseUrl,
  });

  // Pick a blog post for this pillar. If none available, no-op
  // rather than force-posting stale content.
  const post = await pickBlogPost(pillar, { supabase: admin });
  if (!post) {
    console.log("[cron/social-agent] no eligible blog post for pillar", {
      pillar,
    });
    return {
      pillar,
      blog_post_slug: null,
      attempted: 0,
      posted: 0,
      rejected: 0,
      errors: 0,
      detail: [],
    };
  }

  const linkUrl = pillarCtaUrl(pillar, baseUrl);
  console.log("[cron/social-agent] selected blog + CTA", {
    slug: post.slug,
    linkUrl,
  });

  const generation = await generateReviewedPosts(
    {
      pillar,
      blog_post: {
        slug: post.slug,
        title: post.title,
        excerpt: post.excerpt,
      },
      primary_cta_url: linkUrl,
    },
    post.excerpt,
  );

  const detail: RunResult["detail"] = [];
  let posted = 0;
  let rejected = 0;
  let errors = 0;

  for (const draft of generation.posts) {
    // Guardrail failed → log the rejection but never post.
    if (!draft.verdict.passed) {
      rejected += 1;
      // Cast to any: social_posts is a new table (migration 082) —
      // the generated Supabase types don't know about it until Jim
      // runs `supabase gen types` post-migration. Same pattern as
      // la_energy_stats in src/lib/programmatic/local-energy-stats.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("social_posts").insert({
        platform: draft.platform,
        pillar,
        blog_post_slug: post.slug,
        content: draft.text,
        link_url: linkUrl,
        factual_check_passed: false,
        error: draft.verdict.reason,
      });
      detail.push({
        platform: draft.platform,
        outcome: "rejected",
        reason: draft.verdict.reason,
      });
      continue;
    }

    const service = PLATFORM_TO_SERVICE[draft.platform];
    let channelId: string | null;
    try {
      channelId = await findChannelId(service);
    } catch (err) {
      // Buffer API itself failed (auth expired, network). This
      // affects the whole run, not just this platform — surface
      // as an error rather than masking as "no_channel".
      errors += 1;
      const reason = err instanceof Error ? err.message : String(err);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("social_posts").insert({
        platform: draft.platform,
        pillar,
        blog_post_slug: post.slug,
        content: draft.text,
        link_url: linkUrl,
        factual_check_passed: true,
        error: `buffer listChannels failed: ${reason}`,
      });
      detail.push({ platform: draft.platform, outcome: "error", reason });
      continue;
    }
    if (!channelId) {
      // Buffer is reachable but this platform isn't connected —
      // log for visibility, no error count (Jim may have dropped it).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("social_posts").insert({
        platform: draft.platform,
        pillar,
        blog_post_slug: post.slug,
        content: draft.text,
        link_url: linkUrl,
        factual_check_passed: true,
        error: "no channel connected in Buffer",
      });
      detail.push({ platform: draft.platform, outcome: "no_channel" });
      continue;
    }

    try {
      const result = await bufferCreatePost({
        channelId,
        text: draft.text,
      });
      posted += 1;
      // Cast to any: social_posts is a new table (migration 082) —
      // the generated Supabase types don't know about it until Jim
      // runs `supabase gen types` post-migration. Same pattern as
      // la_energy_stats in src/lib/programmatic/local-energy-stats.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("social_posts").insert({
        platform: draft.platform,
        pillar,
        blog_post_slug: post.slug,
        content: draft.text,
        link_url: linkUrl,
        buffer_update_id: result.id,
        factual_check_passed: true,
      });
      detail.push({
        platform: draft.platform,
        outcome: "posted",
        buffer_update_id: result.id,
      });
    } catch (err) {
      errors += 1;
      const reason = err instanceof Error ? err.message : String(err);
      // Cast to any: social_posts is a new table (migration 082) —
      // the generated Supabase types don't know about it until Jim
      // runs `supabase gen types` post-migration. Same pattern as
      // la_energy_stats in src/lib/programmatic/local-energy-stats.ts.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin as any).from("social_posts").insert({
        platform: draft.platform,
        pillar,
        blog_post_slug: post.slug,
        content: draft.text,
        link_url: linkUrl,
        factual_check_passed: true,
        error: `buffer create failed: ${reason}`,
      });
      detail.push({ platform: draft.platform, outcome: "error", reason });
    }
  }

  const result: RunResult = {
    pillar,
    blog_post_slug: post.slug,
    attempted: generation.posts.length,
    posted,
    rejected,
    errors,
    detail,
  };
  console.log("[cron/social-agent] complete", result);
  return result;
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    console.error("[cron/social-agent] CRON_SECRET not configured");
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
  // Diagnostic modes — don't publish anything, just introspect.
  //   ?debug=channels — list every Buffer channel + its raw service
  //                     string so we can align PLATFORM_TO_SERVICE.
  const debug = url.searchParams.get("debug");
  if (debug === "channels") {
    try {
      const { listChannels } = await import("@/lib/services/buffer");
      const channels = await listChannels(true);
      return NextResponse.json({
        connected: channels.length,
        channels: channels.map((c) => ({
          service: c.service,
          name: c.name,
          id: c.id,
        })),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }
  // Probe: try multiple GraphQL query shapes against the current
  // token and report which succeed. Used to identify what a
  // narrowly-scoped Personal Access Token can actually see.
  if (debug === "probe") {
    const token = process.env.BUFFER_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BUFFER_ACCESS_TOKEN not set" },
        { status: 500 },
      );
    }
    const probes: Array<{ name: string; query: string }> = [
      {
        name: "account_bare",
        query: `query { account { id } }`,
      },
      {
        name: "account_current_organization",
        query: `query { account { id currentOrganization { id name } } }`,
      },
      {
        name: "account_default_organization",
        query: `query { account { id defaultOrganization { id name } } }`,
      },
      {
        name: "account_all_fields",
        query: `query { account { id email name } }`,
      },
      {
        name: "introspect_account_type",
        query: `query { __type(name: "Account") { name fields { name type { name kind ofType { name kind } } } } }`,
      },
    ];
    const results: Array<Record<string, unknown>> = [];
    for (const p of probes) {
      try {
        const res = await fetch("https://api.buffer.com", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ query: p.query }),
        });
        const body = (await res.json()) as {
          data?: unknown;
          errors?: Array<{ message: string }>;
        };
        results.push({
          probe: p.name,
          status: res.status,
          ok: !body.errors,
          errors: body.errors?.map((e) => e.message) ?? null,
          data: body.data,
        });
      } catch (err) {
        results.push({
          probe: p.name,
          status: 0,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return NextResponse.json({ probes: results });
  }
  try {
    const result = await run(req);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[cron/social-agent] fatal", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
