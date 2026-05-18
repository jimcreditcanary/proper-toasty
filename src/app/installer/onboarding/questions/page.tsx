// /installer/onboarding/questions — Step 2 of onboarding.
//
// Three-stage flow inside one page (client island handles state):
//   a. Answer the 6 questions
//   b. Submit → Claude drafts a blog post (server, ~10-20s)
//   c. Review + edit the draft → click Publish → post goes live
//      under /blog/<slug>, credits land, step done

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { QuestionsAndDraftFlow } from "./questions-form";
import { INTERVIEW_QUESTIONS } from "@/lib/outreach/blog-draft";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function OnboardingQuestionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/installer/onboarding/questions");

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) redirect("/installer-signup");

  // Load any persisted answers + draft so the user can resume
  // mid-flow. The recipient row (when present) holds these
  // post-m067.
  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, questions_answers, blog_draft_markdown, blog_post_completed_at")
    .eq("installer_id", installer.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      questions_answers: Database["public"]["Tables"]["outreach_recipients"]["Row"]["questions_answers"];
      blog_draft_markdown: string | null;
      blog_post_completed_at: string | null;
    }>();

  const persistedAnswers = parseAnswers(recipient?.questions_answers);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Step 2 — Answer 6 questions"
      pageSubtitle="We use your answers to draft a personal-voice blog post under your byline."
      backLink={{
        href: "/installer/onboarding",
        label: "Back to onboarding",
      }}
    >
      <QuestionsAndDraftFlow
        companyName={installer.company_name}
        questions={INTERVIEW_QUESTIONS as string[]}
        initialAnswers={persistedAnswers}
        initialDraft={recipient?.blog_draft_markdown ?? null}
        alreadyPublished={recipient?.blog_post_completed_at != null}
      />
    </PortalShell>
  );
}

function parseAnswers(
  raw: Database["public"]["Tables"]["outreach_recipients"]["Row"]["questions_answers"] | undefined,
): string[] {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return new Array(INTERVIEW_QUESTIONS.length).fill("");
  }
  const obj = raw as Record<string, unknown>;
  return INTERVIEW_QUESTIONS.map((_, i) => {
    const v = obj[`q${i + 1}`];
    return typeof v === "string" ? v : "";
  });
}
