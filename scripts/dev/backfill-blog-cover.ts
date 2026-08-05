// One-off: pick a Pexels cover for a blog_posts row that was
// generated before the cron started setting cover_image.
// Usage: npx tsx scripts/dev/backfill-blog-cover.ts <slug>

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";
import { pickPhotoDeterministic } from "@/lib/services/pexels";

const slug = process.argv[2];
if (!slug) {
  console.error("usage: npx tsx scripts/dev/backfill-blog-cover.ts <slug>");
  process.exit(1);
}

async function main() {
  const admin = createAdminClient();
  // Simple heuristic: infer pillar from slug so we hit an on-topic
  // Pexels query. For a one-off, this doesn't need to be clever.
  const s = slug.toLowerCase();
  // UK-visual anchors mandatory — Pexels' generic terms pull US suburbs.
  const query = s.includes("boiler") || s.includes("heat-pump") || s.includes("heat_pump")
    ? "brick terraced house uk"
    : s.includes("solar")
      ? "solar panels uk terraced"
      : "british semi detached victorian";

  const cover = await pickPhotoDeterministic({
    query,
    orientation: "landscape",
    seed: slug,
  });
  if (!cover) {
    console.error("no cover fetched — check PEXELS_API_KEY");
    process.exit(1);
  }
  console.log(`chose: ${cover.url}`);
  console.log(`by:    ${cover.photographer} (${cover.pexelsUrl})`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any)
    .from("blog_posts")
    .update({ cover_image: cover.url })
    .eq("slug", slug);
  if (error) {
    console.error("update failed:", error);
    process.exit(1);
  }
  console.log(`updated /blog/${slug} cover_image`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
