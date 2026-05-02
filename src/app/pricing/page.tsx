// Public pricing surface. Lives at /pricing (linked from the
// SiteHeader nav + the installer-signup landing). Renders the same
// CREDIT_PACKS the dashboard's Buy-Credits modal does, so prices
// can never drift between the two surfaces.
//
// Headline pitch: free to start (the 30-credit grant on first
// claim), then per-pack pricing once they scale. No subscriptions,
// no contracts — credits don't expire either.

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Inbox,
  Send,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import {
  CREDIT_PACKS,
  formatGbp,
  type CreditPack,
} from "@/lib/billing/credit-packs";
import {
  LEAD_ACCEPT_COST_CREDITS,
  PRESURVEY_REQUEST_COST_CREDITS,
  INSTALLER_FREE_STARTER_CREDITS,
} from "@/lib/booking/credits";

export const metadata = {
  title: "Pricing — Propertoasty for installers",
  description: `Free to start — ${INSTALLER_FREE_STARTER_CREDITS} credits on the house. Pay-as-you-go credit packs, no subscriptions.`,
};

export default function PricingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <SiteHeader />

      <main className="flex-1">
        <Hero />
        <FreeStarterCallout />
        <WhatCreditsBuy />
        <PackTiles />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

// ─── Hero ──────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-coral" />
        Pricing for installers
      </div>
      <h1 className="mt-6 text-4xl sm:text-5xl text-navy leading-tight font-bold tracking-tight">
        Free to start.
        <br />
        Pay only when you scale.
      </h1>
      <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        New installers get{" "}
        <strong className="text-navy">
          {INSTALLER_FREE_STARTER_CREDITS} free credits
        </strong>{" "}
        on signup — enough to genuinely try the platform before
        spending a penny. No subscriptions, no contracts, credits
        never expire.
      </p>
    </section>
  );
}

// ─── Free starter callout ──────────────────────────────────────────

function FreeStarterCallout() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 mb-16">
      <div className="rounded-3xl border border-coral/30 bg-coral-pale/40 p-6 sm:p-8 flex items-start gap-4">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-coral-dark shrink-0 text-2xl">
          🎁
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-coral-dark">
            Your starter pack
          </p>
          <h2 className="mt-1 text-2xl sm:text-3xl text-navy leading-tight">
            {INSTALLER_FREE_STARTER_CREDITS} credits, on the house
          </h2>
          <p className="mt-3 text-slate-700 leading-relaxed">
            Granted automatically the moment you claim your MCS
            profile. Use them how you like:
          </p>
          <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" />
              <span>
                <strong>
                  ~
                  {Math.floor(
                    INSTALLER_FREE_STARTER_CREDITS /
                      LEAD_ACCEPT_COST_CREDITS,
                  )}{" "}
                  lead accepts
                </strong>{" "}
                ({LEAD_ACCEPT_COST_CREDITS} credits each), <em>or</em>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" />
              <span>
                <strong>
                  {INSTALLER_FREE_STARTER_CREDITS / PRESURVEY_REQUEST_COST_CREDITS}{" "}
                  pre-survey sends
                </strong>{" "}
                ({PRESURVEY_REQUEST_COST_CREDITS} credit each), <em>or</em>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-coral mt-0.5 shrink-0" />
              <span>Any combination of the two</span>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── What credits buy ──────────────────────────────────────────────

function WhatCreditsBuy() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 mb-16">
      <h2 className="text-2xl sm:text-3xl text-navy text-center mb-3 font-bold tracking-tight">
        How credits work
      </h2>
      <p className="text-sm text-slate-600 text-center max-w-xl mx-auto mb-8">
        One credit pool covers everything. Spend on the actions you
        actually use, in any mix.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <CostCard
          icon={<Inbox className="w-5 h-5" />}
          credits={LEAD_ACCEPT_COST_CREDITS}
          label="per accepted lead"
          body="Charged on accept, never on the original notification. Reschedule + decline are free."
        />
        <CostCard
          icon={<Send className="w-5 h-5" />}
          credits={PRESURVEY_REQUEST_COST_CREDITS}
          label="per pre-survey send"
          body="One credit per email out — 72-hour cooling-off prevents accidental double-billing on resends."
        />
        <CostCard
          icon={<Zap className="w-5 h-5" />}
          credits={PRESURVEY_REQUEST_COST_CREDITS}
          label="per API call"
          body="POST /api/v1/pre-survey-requests from your CRM. Same charge as the dashboard form."
        />
      </div>
      <p className="text-xs text-slate-500 text-center mt-6">
        Quote sends, lead messaging, report viewing, performance
        dashboards, billing exports — <strong>all free</strong>.
        You only spend credits on the actions that drive customer
        outreach.
      </p>
    </section>
  );
}

