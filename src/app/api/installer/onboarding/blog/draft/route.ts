// POST /api/installer/onboarding/blog/draft
//
// Drafts a personal-voice blog post from the installer's 6
// interview answers using Claude. Saves the answers + draft on
// the most-recent outreach_recipients row (so the user can come
// back + edit later).
//
// Body: { answers: string[], force_redraft?: boolean }
// Returns: { ok: true, title, slug, excerpt, markdown }
//
// Stamps questions_completed_at + persists answers regardless of
// drafting success — the questions step itself is "done" the
// moment they hit submit; the blog draft is the next sub-step
// the user does in-page.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  draftInstallerBlog,
  INTERVIEW_QUESTIONS,
} from "@/lib/outreach/blog-draft";
import { bestEffortFirstName } from "@/lib/outreach/merge-vars";
import {
  primaryRegion,
  primaryTechBucket,
  regionDisplayName,
  techBucketDisplayName,
} from "@/lib/outreach/tier-preview";
import type { Database } from "@/types/database";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  answers: z.array(z.string()).length(INTERVIEW_QUESTIONS.length),
  force_redraft: z.boolean().optional(),
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
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle<InstallerRow>();
  if (!installer) {
    return NextResponse.json(
      { ok: false, error: "No installer bound to this account" },
      { status: 403 },
    );
  }

  const region = primaryRegion(installer);
  const bucket = primaryTechBucket(installer);
  if (!region || !bucket) {
    return NextResponse.json(
      {
        ok: false,
        error: "Installer record missing region or tech capability",
      },
      { status: 400 },
    );
  }

  // Find the most-recent outreach recipient (if any) for this
  // installer so we can persist the draft + answers.
  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, blog_draft_markdown")
    .eq("installer_id", installer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; blog_draft_markdown: string | null }>();

  // Build the answers JSON for persistence.
  const answersJson: Record<string, string> = {};
  parsed.data.answers.forEach((a, i) => {
    answersJson[`q${i + 1}`] = a;
  });

  // Persist answers + stamp questions_completed_at FIRST. The
  // draft generation can fail (Claude timeout, JSON parse error)
  // and we don't want the user to lose their answers if it does.
  if (recipient) {
    await admin
      .from("outreach_recipients")
      .update({
        questions_answers: answersJson,
        questions_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);
  }

  // Draft via Claude.
  let draft;
  try {
    draft = await draftInstallerBlog({
      companyName: installer.company_name,
      installerFirstName: bestEffortFirstName(installer.company_name),
      region: regionDisplayName(region),
      techDisplay: techBucketDisplayName(bucket),
      yearsInBusiness: installer.years_in_business,
      bio: installer.bio,
      answers: parsed.data.answers,
      questions: INTERVIEW_QUESTIONS as string[],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Drafting failed";
    console.error("[onboarding/blog/draft] failed", msg);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 502 },
    );
  }

  // Persist the new draft so review-edits survive refresh.
  if (recipient) {
    await admin
      .from("outreach_recipients")
      .update({
        blog_draft_markdown: draft.markdown,
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);
  }

  return NextResponse.json({
    ok: true,
    title: draft.title,
    slug: draft.slug,
    excerpt: draft.excerpt,
    markdown: draft.markdown,
  });
}
