// Fires the social agent with an explicit pillar + persona,
// prints the run result, then queries social_posts to dump
// the actual post text so Jim can eyeball voice + structure.

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

const pillar = process.argv[2] ?? "heat_pump";
const persona = process.argv[3] ?? "myth_buster";

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET not set");
    process.exit(1);
  }
  const url = `https://www.propertoasty.com/api/cron/social-agent?pillar=${pillar}&persona=${persona}`;
  console.log(`▶  ${url}\n`);
  const started = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const body = await res.json();
  console.log(`HTTP ${res.status} in ${elapsed}s\n`);
  console.log(JSON.stringify(body, null, 2));

  // Pull the actual post text from social_posts so we can read
  // what Sonnet actually wrote (the API response only returns
  // counts + buffer ids).
  const slug = (body as { blog_post_slug?: string | null }).blog_post_slug;
  if (!slug) {
    console.log("\n(no blog post — nothing logged)");
    return;
  }
  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("social_posts")
    .select("platform, content, error, factual_check_passed, posted_at")
    .eq("blog_post_slug", slug)
    .order("posted_at", { ascending: false })
    .limit(4);
  console.log("\n════════ DRAFT TEXT ════════\n");
  for (const row of (data ?? []) as Array<{
    platform: string;
    content: string;
    error: string | null;
    factual_check_passed: boolean;
  }>) {
    const status = row.factual_check_passed
      ? row.error
        ? "⚠️  ERROR"
        : "✅  POSTED / OR LOGGED"
      : "❌  REJECTED";
    console.log(`── ${row.platform.toUpperCase()} — ${status}`);
    if (row.error) console.log(`   reason: ${row.error}`);
    console.log(row.content);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
