// One-off: delete social_posts rows created in the last 3 days
// so the 14-day-per-blog cooldown clears for smoke testing.
//
// Safe to run because during dev iteration nearly every row is
// a smoke test — we haven't been posting to real audiences for
// long. Prints what it'd delete + prompts for confirmation via
// CONFIRM=yes env var.

import "@/lib/dev/load-env";
import { createAdminClient } from "@/lib/supabase/admin";

async function main() {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin as any)
    .from("social_posts")
    .select("id, platform, blog_post_slug, posted_at")
    .gte("posted_at", cutoff)
    .order("posted_at", { ascending: false });

  const rows = (data ?? []) as Array<{
    id: string;
    platform: string;
    blog_post_slug: string | null;
    posted_at: string;
  }>;

  console.log(`Would delete ${rows.length} rows created since ${cutoff}\n`);
  for (const r of rows.slice(0, 20)) {
    console.log(`  ${r.posted_at.slice(0, 19)}  ${r.platform.padEnd(10)}  ${r.blog_post_slug ?? "(no slug)"}`);
  }
  if (rows.length > 20) console.log(`  ...and ${rows.length - 20} more`);

  if (process.env.CONFIRM !== "yes") {
    console.log("\nSet CONFIRM=yes to actually delete.");
    return;
  }

  const ids = rows.map((r) => r.id);
  if (ids.length === 0) {
    console.log("Nothing to delete.");
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("social_posts").delete().in("id", ids);
  if (error) {
    console.error("delete failed:", error);
    process.exit(1);
  }
  console.log(`\nDeleted ${ids.length} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
