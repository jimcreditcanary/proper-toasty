import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/site-header";
import { Logo, LogoIcon } from "@/components/logo";
import {
  ShieldCheck,
  Building2,
  Landmark,
  Star,
  ShoppingCart,
  CalendarDays,
  FileText,
  ArrowRight,
  Quote,
  CheckCircle2,
} from "lucide-react";

const CHECKS = [
  {
    icon: Building2,
    title: "Companies House",
    description: "We verify the company is registered and active on the official UK register.",
  },
  {
    icon: FileText,
    title: "HMRC VAT",
    description: "We validate the VAT number directly with HMRC to confirm it's genuine.",
  },
  {
    icon: Landmark,
    title: "Confirmation of Payee",
    description: "We check the bank account name matches who you think you're paying.",
  },
  {
    icon: Star,
    title: "Online reviews",
    description: "We search Google, Trustpilot, and Checkatrade for the business's reputation.",
  },
  {
    icon: ShoppingCart,
    title: "Marketplace valuation",
    description: "For marketplace purchases, we research the fair market value and flag overpricing.",
  },
  {
    icon: CalendarDays,
    title: "Trading history",
    description: "We check how long the company has been trading and if their accounts are filed.",
  },
];

const STORIES = [
  {
    quote: "I was about to pay a builder for a kitchen refit. WhoAmIPaying flagged that the bank account didn't match the company name. The invoice had been intercepted. Saved me thousands.",
    name: "Sarah M.",
    role: "Freelance Designer",
    location: "Bristol",
    saved: "£3,200",
  },
  {
    quote: "A contractor sent an invoice with a VAT number that had been deregistered 6 months ago. We would never have caught that without running a check first.",
    name: "David K.",
    role: "Property Manager",
    location: "Leeds",
    saved: "£8,400",
  },
  {
    quote: "Found a car on Marketplace for a great price. The valuation check showed it was priced 40% below market value — a classic scam sign. I walked away.",
    name: "Rachel T.",
    role: "First-time Buyer",
    location: "Manchester",
    saved: "£6,500",
  },
  {
    quote: "After nearly paying a spoofed supplier invoice last year, we now run every new supplier through WhoAmIPaying. 30 seconds for total peace of mind.",
    name: "James P.",
    role: "Small Business Owner",
    location: "Edinburgh",
    saved: "£12,000",
  },
];

