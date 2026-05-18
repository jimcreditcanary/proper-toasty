// Server-side helpers for the /installer/onboarding flow.
//
// Two concerns:
//   1. "Which steps does this user have left?" — used by the
//      overview page + the per-step pages to gate navigation.
//   2. "Grant the credits + stamp the milestone for step X" —
//      called from each step's API route on submit.
//
// Both branch on whether the user has an outreach_recipients row
// in 'signed_up' state. If yes → outreach flow (credit grants
// scale with assigned_tier). If no → plain onboarding (no extra
// credits beyond the +30 they got at claim).

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { tierStepCredits, type Tier, type OnboardingStep } from "@/lib/outreach/tier-preview";

type AdminClient = SupabaseClient<Database>;

export interface OnboardingState {
  /** Outreach recipient row, when present. NULL = user reached
   *  onboarding via the self-claim path, not via an outreach
   *  campaign. Credit grants no-op when null. */
  recipientId: string | null;
  tier: Tier | null;
  // Each step's completion + per-step credit promise (for the UI).
  steps: {
    profile: { completed: boolean; credits: number };
    questions: { completed: boolean; credits: number };
    blog: { completed: boolean; credits: number };
    card: { completed: boolean; credits: number };
  };
  /** True when every step has fired (regardless of outreach status). */
  isComplete: boolean;
}

/**
 * Load the onboarding state for a user. Returns a default
 * "everything pending, no outreach" shape when the user has no
 * recipient row — used for the plain self-claim onboarding flow.
 */
