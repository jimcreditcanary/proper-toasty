// /installer/onboarding — the four-step setup flow.
//
// Lands here after auth-callback when an outreach claim succeeded
// (auth-callback redirects). Self-claim installers can also reach
// it via the dashboard nav — they just see no per-step credit
// promises (the tier-credit machinery no-ops without an outreach
// recipient row).
//
// This page is the OVERVIEW. Each step is its own sub-route
// (/profile, /questions, /card) so the URL is bookmarkable +
// browser-back works as expected.

import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  CheckCircle2,
  Circle,
  Sparkles,
  ArrowRight,
  Image as ImageIcon,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { loadOnboardingState } from "@/lib/outreach/onboarding";
import { tierLabel, tierCredits } from "@/lib/outreach/tier-preview";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/onboarding");
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();

  // No bound installer = nothing to onboard. Send them to the
  // self-claim flow instead.
  if (!installer) {
    redirect("/installer-signup");
  }

  const state = await loadOnboardingState(admin, user.id, installer.id);

  // Once every step is done, we don't keep flogging this page —
  // bounce to the dashboard.
  if (state.isComplete) {
    redirect("/installer?onboarded=1");
  }

  const totalCredits = state.tier ? tierCredits(state.tier) : null;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Get set up"
      pageSubtitle="Four quick steps to finish setting up your profile."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {state.tier && totalCredits != null && (
        <section className="rounded-2xl border border-coral/40 bg-coral-pale/30 p-5 sm:p-6 mb-6 flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white text-coral-dark">
            <Sparkles className="w-5 h-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-coral">
              {tierLabel(state.tier)} tier · up to {totalCredits} credits
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-navy leading-tight mt-1">
              Finish your setup to unlock the full offer
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              You&rsquo;ve already got 30 starter credits from signup.
              Complete the steps below to earn the rest.
            </p>
          </div>
        </section>
      )}

      <ol className="space-y-3">
        <StepCard
          number={1}
          icon={<ImageIcon className="w-5 h-5" />}
          title="Complete your profile"
          body="Logo, services confirmation, coverage areas, short bio. Powers how you appear on directory pages."
          credits={state.steps.profile.credits}
          completed={state.steps.profile.completed}
          href="/installer/onboarding/profile"
        />
        <StepCard
          number={2}
          icon={<MessageSquare className="w-5 h-5" />}
          title="Answer 6 questions"
          body="We use your answers to draft a personal-voice blog post under your byline. You review and approve before publishing."
          credits={state.steps.questions.credits}
          completed={state.steps.questions.completed && state.steps.blog.completed}
          href="/installer/onboarding/questions"
        />
        <StepCard
          number={3}
          icon={<CreditCard className="w-5 h-5" />}
          title="Connect a card"
          body="For future credit top-ups when you run low. We don't charge anything today — this just saves you re-entering details later."
          credits={state.steps.card.credits}
          completed={state.steps.card.completed}
          href="/installer/onboarding/card"
        />
      </ol>

      <p className="mt-6 text-xs text-slate-500 leading-relaxed text-center">
        You can take these in any order. Come back to /installer/onboarding any time —
        we&rsquo;ll pick up where you left off.
      </p>
    </PortalShell>
  );
}

function StepCard({
  number,
  icon,
  title,
  body,
  credits,
  completed,
  href,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  body: string;
  credits: number;
  completed: boolean;
  href: string;
}) {
  return (
    <li
      className={`rounded-2xl border p-5 sm:p-6 flex items-start gap-4 transition-all ${
        completed
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-slate-200 bg-white hover:border-coral/40 hover:shadow-sm"
      }`}
    >
      <span
        className={`shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl ${
          completed
            ? "bg-emerald-100 text-emerald-700"
            : "bg-coral-pale text-coral-dark"
        }`}
      >
        {completed ? <CheckCircle2 className="w-5 h-5" /> : icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Step {number}
          </span>
          {credits > 0 && !completed && (
            <span className="inline-flex items-center text-[11px] font-bold text-coral-dark bg-coral-pale rounded-full px-2 py-0.5">
              +{credits} credits
            </span>
          )}
          {completed && (
            <span className="inline-flex items-center text-[11px] font-bold text-emerald-700 bg-emerald-100 rounded-full px-2 py-0.5">
              Done
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-navy leading-tight">
          {title}
        </h3>
        <p className="text-xs text-slate-600 mt-1 leading-relaxed">{body}</p>
        <div className="mt-3">
          {completed ? (
            <Link
              href={href}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-navy"
            >
              <Circle className="w-3 h-3" />
              View or edit
            </Link>
          ) : (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-coral hover:bg-coral-dark text-white text-xs font-semibold transition-colors"
            >
              Start
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