function TrustpilotStars() {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex size-7 items-center justify-center bg-[#00b67a] rounded">
          <Star className="size-4 text-white fill-white" />
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-navy text-white">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Radial gradient glow behind hero */}
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[1000px] h-[900px] pointer-events-none" style={{ background: "radial-gradient(ellipse at center, rgba(255,92,53,0.15) 0%, rgba(255,92,53,0.05) 40%, transparent 70%)" }} />

        <div className="relative mx-auto max-w-4xl px-6 py-24 sm:py-32 text-center">
          <div className="mx-auto mb-8 flex justify-center">
            <LogoIcon size="xl" />
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl">
            Know exactly who
            <br />
            you&apos;re paying
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-brand-muted-light max-w-2xl mx-auto leading-relaxed">
            In the first half of 2025, over{" "}
            <span className="text-coral font-bold">£629 million</span>{" "}was stolen
            by fraudsters in the UK. Before you send money, let us check who
            you&apos;re really paying.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              className="h-13 px-8 text-[15px] font-bold rounded-xl bg-coral hover:bg-coral-dark shadow-none hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all glow-coral"
              render={<Link href="/verify" />}
            >
              Check a payment — free
              <ArrowRight className="size-5 ml-2" />
            </Button>
            <Button
              className="h-13 px-8 text-[15px] font-medium rounded-xl bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12] transition-all"
              render={<Link href="#how-it-works" />}
            >
              See how it works
            </Button>
          </div>
          <p className="mt-5 text-sm text-brand-muted">
            No account needed. Results in 30 seconds.
          </p>

          {/* Trustpilot */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <TrustpilotStars />
            <p className="text-sm">
              <span className="font-semibold text-white">Excellent</span>
              <span className="text-brand-muted-light"> &middot; 4.9 out of 5 based on </span>
              <span className="font-semibold text-white underline underline-offset-2">127 reviews</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-brand-muted">
              <Star className="size-3 fill-[#00b67a] text-[#00b67a]" />
              Trustpilot
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-y border-white/[0.06]">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-4xl font-bold tracking-tight text-coral">£629m</div>
              <p className="mt-2 text-brand-muted-light">
                Stolen by fraudsters in H1 2025 alone
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight text-coral">2.09m</div>
              <p className="mt-2 text-brand-muted-light">
                Confirmed fraud cases in the first half of 2025
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight text-coral">72%</div>
              <p className="mt-2 text-brand-muted-light">
                Of APP fraud starts with a purchase scam
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Checks ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <span className="eyebrow">What we check</span>
          <h2 className="text-3xl sm:text-4xl mt-3">
            Six checks. One report.
          </h2>
          <p className="mt-3 text-lg text-brand-muted-light max-w-2xl mx-auto">
            We cross-reference multiple official UK data sources to give you a
            clear picture of who you&apos;re paying.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((check) => (
            <div
              key={check.title}
              className="group relative rounded-2xl bg-navy-card border border-white/[0.06] p-6 transition-all hover:border-coral/30 hover:shadow-[0_0_24px_rgba(255,92,53,0.1)]"
            >
              <div className="flex size-12 items-center justify-center rounded-xl bg-coral/10">
                <check.icon className="size-6 text-coral" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-white">{check.title}</h3>
              <p className="mt-2 text-brand-muted-light leading-relaxed">
                {check.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-navy-mid">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <span className="eyebrow">How it works</span>
            <h2 className="text-3xl sm:text-4xl mt-3">
              Three simple steps
            </h2>
            <p className="mt-3 text-lg text-brand-muted-light">
              Takes under a minute. Seriously.
            </p>
          </div>
          <div className="grid gap-12 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us who you're paying",
                description: "Upload an invoice, enter payment details manually, or paste a marketplace listing screenshot.",
              },
              {
                step: "2",
                title: "We run 6 checks in seconds",
                description: "We cross-reference Companies House, HMRC, bank records, online reviews, and market data.",
              },
              {
                step: "3",
                title: "Pay with confidence",
                description: "Get a clear traffic-light risk assessment. Green means go. Amber means check. Red means stop.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-coral font-bold text-lg text-white glow-coral">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-brand-muted-light leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Button
              className="h-13 px-8 text-[15px] font-bold rounded-xl bg-coral hover:bg-coral-dark hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
              render={<Link href="/verify" />}
            >
              Try it now — free
              <ArrowRight className="size-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Customer stories ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <span className="eyebrow">Customer stories</span>
          <h2 className="text-3xl sm:text-4xl mt-3">
            People we&apos;ve helped
          </h2>
          <p className="mt-3 text-lg text-brand-muted-light max-w-2xl mx-auto">
            Real stories from people who checked before they paid.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          {STORIES.map((story) => (
            <div
              key={story.name}
              className="relative rounded-2xl bg-navy-card border border-white/[0.06] p-6 sm:p-8"
            >
              <Quote className="size-8 text-coral/20 mb-4" />
              <p className="text-base leading-relaxed text-brand-muted-light">{story.quote}</p>
              <div className="mt-6 flex items-center justify-between pt-5 border-t border-white/[0.06]">
                <div>
                  <p className="font-semibold text-white">{story.name}</p>
                  <p className="text-sm text-brand-muted">
                    {story.role}, {story.location}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-pass/10 border border-pass/20 px-3 py-1">
                  <CheckCircle2 className="size-3.5 text-pass" />
                  <span className="text-xs font-semibold text-pass">
                    Saved {story.saved}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="bg-navy-mid">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <span className="eyebrow">Our mission</span>
          <h2 className="text-2xl sm:text-3xl mt-3 mb-5">
            Why we built this
          </h2>
          <p className="text-lg text-brand-muted-light leading-relaxed">
            We built WhoAmIPaying because we were tired of the anxiety that
            comes with sending large payments to unknown accounts. Every day,
            people in the UK send money to the wrong account, pay fraudulent
            invoices, or get scammed on marketplaces. We wanted to make it
            simple to check before you pay.
          </p>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <span className="eyebrow">Pricing</span>
          <h2 className="text-3xl sm:text-4xl mt-3">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-lg text-brand-muted-light">
            Your first check is free. After that, buy credits when you need
            them. No subscriptions.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            { credits: 10, price: "£5", per: "£0.50", label: "Starter", desc: "Perfect for a one-off check" },
            { credits: 50, price: "£20", per: "£0.40", label: "Business", popular: true, desc: "Most popular for regular use" },
            { credits: 200, price: "£60", per: "£0.30", label: "Enterprise", desc: "Best value for high volume" },
          ].map((plan) => (
            <div
              key={plan.label}
              className={`rounded-2xl bg-navy-card border p-6 sm:p-8 ${
                plan.popular
                  ? "border-coral ring-1 ring-coral/40 glow-coral scale-[1.02]"
                  : "border-white/[0.06]"
              }`}
            >
              {plan.popular && (
                <span className="inline-flex items-center rounded-full bg-coral px-3 py-1 text-xs font-bold text-white mb-3">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-semibold text-white">{plan.label}</h3>
              <p className="text-sm text-brand-muted-light mt-1">{plan.desc}</p>
              <div className="text-4xl font-bold text-white mt-4">{plan.price}</div>
              <p className="mt-2 text-brand-muted">
                {plan.credits} credits at {plan.per} each
              </p>
              <Button
                className={`mt-6 w-full h-11 text-[15px] font-bold rounded-xl transition-all ${
                  plan.popular
                    ? "bg-coral hover:bg-coral-dark hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)]"
                    : "bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12]"
                }`}
                render={<Link href="/auth/login" />}
              >
                Buy credits
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="bg-coral relative overflow-hidden">
        {/* Subtle light radial overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <ShieldCheck className="size-12 mx-auto mb-5 text-white/80" />
          <h2 className="text-3xl sm:text-4xl text-white">
            Check your next payment
          </h2>
          <p className="mt-3 text-lg text-white/80">
            It&apos;s free, takes 30 seconds, and could save you thousands.
          </p>
          <Button
            className="mt-8 h-13 px-8 text-[15px] font-bold rounded-xl bg-navy hover:bg-navy-mid text-white transition-all"
            render={<Link href="/verify" />}
          >
            Make a check — free
            <ArrowRight className="size-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-white/60">
            No account needed. No commitment.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="bg-navy-mid border-t border-white/[0.06] py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="dark" showTagline />
            <nav className="flex gap-6 text-sm text-brand-muted">
              <Link href="#how-it-works" className="hover:text-white transition-colors">
                How it works
              </Link>
              <Link href="/verify" className="hover:text-white transition-colors">
                Make a check
              </Link>
              <Link href="/auth/login" className="hover:text-white transition-colors">
                Sign in
              </Link>
            </nav>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.06] text-center sm:text-left">
            <p className="text-xs text-brand-muted">
              &copy; {new Date().getFullYear()} WhoAmIPaying. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