export async function loadOnboardingState(
  admin: AdminClient,
  userId: string,
  installerId: number,
): Promise<OnboardingState> {
  // Most-recent recipient for this installer (UNIQUE constraint
  // means there's at most one per campaign, but recipients can
  // span campaigns over time).
  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select(
      "id, assigned_tier, profile_completed_at, questions_completed_at, blog_post_completed_at, card_connected_at, signed_up_at",
    )
    .eq("installer_id", installerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{
      id: string;
      assigned_tier: Tier | null;
      profile_completed_at: string | null;
      questions_completed_at: string | null;
      blog_post_completed_at: string | null;
      card_connected_at: string | null;
      signed_up_at: string | null;
    }>();

  // Outreach context = the user signed up via an outreach link
  // (signed_up_at is stamped). Otherwise fall back to no-outreach.
  const isOutreach = recipient != null && recipient.signed_up_at != null;
  const tier = isOutreach ? (recipient!.assigned_tier ?? "standard") : null;

  // For the plain self-claim flow we still render the four steps
  // but with zero credit promises — they get nothing extra beyond
  // the starter +30.
  const cred = (step: OnboardingStep): number =>
    tier ? tierStepCredits(tier, step) : 0;

  const profileDone = recipient?.profile_completed_at != null;
  const questionsDone = recipient?.questions_completed_at != null;
  const blogDone = recipient?.blog_post_completed_at != null;
  const cardDone = recipient?.card_connected_at != null;

  // For non-outreach users, the "completed" state is derived from
  // direct DB signals (logo present, bio present, blog post, etc).
  // For Phase 5 scope we keep it simple: non-outreach users
  // always see all four steps as pending until they manually
  // complete each. (A later pass can fold in side-channel signals
  // like "logo exists" → "profile complete enough".)
  void userId;

  return {
    recipientId: recipient?.id ?? null,
    tier,
    steps: {
      profile: { completed: profileDone, credits: cred("profile") },
      questions: { completed: questionsDone, credits: cred("questions") },
      // Blog is in the same step as questions for credit-grant
      // purposes (questions submitted → blog drafted → review →
      // publish → credits). We expose blog as its own row so the
      // UI can show "answers saved" vs "post published" distinctly.
      blog: { completed: blogDone, credits: 0 },
      card: { completed: cardDone, credits: cred("card") },
    },
    isComplete:
      profileDone && questionsDone && blogDone && cardDone,
  };
}

/**
 * Grant the per-step credit amount for an outreach recipient +
 * stamp the corresponding timestamp. Safe to call without a
 * recipient (no-ops when recipientId is null).
 *
 * Returns the new balance for the caller's UI feedback. Returns
 * null when nothing was granted (no outreach, or step had no
 * credits configured).
 */
export async function grantOnboardingStep(
  admin: AdminClient,
  args: {
    userId: string;
    installerId: number;
    step: OnboardingStep | "blog";
  },
): Promise<{ creditsGranted: number; newBalance: number | null }> {
  const { data: recipient } = await admin
    .from("outreach_recipients")
    .select("id, assigned_tier")
    .eq("installer_id", args.installerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; assigned_tier: Tier | null }>();

  // Stamp the milestone regardless of whether there's an outreach
  // recipient — the timestamp column doubles as the "step done"
  // signal for the UI even on self-claim.
  const stampCol = stampColumnFor(args.step);
  if (recipient) {
    await admin
      .from("outreach_recipients")
      .update({
        [stampCol]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);
  }

  // Credit grants only fire for outreach recipients with an
  // assigned tier. "blog" maps to "questions" for credit purposes
  // — submitting answers is free, publishing the post is when the
  // questions-step credits land.
  if (!recipient || !recipient.assigned_tier) {
    return { creditsGranted: 0, newBalance: null };
  }
  const creditStep: OnboardingStep =
    args.step === "blog" ? "questions" : args.step;
  if (creditStep === "signup") {
    // Signup credits are granted by the existing starter path; we
    // don't double-up here. Returning 0 lets the caller still
    // stamp + show a success banner.
    return { creditsGranted: 0, newBalance: null };
  }
  const delta = tierStepCredits(recipient.assigned_tier, creditStep);
  if (delta <= 0) {
    return { creditsGranted: 0, newBalance: null };
  }

  const { data: newBalance, error } = await admin.rpc(
    "outreach_grant_credits",
    {
      p_user_id: args.userId,
      p_recipient_id: recipient.id,
      p_delta: delta,
      p_reason: `onboarding-${args.step}`,
    },
  );
  if (error) {
    console.error("[onboarding] credit grant failed", {
      step: args.step,
      err: error.message,
    });
    return { creditsGranted: 0, newBalance: null };
  }

  // Maintain credits_granted running total on the recipient row.
  await admin
    .from("outreach_recipients")
    .update({
      credits_granted: (await currentCreditsGranted(admin, recipient.id)) + delta,
      // Flip recipient to 'completed' once all four steps are done.
      ...(await isAllStepsDone(admin, recipient.id) ? { state: "completed" as const } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("id", recipient.id);

  return { creditsGranted: delta, newBalance: newBalance ?? null };
}

function stampColumnFor(
  step: OnboardingStep | "blog",
):
  | "profile_completed_at"
  | "questions_completed_at"
  | "blog_post_completed_at"
  | "card_connected_at"
  | "signed_up_at" {
  switch (step) {
    case "profile":
      return "profile_completed_at";
    case "questions":
      return "questions_completed_at";
    case "blog":
      return "blog_post_completed_at";
    case "card":
      return "card_connected_at";
    case "signup":
      return "signed_up_at";
  }
}

async function currentCreditsGranted(
  admin: AdminClient,
  recipientId: string,
): Promise<number> {
  const { data } = await admin
    .from("outreach_recipients")
    .select("credits_granted")
    .eq("id", recipientId)
    .maybeSingle<{ credits_granted: number }>();
  return data?.credits_granted ?? 0;
}

async function isAllStepsDone(
  admin: AdminClient,
  recipientId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("outreach_recipients")
    .select(
      "profile_completed_at, questions_completed_at, blog_post_completed_at, card_connected_at",
    )
    .eq("id", recipientId)
    .maybeSingle<{
      profile_completed_at: string | null;
      questions_completed_at: string | null;
      blog_post_completed_at: string | null;
      card_connected_at: string | null;
    }>();
  if (!data) return false;
  return (
    data.profile_completed_at != null &&
    data.questions_completed_at != null &&
    data.blog_post_completed_at != null &&
    data.card_connected_at != null
  );
}
