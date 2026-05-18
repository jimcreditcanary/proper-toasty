// POST /api/installer/onboarding/blog/publish
//
// Publishes the (possibly edited) draft to blog_posts. Grants
// tier-dependent credits for the questions step (per Phase 5
// model — answers submitted = stamp only, blog published = credits).
//
// Slug collisions: blog_posts.slug is UNIQUE. We append `-2`, `-3`
// etc until we land a free slug. Better than 500-ing on the user.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { grantOnboardingStep } from "@/lib/outreach/onboarding";

type AdminClient = ReturnType<typeof createAdminClient>;

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestSchema = z.object({
  title: z.string().min(8).max(150),
  slug: z.string().min(3).max(80).regex(/^[a-z0-9-]+$/),
  excerpt: z.string().min(20).max(300),
  markdown: z.string().min(200).max(20000),
});

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "Sign in required" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return NextResponse.json(
      { ok: false, error: "No installer bound to this account" },
      { status: 403 },
    );
  }

  // Find a free slug. UNIQUE constraint on blog_posts.slug means
  // collisions raise 23505 — catch + retry with a numeric suffix.
  const slug = await findFreeSlug(admin, parsed.data.slug);

  // blog_posts isn't in the typed Database schema (admin-only
  // surface). Drop to untyped for the insert — matches the
  // existing pattern in /api/admin/blog/route.ts.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertErr } = await (admin as any)
    .from("blog_posts")
    .insert({
      slug,
      title: parsed.data.title,
      excerpt: parsed.data.excerpt,
      content: parsed.data.markdown,
      category: "Installer Voices",
      author: installer.company_name,
      published: true,
      published_at: new Date().toISOString(),
      installer_id: installer.id,
      is_installer_profile: true,
    });
  if (insertErr) {
    console.error("[onboarding/blog/publish] insert failed", insertErr);
    return NextResponse.json(
      { ok: false, error: "Couldn't publish the post — try again" },
      { status: 500 },
    );
  }

  // Grant credits + stamp milestone.
  const grant = await grantOnboardingStep(admin, {
    userId: user.id,
    installerId: installer.id,
    step: "blog",
  });

  return NextResponse.json({
    ok: true,
    slug,
    creditsGranted: grant.creditsGranted,
    newBalance: grant.newBalance,
  });
}

async function findFreeSlug(admin: AdminClient, base: string): Promise<string> {
  let candidate = base;
  let suffix = 2;
  for (let attempts = 0; attempts < 20; attempts++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (admin as any)
      .from("blog_posts")
      .select("slug")
      .eq("slug", candidate)
      .maybeSingle();
    if (!data) return candidate;
    candidate = `${base}-${suffix}`;
    suffix++;
  }
  // Pathological case (20 collisions for the same slug) — append a
  // millisecond-resolution timestamp so we never block the user.
  return `${base}-${Date.now().toString(36)}`;
}
