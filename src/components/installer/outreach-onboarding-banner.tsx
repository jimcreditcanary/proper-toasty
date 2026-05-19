import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import type { OnboardingState } from "@/lib/outreach/onboarding";
import { tierLabel, type OnboardingStep } from "@/lib/outreach/tier-preview";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";

// Dashboard banner that nudges outreach-acquired installers to
// finish the remaining onboarding steps and claim the rest of
// their tier-credit pot. Sibling surface to OutreachHero on the
// signup page — same palette + badge pill so the offer feels
// continuous between signup, onboarding, and the dashboard.
//
// Renders nothing when:
//   - the user has no outreach context (state.tier is null), or
//   - every step is done (state.isComplete; outreach_recipients.state
//     has flipped to 'completed' at this point).

export type StepDescriptor = {
  step: Exclude<OnboardingStep, "signup">;
  credits: number;
  short: string;
};

/**
 * Pure helper exported for unit testing — given an OnboardingState,
 * returns the ordered list of credit-bearing steps still pending.
 * Empty array means the banner should not render (either user has
 * no outreach context, every step is done, or no credit-bearing
 * steps remain).
 */
export function computeRemainingSteps(state: OnboardingState): StepDescriptor[] {
  if (!state.tier || state.isComplete) return [];

  const remaining: StepDescriptor[] = [];
  if (!state.steps.profile.completed && state.steps.profile.credits > 0) {
    remaining.push({
      step: "profile",
      credits: state.steps.profile.credits,
      short: "complete your profile",
    });
  }
  // Questions + blog share the same credit grant (lands on the
  // questions step). Treat the pair as one remaining task here.
  const questionsPending =
    !state.steps.questions.completed || !state.steps.blog.completed;
  if (questionsPending && state.steps.questions.credits > 0) {
    remaining.push({
      step: "questions",
      credits: state.steps.questions.credits,
      short: "answer 6 quick questions",
    });
  }
  if (!state.steps.card.completed && state.steps.card.credits > 0) {
    remaining.push({
      step: "card",
      credits: state.steps.card.credits,
      short: "save a card for future top-ups",
    });
  }
  return remaining;
}

/**
 * Translate a credit count into a headline £ value, rounded to the
 * nearest £10. We use the AVERAGE per-credit rate across all four
 * packs in CREDIT_PACKS — the "midpoint" framing is the most honest
 * thing to show in a nudge banner:
 *   - using the cheapest rate (Volume pack) under-sells the value
 *   - using the most expensive rate (Starter pack) over-sells it
 *   - the average lands somewhere a typical installer will recognise
 * If the credit-pack lineup changes, this number moves with it.
 * Rounding to £10 keeps the headline from reading like fake-precise
 * marketing copy (e.g. "£412.85").
 */
export function creditsToHeadlineGbp(credits: number): number {
  const avgRate =
    CREDIT_PACKS.reduce((sum, p) => sum + p.perCreditGbp, 0) /
    CREDIT_PACKS.length;
  const raw = credits * avgRate;
  return Math.round(raw / 10) * 10;
}

export function OutreachOnboardingBanner({
  state,
}: {
  state: OnboardingState;
}) {
  const remaining = computeRemainingSteps(state);

  // Nothing to nudge — let the user move on without a banner.
  // (Covers: no outreach context, all steps done, or standard tier
  // where every per-step credit is 0.)
  if (remaining.length === 0 || !state.tier) return null;

  const totalRemaining = remaining.reduce((s, r) => s + r.credits, 0);
  const headlineGbp = creditsToHeadlineGbp(totalRemaining);

  return (
    <section className="rounded-2xl border border-coral/40 bg-white shadow-sm p-5 sm:p-6 mb-6">
      <div className="flex items-start gap-3 mb-3">
        <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-coral">
            {tierLabel(state.tier)} tier · +{totalRemaining} credits left
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-navy leading-tight mt-1">
            Earn +{totalRemaining} more credits, worth roughly £
            {headlineGbp.toLocaleString("en-GB")}
          </h2>
          <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
            {describeRemaining(remaining)} Takes about 5 minutes.
          </p>
        </div>
      </div>
      <div className="flex justify-end">
        <Link
          href="/installer/onboarding"
          className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Continue onboarding
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  );
}

export function describeRemaining(remaining: StepDescriptor[]): string {
  const parts = remaining.map((r) => `${r.short} (+${r.credits})`);
  if (parts.length === 1) return `${capitalise(parts[0])}.`;
  if (parts.length === 2) return `${capitalise(parts[0])} and ${parts[1]}.`;
  return `${capitalise(parts[0])}, ${parts.slice(1, -1).join(", ")} and ${parts[parts.length - 1]}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
