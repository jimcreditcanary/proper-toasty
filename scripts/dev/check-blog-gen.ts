// Query blog_gen_runs + blog_posts for anything the recent smoke
// test produced (client-side fetch may have timed out even if the
// server-side cron completed).

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();

  console.log("── blog_gen_runs (last 5) ──\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: runs } = await (admin as any)
    .from("blog_gen_runs")
    .select("pillar, topic, status, blog_post_slug, error, word_count, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  for (const r of (runs ?? []) as Array<{
    pillar: string;
    topic: string;
    status: string;
    blog_post_slug: string | null;
    error: string | null;
    word_count: number | null;
    created_at: string;
  }>) {
    console.log(`[${r.created_at.slice(0, 19)}] ${r.status.padEnd(10)} ${r.pillar}`);
    console.log(`   topic: ${r.topic}`);
    if (r.blog_post_slug) console.log(`   slug:  /blog/${r.blog_post_slug}`);
    if (r.error) console.log(`   error: ${r.error}`);
    if (r.word_count) console.log(`   words: ${r.word_count}`);
    console.log();
  }

  console.log("── blog_posts newest 5 (any pillar) ──\n");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: posts } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, published, published_at, category")
    .order("published_at", { ascending: false })
    .limit(5);
  for (const p of (posts ?? []) as Array<{
    slug: string;
    title: string;
    excerpt: string;
    published: boolean;
    published_at: string | null;
    category: string;
  }>) {
    console.log(`[${p.published_at?.slice(0, 19) ?? "-"}] ${p.category.padEnd(15)} /blog/${p.slug}`);
    console.log(`   ${p.title}`);
    console.log();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
