// /enterprise — public marketing page for the installer surface.
// Currently lives at /enterprise (legacy URL); links from the
// SiteHeader nav as "For installers".
//
// Pitch: "everything you need to quote remotely + only send an
// engineer when the numbers justify it" — backed by the actual
// feature set that's shipped (not the "coming soon" placeholders
// the original page had).

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CreditCard,
  FileText,
  Gift,
  Inbox,
  KeyRound,
  MessageCircle,
  Receipt,
  Send,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { INSTALLER_FREE_STARTER_CREDITS } from "@/lib/booking/credits";

export const metadata = {
  title: "For installers — Propertoasty",
  description:
    "Pre-survey reports, lead routing, written quotes, and CRM API access for MCS-certified UK heat pump and solar installers. " +
    `Free to start — ${INSTALLER_FREE_STARTER_CREDITS} credits on signup.`,
};

export default function EnterprisePage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
        <HowItWorks />
        <FreeStarterStrip />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 pt-16 sm:pt-24 pb-12 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1 text-xs text-slate-600 shadow-sm">
        <Sparkles className="w-3.5 h-3.5 text-coral" />
        For MCS installers
      </div>
      <h1 className="mt-6 text-4xl sm:text-5xl text-navy leading-tight font-bold tracking-tight">
        Quote remotely.
        <br />
        Visit only when it&rsquo;s worth it.
      </h1>
      <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
        Every UK homeowner who completes a Propertoasty check generates
        a structured pre-survey report — EPC, roof, sizing, BUS-grant
        eligibility, suggested kit. You get the report, the contact
        details, and the tools to quote the lead without leaving your
        desk.
      </p>
      <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center items-center">
        <Link
          href="/installer-signup"
          className="inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold transition-colors shadow-sm"
        >
          Claim your free profile
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-2 h-12 px-5 rounded-full text-navy hover:bg-coral-pale transition-colors font-medium"
        >
          See pricing
        </Link>
      </div>
      <p className="mt-4 text-xs text-slate-500">
        {INSTALLER_FREE_STARTER_CREDITS} free credits on signup · No
        contract · Credits never expire
      </p>
    </section>
  );
}

// ─── Feature grid ─────────────────────────────────────────────────

function FeatureGrid() {
  const features = [
    {
      icon: <Inbox className="w-5 h-5" />,
      title: "Lead inbox",
      body: "Homeowner picks you from the directory at the end of their check. Accept or reschedule from one tap.",
    },
    {
      icon: <Send className="w-5 h-5" />,
      title: "Pre-survey requests",
      body: "Send your own customers a personalised check link. The completed report comes back into your inbox auto-accepted.",
    },
    {
      icon: <FileText className="w-5 h-5" />,
      title: "Pre-survey reports",
      body: "Every accepted lead unlocks the full pre-survey: EPC, roof, sizing, BUS grant, recommended kit. Search across them all.",
    },
    {
      icon: <Receipt className="w-5 h-5" />,
      title: "Written quotes",
      body: "Line-item builder with VAT toggle, BUS-grant capping, cover note. Homeowner accepts or declines on a tokenised page — no login needed.",
    },
    {
      icon: <MessageCircle className="w-5 h-5" />,
      title: "Homeowner messages",
      body: "Customers can ask questions or request a callback right from the quote. You get the email, hit Reply, done.",
    },
    {
      icon: <CalendarDays className="w-5 h-5" />,
      title: "Availability + meetings",
      body: "Set the times you can take site visits. Calendar invites attached to every confirmed booking.",
    },
    {
      icon: <TrendingUp className="w-5 h-5" />,
      title: "Performance dashboard",
      body: "Last 3 months: leads in, quotes sent, quotes accepted, conversion rates, source breakdown.",
    },
    {
      icon: <CreditCard className="w-5 h-5" />,
      title: "Billing + VAT receipts",
      body: "Consolidated monthly ledger, downloadable VAT receipts per Stripe purchase, CSV export for accountants.",
    },
    {
      icon: <KeyRound className="w-5 h-5" />,
      title: "API access",
      body: "Fire pre-survey requests from your CRM. Bearer-auth, JSON in, JSON out. Same 1-credit-per-call rate as the dashboard.",
    },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 mb-16">
      <h2 className="text-2xl sm:text-3xl text-navy text-center mb-3 font-bold tracking-tight">
        Everything in one portal
      </h2>
      <p className="text-sm text-slate-600 text-center max-w-2xl mx-auto mb-10">
        Built for MCS-certified UK installers doing heat pumps + solar
        + battery. No bolt-ons, no second tool to learn — every piece
        below is live today.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((f) => (
          <FeatureCard key={f.title} {...f} />
        ))}
      </div>
    </section>
  );
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark mb-3">
        {icon}
      </span>
      <h3 className="text-base font-semibold text-navy">{title}</h3>
      <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
        {body}
      </p>
    </div>
  );
}

