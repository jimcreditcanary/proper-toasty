import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { LazyWizard } from "@/components/lazy-wizard";
import {
  ShieldCheck,
  Building2,
  Landmark,
  Star,
  ShoppingCart,
  Car,
  ArrowRight,
  Quote,
  CheckCircle2,
  Check,
  Sparkles,
  Zap,
  Crown,
  Gift,
} from "lucide-react";

/* Lightweight server-rendered header for the landing page (no Supabase, no client JS) */
function LandingHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/enterprise" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Enterprise
          </Link>
          <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
            Blog
          </Link>
        </nav>
        <nav className="flex items-center gap-3">
          <Button
            className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg shadow-sm hover:shadow-md transition-all"
            render={<Link href="/verify" />}
          >
            Make a check
          </Button>
          <Button
            variant="ghost"
            className="h-10 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            render={<Link href="/auth/login" />}
          >
            Sign in
          </Button>
        </nav>
      </div>
    </header>
  );
}

const STORIES = [
  {
    quote: "I was about to pay a builder for a kitchen refit. WhoAmIPaying flagged that the bank account didn't match the company name. The invoice had been intercepted. Saved me thousands.",
    name: "Sarah M.",
    role: "Freelance Designer",
    location: "Bristol",
    saved: "3,200",
  },
  {
    quote: "A contractor sent an invoice with a VAT number that had been deregistered 6 months ago. We would never have caught that without running a check first.",
    name: "David K.",
    role: "Property Manager",
    location: "Leeds",
    saved: "8,400",
  },
  {
    quote: "Found a car on Marketplace for a great price. The valuation check showed it was priced 40% below market value — a classic scam sign. I walked away.",
    name: "Rachel T.",
    role: "First-time Buyer",
    location: "Manchester",
    saved: "6,500",
  },
  {
    quote: "After nearly paying a spoofed supplier invoice last year, we now run every new supplier through WhoAmIPaying. 30 seconds for total peace of mind.",
    name: "James P.",
    role: "Small Business Owner",
    location: "Edinburgh",
    saved: "12,000",
  },
];