function CostCard({
  icon,
  credits,
  label,
  body,
}: {
  icon: React.ReactNode;
  credits: number;
  label: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-coral-pale text-coral-dark">
          {icon}
        </span>
      </div>
      <p className="text-3xl font-bold text-navy leading-none">
        {credits} <span className="text-sm font-normal text-slate-500">credit{credits === 1 ? "" : "s"}</span>
      </p>
      <p className="text-xs text-slate-500 mt-1 mb-3">{label}</p>
      <p className="text-sm text-slate-700 leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Pack tiles ────────────────────────────────────────────────────

function PackTiles() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 mb-16">
      <h2 className="text-2xl sm:text-3xl text-navy text-center mb-3 font-bold tracking-tight">
        Top up when you&rsquo;re ready
      </h2>
      <p className="text-sm text-slate-600 text-center max-w-xl mx-auto mb-10">
        All packs are one-off purchases — no recurring billing. Buy
        bigger packs for a better per-credit rate.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {CREDIT_PACKS.map((pack) => (
          <PackTile key={pack.id} pack={pack} />
        ))}
      </div>
      <p className="text-xs text-slate-500 text-center mt-6">
        Prices are inclusive of UK VAT. Auto top-up available once
        you&rsquo;ve made your first purchase — never run out
        mid-quote.
      </p>
    </section>
  );
}

function PackTile({ pack }: { pack: CreditPack }) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 flex flex-col h-full ${
        pack.highlight
          ? "border-coral bg-white shadow-md ring-2 ring-coral/20"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-center justify-between mb-2 flex-wrap gap-1">
        <h3 className="text-base font-semibold text-navy">
          {pack.label}
        </h3>
        {pack.highlight && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-coral text-white">
            Most popular
          </span>
        )}
      </div>
      <p className="text-3xl sm:text-4xl font-bold text-navy leading-none">
        {formatGbp(pack.pricePence)}
      </p>
      <p className="text-xs text-slate-500 mt-1 mb-4">
        £{pack.perCreditGbp.toFixed(2)}/credit
      </p>
      <p className="text-sm text-slate-700 mb-3">
        <strong>{pack.credits.toLocaleString("en-GB")}</strong>{" "}
        credits
      </p>
      <p className="text-xs text-slate-500 leading-relaxed flex-1">
        {pack.tagline}
      </p>
      <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] text-slate-500">
        {pack.credits / LEAD_ACCEPT_COST_CREDITS} leads ·{" "}
        {pack.credits} pre-survey sends
      </div>
    </div>
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────

function Faq() {
  const items = [
    {
      q: "Do credits expire?",
      a: "No. Once they're in your account they stay there until you spend them.",
    },
    {
      q: "Is there a contract or subscription?",
      a: "No. Top-ups are one-off purchases. Auto top-up is opt-in and can be turned off any time.",
    },
    {
      q: "What happens if I run out mid-quote?",
      a: "Quote sends and homeowner messaging are always free. You only spend credits on accepting leads and sending pre-survey emails — top up takes 30 seconds via Stripe Checkout.",
    },
    {
      q: "Are prices VAT-inclusive?",
      a: "Yes — every figure on this page is the total you pay. VAT receipts are downloadable from the Billing page once you've signed up.",
    },
    {
      q: "Can I get a refund?",
      a: "Unspent credits aren't refundable — but they don't expire either, so you'll always be able to use them. If something goes wrong with a specific transaction, drop us a note and we'll sort it.",
    },
    {
      q: "Is there a per-installer team plan?",
      a: "Not yet — every installer profile is a single account today. If you're running a multi-engineer outfit and want shared credits or seat-based access, get in touch.",
    },
  ];
  return (
    <section className="mx-auto max-w-3xl px-4 sm:px-6 mb-16">
      <h2 className="text-2xl sm:text-3xl text-navy text-center mb-8 font-bold tracking-tight">
        Common questions
      </h2>
      <div className="space-y-3">
        {items.map((it) => (
          <details
            key={it.q}
            className="rounded-xl border border-slate-200 bg-white p-4 group"
          >
            <summary className="cursor-pointer text-sm font-semibold text-navy flex items-center justify-between">
              {it.q}
              <span className="text-coral text-xs ml-2 group-open:rotate-180 transition-transform">
                ▼
              </span>
            </summary>
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              {it.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      <div className="rounded-3xl bg-coral text-cream p-10 sm:p-14 text-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden>
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-cream text-coral-dark mb-3 text-2xl">
            <TrendingUp className="w-5 h-5" />
          </span>
          <h2 className="text-3xl sm:text-4xl">
            Claim your profile + your free credits
          </h2>
          <p className="mt-4 text-cream/85 max-w-xl mx-auto">
            Find your MCS-listed company, claim it in 30 seconds,
            and {INSTALLER_FREE_STARTER_CREDITS} credits land in
            your balance the moment the claim completes.
          </p>
          <Link
            href="/installer-signup"
            className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
          >
            Find my MCS profile
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-5 text-xs text-cream/70">
            Already signed up?{" "}
            <Link href="/auth/login" className="underline hover:no-underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-cream-deep">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
        <div>
          <p className="font-bold text-navy mb-2">Propertoasty</p>
          <p className="text-xs text-[var(--muted-brand)] leading-relaxed max-w-xs">
            UK pre-survey + lead-routing platform for MCS-certified
            heat pump and solar installers.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">
            Product
          </p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li>
              <Link href="/installer-signup" className="hover:text-navy">
                Sign up
              </Link>
            </li>
            <li>
              <Link href="/auth/login" className="hover:text-navy">
                Sign in
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-navy">
                Pricing
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-navy mb-3">
            Legal
          </p>
          <ul className="space-y-2 text-[var(--muted-brand)]">
            <li>
              <Link href="/privacy" className="hover:text-navy">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-navy">
                Terms
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--border)] bg-cream">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 text-xs text-[var(--muted-brand)] text-center">
          © {year} Propertoasty
        </div>
      </div>
    </footer>
  );
}