// ─── How it works ─────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section className="bg-cream-deep border-y border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-20">
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral">
            How it works
          </p>
          <h2 className="mt-3 text-3xl sm:text-4xl text-navy font-bold tracking-tight">
            Four steps from sign-up to first quote.
          </h2>
        </div>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-4 gap-6">
          <Step
            n="01"
            title="Claim your MCS profile"
            body="Find your company in the directory, claim it in 30 seconds. No paperwork."
          />
          <Step
            n="02"
            title="Get 30 free credits"
            body="Granted automatically the moment your claim completes. ~6 leads OR 30 pre-survey sends, on us."
          />
          <Step
            n="03"
            title="Set your availability"
            body="Pick the slots you can take site visits. Without this, the directory won't route any leads to you."
          />
          <Step
            n="04"
            title="Win + quote leads"
            body="Accept the leads that fit, send written quotes from the report, get accept/decline back via email."
          />
        </div>
      </div>
    </section>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white border border-[var(--border)] p-6">
      <span className="text-xs font-semibold text-[var(--muted-brand)] tabular-nums">
        {n}
      </span>
      <h3 className="mt-4 text-lg text-navy font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[var(--muted-brand)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}

// ─── Free starter strip ───────────────────────────────────────────

function FreeStarterStrip() {
  return (
    <section className="mx-auto max-w-4xl px-4 sm:px-6 py-16">
      <div className="rounded-3xl border border-coral/30 bg-coral-pale/40 p-6 sm:p-8 flex items-start gap-4">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-coral-dark shrink-0">
          <Gift className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-coral-dark">
            Free to start
          </p>
          <h2 className="mt-1 text-xl sm:text-2xl text-navy leading-tight font-bold">
            {INSTALLER_FREE_STARTER_CREDITS} credits on the house
          </h2>
          <p className="mt-2 text-sm text-slate-700 leading-relaxed">
            Granted automatically when you claim your profile. Use
            them to accept your first ~6 leads or send your first 30
            customer check links — no card on file required until
            you&rsquo;re ready to scale.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/installer-signup"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs transition-colors"
            >
              Claim my profile
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 sm:px-6 pb-24">
      <div className="rounded-3xl bg-coral text-cream p-10 sm:p-14 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          aria-hidden
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-terracotta blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-[var(--sage)] blur-3xl" />
        </div>
        <div className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cream/15 text-cream text-xs font-semibold mb-4">
            <Zap className="w-3 h-3" />
            Live today
          </span>
          <h2 className="text-3xl sm:text-4xl">
            Ready to take warmer leads?
          </h2>
          <p className="mt-4 text-cream/85 max-w-xl mx-auto">
            Find your MCS company, claim it in 30 seconds,{" "}
            {INSTALLER_FREE_STARTER_CREDITS} free credits land in your
            balance immediately.
          </p>
          <Link
            href="/installer-signup"
            className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-full bg-cream text-coral-dark hover:bg-cream-deep font-semibold transition-colors"
          >
            Find my MCS profile
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-5 text-xs text-cream/70 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3" />
            UK MCS-certified installers only
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