function TrustpilotStars() {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex size-6 items-center justify-center bg-[#00b67a] rounded">
          <Star className="size-3.5 text-white fill-white" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <LandingHeader />

      {/* ── Hero with embedded wizard ────────────────────────────────── */}
      <section id="free-check" className="relative overflow-hidden" style={{ background: "linear-gradient(155deg, #ffffff 0%, #f8fafc 55%, #eff6ff 100%)" }}>
        {/* Subtle cross grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 25v10M25 30h10' stroke='%23003566' stroke-width='1' opacity='0.03'/%3E%3C/svg%3E")`,
            backgroundSize: "60px 60px",
          }}
        />

        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-16 sm:pt-24 sm:pb-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            {/* Left: copy */}
            <div className="lg:sticky lg:top-24">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 border border-slate-200 px-3 py-1.5 mb-6">
                <ShieldCheck className="size-4 text-coral" />
                <span className="text-sm font-medium text-slate-700">Same technology used by banks</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.1]">
                Know exactly who
                <br />
                you&apos;re{" "}
                <span className="text-coral">paying</span>
              </h1>

              <p className="mt-6 text-lg text-slate-600 max-w-lg leading-relaxed">
                In 2025, over{" "}
                <span className="font-semibold text-slate-900">&pound;1.2 billion</span>{" "}
                was stolen by fraudsters in the UK. Before you send money, let us
                check who you&apos;re really paying.
              </p>

              <div className="mt-6 space-y-3">
                {[
                  "No credit card required",
                  "Results in under 30 seconds",
                  "Data encrypted and never shared",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="size-5 text-emerald-500 shrink-0" />
                    <span className="text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-3">
                <TrustpilotStars />
                <div className="text-sm text-slate-600">
                  <span className="font-semibold text-slate-900">Excellent</span>
                  {" "}&middot; 4.9/5 from{" "}
                  <span className="font-semibold underline underline-offset-2">127 reviews</span>
                </div>
              </div>
            </div>

            {/* Right: embedded wizard */}
            <div className="relative">
              {/* Callout badge above wizard */}
              <div className="hidden lg:flex justify-center mb-3">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-coral px-4 py-1.5 text-white text-sm font-semibold shadow-md animate-bounce [animation-duration:2s]">
                  Start a check
                  <ArrowRight className="size-3.5 rotate-90" />
                </div>
              </div>
              <LazyWizard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-coral/15 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-16">
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-coral mb-8">
            Did you know?
          </p>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
            <div className="rounded-xl bg-white/[0.06] border border-white/10 px-6 py-6 backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">&pound;1.2bn</div>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Stolen by fraudsters in the UK in 2025
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 px-6 py-6 backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">4.18m</div>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Confirmed fraud cases reported in 2025
              </p>
            </div>
            <div className="rounded-xl bg-white/[0.06] border border-white/10 px-6 py-6 backdrop-blur-sm">
              <div className="text-4xl sm:text-5xl font-extrabold tracking-tight text-coral">72%</div>
              <p className="mt-3 text-sm text-slate-400 leading-relaxed">
                Of APP fraud starts with a purchase scam
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing + checks included ─────────────────────────────── */}
      <section id="pricing">
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <span className="eyebrow">Pricing</span>
            <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              One check &mdash; every signal we can find on the payee. Buy
              credits when you need them, no subscription.
            </p>
          </div>

          {/* ── What's in every check ── */}
          <div className="mx-auto max-w-3xl mb-16">
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-lg shadow-slate-200/50">
              <div className="bg-slate-900 text-white px-5 py-4">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-3.5" />
                  Every check includes
                </p>
              </div>

              {[
                { icon: Landmark, label: "Confirmation of Payee", desc: "Bank account matches payee name" },
                { icon: Building2, label: "Companies House", desc: "Company registered & active" },
                { icon: ShieldCheck, label: "VAT verification", desc: "VAT number valid with HMRC" },
                { icon: Car, label: "DVLA Vehicle Check", desc: "Make, year, tax and MOT status" },
                { icon: Star, label: "Online reviews", desc: "Google, Trustpilot & more" },
                { icon: ShoppingCart, label: "AI Valuation", desc: "Fair price for vehicles or marketplace items" },
              ].map((feature, i) => (
                <div
                  key={feature.label}
                  className={`flex items-center gap-3 px-5 py-3.5 border-t border-slate-100 ${
                    i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                  }`}
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
                    <feature.icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{feature.label}</p>
                    <p className="text-xs text-slate-500">{feature.desc}</p>
                  </div>
                  <div className="flex size-6 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                    <Check className="size-3.5 text-emerald-600" strokeWidth={3} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Credit packs ── */}
          <div className="text-center mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900">
              Buy check credits
            </h3>
            <p className="mt-2 text-slate-600">
              The more you buy, the more you save. No expiry.
            </p>
          </div>

          <div className="mx-auto grid max-w-3xl gap-4 sm:grid-cols-3">
            {/* 1 check */}
            <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-slate-300 hover:shadow-lg">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-100 mb-4">
                <Zap className="size-6 text-slate-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">1 check</p>
              <p className="text-sm text-slate-500 mt-1">Try it out</p>
              <div className="text-3xl font-bold text-slate-900 mt-4">&pound;2.50</div>
              <p className="text-sm text-slate-500 mt-1">&pound;2.50 per check</p>
              <Button
                className="mt-5 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                render={<Link href="/verify" />}
              >
                Get started
              </Button>
            </div>

            {/* 3 checks — popular */}
            <div className="relative rounded-2xl border-2 border-coral bg-white p-6 text-center shadow-lg shadow-coral/10 sm:scale-[1.04] transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  <Crown className="size-3" />
                  Best value
                </span>
              </div>
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-coral/10 mb-4">
                <Gift className="size-6 text-coral" />
              </div>
              <p className="text-2xl font-bold text-slate-900">3 checks</p>
              <p className="text-sm text-slate-500 mt-1">Most popular</p>
              <div className="text-3xl font-bold text-slate-900 mt-4">&pound;5.00</div>
              <p className="text-sm text-slate-500 mt-1">&pound;1.67 per check</p>
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                <span className="text-xs font-semibold text-emerald-700">Save &pound;2.50</span>
              </div>
              <Button
                className="mt-4 w-full h-11 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg shadow-sm"
                render={<Link href="/verify" />}
              >
                Get started
              </Button>
            </div>

            {/* 7 checks */}
            <div className="relative rounded-2xl border-2 border-slate-200 bg-white p-6 text-center transition-all hover:border-slate-300 hover:shadow-lg">
              <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-amber-50 mb-4">
                <Sparkles className="size-6 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-slate-900">7 checks</p>
              <p className="text-sm text-slate-500 mt-1">Pro pack</p>
              <div className="text-3xl font-bold text-slate-900 mt-4">&pound;10.00</div>
              <p className="text-sm text-slate-500 mt-1">&pound;1.43 per check</p>
              <div className="mt-2 inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5">
                <span className="text-xs font-semibold text-emerald-700">Save &pound;7.50</span>
              </div>
              <Button
                className="mt-4 w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg"
                render={<Link href="/verify" />}
              >
                Get started
              </Button>
            </div>
          </div>

          <p className="text-center text-sm text-slate-500 mt-6">
            Credits never expire. Use them whenever you need a check.
          </p>

          {/* ── Enterprise CTA ── */}
          <div className="mt-16 rounded-2xl bg-slate-900 p-8 sm:p-10 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-coral/20 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-coral/20 border border-coral/30 px-3 py-1 mb-4">
                  <Building2 className="size-3.5 text-coral" />
                  <span className="text-xs font-semibold text-coral">Enterprise</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">
                  Need more? Go enterprise.
                </h3>
                <p className="mt-2 text-slate-400 max-w-lg">
                  Monthly credit subscriptions from &pound;0.70/check. Volume
                  pricing, API access, and invoiced billing for your team.
                </p>
              </div>
              <div className="shrink-0">
                <Button
                  className="h-12 px-7 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-lg transition-all whitespace-nowrap"
                  render={<Link href="/enterprise" />}
                >
                  View enterprise plans
                  <ArrowRight className="size-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <span className="eyebrow">How it works</span>
            <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
              Three simple steps
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Takes under a minute. Seriously.
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us who you're paying",
                description: "Upload an invoice, enter payment details manually, or paste a marketplace listing screenshot.",
              },
              {
                step: "2",
                title: "We run every relevant check in seconds",
                description: "We cross-reference Companies House, HMRC, bank records, online reviews, and market data.",
              },
              {
                step: "3",
                title: "Pay with confidence",
                description: "Get a clear traffic-light risk assessment. Green means go. Amber means check. Red means stop.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-coral text-white font-bold text-lg shadow-sm">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-3 text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* Sign up CTA */}
          <div className="mt-14 text-center">
            <p className="text-slate-600 mb-4">
              Ready to get started? Create a free account in seconds.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button
                className="h-12 px-7 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-sm hover:shadow-lg transition-all"
                render={<Link href="/auth/login?tab=signup" />}
              >
                Create free account
                <ArrowRight className="size-5 ml-2" />
              </Button>
              <Button
                variant="outline"
                className="h-12 px-7 text-[15px] font-medium rounded-lg border-slate-300 text-slate-700 hover:bg-white transition-all"
                render={<Link href="#pricing" />}
              >
                See pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Customer stories ──────────────────────────────────────────── */}
      <section>
        <div className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <span className="eyebrow">Customer stories</span>
            <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
              People we&apos;ve helped
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Real stories from people who checked before they paid.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {STORIES.map((story) => (
              <div
                key={story.name}
                className="relative rounded-xl border border-slate-200 bg-white p-6 sm:p-8"
              >
                <Quote className="size-8 text-slate-200 mb-4" />
                <p className="text-slate-600 leading-relaxed">{story.quote}</p>
                <div className="mt-6 flex items-center justify-between pt-5 border-t border-slate-100">
                  <div>
                    <p className="font-semibold text-slate-900">{story.name}</p>
                    <p className="text-sm text-slate-500">
                      {story.role}, {story.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-700">
                      Saved &pound;{story.saved}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <span className="eyebrow">Our mission</span>
          <h2 className="text-2xl sm:text-3xl mt-3 mb-5 font-bold tracking-tight">
            Why we built this
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            We built WhoAmIPaying because we were tired of the anxiety that
            comes with sending large payments to unknown accounts. Every day,
            people in the UK send money to the wrong account, pay fraudulent
            invoices, or get scammed on marketplaces. We wanted to make it
            simple to check before you pay.
          </p>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <ShieldCheck className="size-12 mx-auto mb-5 text-coral" />
          <h2 className="text-3xl sm:text-4xl text-white font-bold tracking-tight">
            Check your next payment
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            From &pound;2.50 a check, takes 30 seconds, and could save you
            thousands.
          </p>
          <Button
            className="mt-8 h-12 px-8 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-lg transition-all"
            render={<Link href="/verify" />}
          >
            Make a check
            <ArrowRight className="size-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-slate-500">
            No subscription. Credits never expire.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="light" showTagline />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="#how-it-works" className="hover:text-slate-900 transition-colors">
                How it works
              </Link>
              <Link href="/enterprise" className="hover:text-slate-900 transition-colors">
                Enterprise
              </Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">
                Blog
              </Link>
              <Link href="/verify" className="hover:text-slate-900 transition-colors">
                Make a check
              </Link>
              <Link href="/auth/login" className="hover:text-slate-900 transition-colors">
                Sign in
              </Link>
            </nav>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} WhoAmIPaying is a trading name of Ebanking Integration Limited (company no. 06596920). All rights reserved.
            </p>
            <nav className="flex flex-wrap justify-center sm:justify-end gap-x-6 gap-y-1 text-xs text-slate-400">
              <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
              <Link href="/ai-statement" className="hover:text-slate-600 transition-colors">AI Statement</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
