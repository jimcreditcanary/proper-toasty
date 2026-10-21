// Fire the blog generator with an explicit pillar, print the run
// result, then pull the newly-published post from blog_posts so
// we can eyeball voice + structure without visiting the site.

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

const pillar = process.argv[2] ?? "heat_pump";

async function main() {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("CRON_SECRET not set");
    process.exit(1);
  }
  const url = `https://www.propertoasty.com/api/cron/blog-generator?pillar=${pillar}`;
  console.log(`▶  ${url}\n`);
  const started = Date.now();
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);
  const body = await res.json();
  console.log(`HTTP ${res.status} in ${elapsed}s\n`);
  console.log(JSON.stringify(body, null, 2));

  const slug = (body as { blog_post_slug?: string | null }).blog_post_slug;
  if (!slug) {
    console.log("\n(no post published — see reason above)");
    return;
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("blog_posts")
    .select("slug, title, excerpt, category, sources, content")
    .eq("slug", slug)
    .maybeSingle();

  if (!data) {
    console.log(`\n(post ${slug} not found in blog_posts — something odd)`);
    return;
  }

  const row = data as {
    slug: string;
    title: string;
    excerpt: string;
    category: string;
    sources: Array<{ name: string; url: string }> | null;
    content: string;
  };

  console.log("\n════════ PUBLISHED POST ════════\n");
  console.log(`URL:      https://www.propertoasty.com/blog/${row.slug}`);
  console.log(`Title:    ${row.title}`);
  console.log(`Excerpt:  ${row.excerpt}`);
  console.log(`Category: ${row.category}`);
  console.log(`Sources:  ${(row.sources ?? []).length}`);
  for (const s of row.sources ?? []) console.log(`   - ${s.name}: ${s.url}`);
  console.log("\n── Content (first 800 chars) ──\n");
  console.log(row.content.slice(0, 800));
  const h2s = (row.content.match(/<h2[^>]*>([^<]+)<\/h2>/gi) ?? []).map((m) =>
    m.replace(/<[^>]+>/g, ""),
  );
  console.log(`\n── H2s (${h2s.length}) ──`);
  for (const h of h2s) console.log(`   • ${h}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
