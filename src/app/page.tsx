import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SiteHeader } from "@/components/site-header";
import { LogoIcon } from "@/components/logo";
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
    gradient: "from-blue-500 to-blue-600",
    bg: "bg-blue-50",
    iconColor: "text-blue-600",
  },
  {
    icon: FileText,
    title: "HMRC VAT",
    description: "We validate the VAT number directly with HMRC to confirm it's genuine.",
    gradient: "from-violet-500 to-violet-600",
    bg: "bg-violet-50",
    iconColor: "text-violet-600",
  },
  {
    icon: Landmark,
    title: "Confirmation of Payee",
    description: "We check the bank account name matches who you think you're paying.",
    gradient: "from-teal-500 to-teal-600",
    bg: "bg-teal-50",
    iconColor: "text-teal-600",
  },
  {
    icon: Star,
    title: "Online reviews",
    description: "We search Google, Trustpilot, and Checkatrade for the business's reputation.",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  {
    icon: ShoppingCart,
    title: "Marketplace valuation",
    description: "For marketplace purchases, we research the fair market value and flag overpricing.",
    gradient: "from-rose-500 to-pink-500",
    bg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  {
    icon: CalendarDays,
    title: "Trading history",
    description: "We check how long the company has been trading and if their accounts are filed.",
    gradient: "from-indigo-500 to-indigo-600",
    bg: "bg-indigo-50",
    iconColor: "text-indigo-600",
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
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-24 sm:py-32 text-center">
          <div className="mx-auto mb-8 flex size-16 items-center justify-center rounded-2xl bg-primary/10">
            <LogoIcon className="size-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
            Know exactly who
            <br />
            you&apos;re paying
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Every year, UK consumers and businesses lose hundreds of millions to
            payment fraud. Before you send money, let us check who you&apos;re
            really paying.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" className="h-12 px-8 text-base rounded-xl" render={<Link href="/verify" />}>
              Check a payment — free
              <ArrowRight className="size-5 ml-2" />
            </Button>
            <Button variant="outline" size="lg" className="h-12 px-8 text-base rounded-xl" render={<Link href="#how-it-works" />}>
              See how it works
            </Button>
          </div>
          <p className="mt-5 text-sm text-muted-foreground">
            No account needed. Results in 30 seconds.
          </p>

          {/* Trustpilot-style rating */}
          <div className="mt-10 flex flex-col items-center gap-2">
            <TrustpilotStars />
            <p className="text-sm">
              <span className="font-semibold">Excellent</span>
              <span className="text-muted-foreground"> &middot; 4.9 out of 5 based on </span>
              <span className="font-semibold underline underline-offset-2">127 reviews</span>
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Star className="size-3 fill-[#00b67a] text-[#00b67a]" />
              Trustpilot
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-y">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 text-center">
            <div>
              <div className="text-4xl font-bold tracking-tight text-primary">£580m+</div>
              <p className="mt-2 text-muted-foreground">
                Lost to APP fraud in the UK last year
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight text-primary">1 in 15</div>
              <p className="mt-2 text-muted-foreground">
                UK adults have been victims of fraud
              </p>
            </div>
            <div>
              <div className="text-4xl font-bold tracking-tight text-primary">6 checks</div>
              <p className="mt-2 text-muted-foreground">
                Run on every verification we perform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Checks ─────────────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Six checks. One report.
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            We cross-reference multiple official UK data sources to give you a
            clear picture of who you&apos;re paying.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((check) => (
            <div
              key={check.title}
              className="group relative rounded-2xl border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className={`flex size-12 items-center justify-center rounded-xl ${check.bg}`}>
                <check.icon className={`size-6 ${check.iconColor}`} />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{check.title}</h3>
              <p className="mt-2 text-muted-foreground leading-relaxed">
                {check.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-muted/40">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
              How it works
            </h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Three simple steps. Takes under a minute.
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
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-14 text-center">
            <Button size="lg" className="h-12 px-8 text-base rounded-xl" render={<Link href="/verify" />}>
              Try it now — free
              <ArrowRight className="size-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* ── Customer stories ──────────────────────────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            People we&apos;ve helped
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Real stories from people who checked before they paid.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {STORIES.map((story) => (
            <Card key={story.name} className="relative overflow-hidden rounded-2xl">
              <CardContent className="pt-8 pb-6">
                <Quote className="size-8 text-primary/20 mb-4" />
                <p className="text-base leading-relaxed">{story.quote}</p>
                <div className="mt-6 flex items-center justify-between pt-5 border-t">
                  <div>
                    <p className="font-semibold">{story.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {story.role}, {story.location}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1">
                    <CheckCircle2 className="size-3.5 text-emerald-700" />
                    <span className="text-xs font-semibold text-emerald-700">
                      Saved {story.saved}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="bg-muted/40">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-5">
            Why we built this
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
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
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-lg text-muted-foreground">
            Your first check is free. After that, buy credits when you need
            them. No subscriptions.
          </p>
        </div>
        <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
          {[
            { credits: 10, price: "£5", per: "£0.50", label: "Starter", desc: "Perfect for a one-off check" },
            { credits: 50, price: "£20", per: "£0.40", label: "Business", popular: true, desc: "Most popular for regular use" },
            { credits: 200, price: "£60", per: "£0.30", label: "Enterprise", desc: "Best value for high volume" },
          ].map((plan) => (
            <Card
              key={plan.label}
              className={`rounded-2xl ${plan.popular ? "ring-2 ring-primary shadow-lg scale-[1.02]" : ""}`}
            >
              <CardHeader className="pb-4">
                {plan.popular && (
                  <span className="inline-flex w-fit items-center rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground mb-2">
                    Most popular
                  </span>
                )}
                <CardTitle className="text-xl">{plan.label}</CardTitle>
                <CardDescription className="text-base">{plan.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">{plan.price}</div>
                <p className="mt-2 text-muted-foreground">
                  {plan.credits} credits at {plan.per} each
                </p>
                <Button
                  className="mt-6 w-full h-11 text-base rounded-xl"
                  variant={plan.popular ? "default" : "outline"}
                  render={<Link href="/auth/signup" />}
                >
                  Buy credits
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="bg-primary">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <ShieldCheck className="size-12 text-primary-foreground mx-auto mb-5" />
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-primary-foreground">
            Check your next payment
          </h2>
          <p className="mt-3 text-lg text-primary-foreground/80">
            It&apos;s free, takes 30 seconds, and could save you thousands.
          </p>
          <Button
            size="lg"
            variant="secondary"
            className="mt-8 h-12 px-8 text-base rounded-xl"
            render={<Link href="/verify" />}
          >
            Make a check — free
            <ArrowRight className="size-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-primary-foreground/60">
            No account needed. No commitment.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} WhoAmIPaying. All rights reserved.
            </p>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="#how-it-works" className="hover:text-foreground transition-colors">
                How it works
              </Link>
              <Link href="/verify" className="hover:text-foreground transition-colors">
                Make a check
              </Link>
              <Link href="/auth/login" className="hover:text-foreground transition-colors">
                Sign in
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
