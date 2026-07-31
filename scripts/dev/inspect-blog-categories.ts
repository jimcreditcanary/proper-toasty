// One-off diagnostic: dump distinct categories in blog_posts +
// a couple of sample slugs per category, so we can tune the
// pillar-mapping in src/lib/social/pillars.ts against reality.

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  // Cast to any: the local generated Supabase types miss this
  // column shape for blog_posts (they're regenerated on prod).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("blog_posts")
    .select("category, slug, title, published, published_at")
    .eq("published", true)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) {
    console.error("Query failed:", error);
    process.exit(1);
  }
  const posts = (data ?? []) as Array<{
    category: string | null;
    slug: string;
    title: string;
  }>;
  console.log(`Total published posts: ${posts.length}\n`);
  const byCategory = new Map<string, { count: number; samples: string[] }>();
  for (const p of posts) {
    const cat = p.category ?? "(null)";
    const entry = byCategory.get(cat) ?? { count: 0, samples: [] };
    entry.count += 1;
    entry.samples.push(p.slug);
    byCategory.set(cat, entry);
  }
  const sorted = [...byCategory.entries()].sort((a, b) => b[1].count - a[1].count);
  for (const [cat, { count, samples }] of sorted) {
    console.log(`[${count}] ${cat}`);
    for (const s of samples) console.log(`      /blog/${s}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
