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
} from "lucide-react";

const CHECKS = [
  {
    icon: Building2,
    title: "Companies House",
    description:
      "We verify the company is registered and active on the official UK register.",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  {
    icon: FileText,
    title: "HMRC VAT validation",
    description:
      "We check the VAT number directly with HMRC to confirm it's genuine and active.",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  {
    icon: Landmark,
    title: "Confirmation of Payee",
    description:
      "We verify the bank account name matches who you think you're paying.",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  {
    icon: Star,
    title: "Online reviews",
    description:
      "We search Google, Trustpilot, and Checkatrade for the business's reputation.",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  {
    icon: ShoppingCart,
    title: "Marketplace valuation",
    description:
      "For marketplace purchases, we research the fair market value and flag overpricing.",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  },
  {
    icon: CalendarDays,
    title: "Trading history",
    description:
      "We check how long the company has been trading and whether their accounts are filed.",
    color:
      "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
];

const STORIES = [
  {
    quote:
      "I was about to pay a builder £3,200 for a kitchen refit. WhoAmIPaying flagged that the bank account didn't match the company name. Turned out the invoice had been intercepted and the details changed. Saved me thousands.",
    name: "Sarah M.",
    role: "Freelance Designer",
    location: "Bristol",
  },
  {
    quote:
      "A contractor sent us an invoice with a VAT number that had been deregistered 6 months ago. We would never have caught that without running a check first.",
    name: "David K.",
    role: "Property Manager",
    location: "Leeds",
  },
  {
    quote:
      "I found a car on Facebook Marketplace for what seemed like a great price. The valuation check showed it was priced 40% below market value — a classic scam sign. I walked away.",
    name: "Rachel T.",
    role: "First-time Buyer",
    location: "Manchester",
  },
  {
    quote:
      "After nearly paying a spoofed supplier invoice last year, we now run every new supplier through WhoAmIPaying. It takes 30 seconds and gives us total peace of mind.",
    name: "James P.",
    role: "Small Business Owner",
    location: "Edinburgh",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:py-28 text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-primary/10">
            <LogoIcon className="size-7 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Know exactly who
            <br />
            you&apos;re paying
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Every year, UK consumers and businesses lose hundreds of millions to
            payment fraud. Before you send money, let us check if the person or
            company you&apos;re paying is who they say they are.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" render={<Link href="/verify" />}>
              Check a payment — free
              <ArrowRight className="size-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="#how-it-works" />}
            >
              See how it works
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            No account needed. Results in 30 seconds.
          </p>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 text-center">
            <div>
              <div className="text-3xl font-bold tracking-tight">£580m+</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Lost to APP fraud in the UK last year
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight">1 in 15</div>
              <p className="mt-1 text-sm text-muted-foreground">
                UK adults have been victims of fraud
              </p>
            </div>
            <div>
              <div className="text-3xl font-bold tracking-tight">6 checks</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Run on every verification we perform
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 6 Checks ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Six checks. One report.
          </h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            We cross-reference multiple official UK data sources to give you a
            clear picture of who you&apos;re paying.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CHECKS.map((check) => (
            <Card key={check.title} className="border-0 shadow-sm bg-card">
              <CardHeader>
                <div
                  className={`flex size-10 items-center justify-center rounded-lg ${check.color}`}
                >
                  <check.icon className="size-5" />
                </div>
                <CardTitle className="mt-3 text-base">
                  {check.title}
                </CardTitle>
                <CardDescription className="text-sm">
                  {check.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────── */}
      <section
        id="how-it-works"
        className="border-y bg-muted/30"
      >
        <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              How it works
            </h2>
            <p className="mt-2 text-muted-foreground">
              Three simple steps. Takes under a minute.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Tell us who you're paying",
                description:
                  "Upload an invoice, enter the payment details manually, or paste a marketplace listing screenshot.",
              },
              {
                step: "2",
                title: "We run 6 checks in seconds",
                description:
                  "We cross-reference Companies House, HMRC, bank records, online reviews, and market data.",
              },
              {
                step: "3",
                title: "Pay with confidence",
                description:
                  "Get a clear traffic-light risk assessment. Green means go. Amber means check. Red means stop.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Customer stories ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            People we&apos;ve helped
          </h2>
          <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
            Real stories from people who checked before they paid.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {STORIES.map((story) => (
            <Card key={story.name} className="relative">
              <CardContent className="pt-6">
                <Quote className="size-6 text-muted-foreground/30 mb-3" />
                <p className="text-sm leading-relaxed">{story.quote}</p>
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm font-medium">{story.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {story.role}, {story.location}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────── */}
      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6 text-center">
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Why we built this
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We built WhoAmIPaying because we were tired of the anxiety that
            comes with sending large payments to unknown accounts. Every day,
            people in the UK send money to the wrong account, pay fraudulent
            invoices, or get scammed on marketplaces. We wanted to make it
            simple to check before you pay.
          </p>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-2 text-muted-foreground">
            Your first check is free. After that, buy credits when you need
            them. No subscriptions.
          </p>
        </div>
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-3">
          {[
            {
              credits: 10,
              price: "£5",
              per: "£0.50",
              label: "Starter",
              desc: "Perfect for a one-off check",
            },
            {
              credits: 50,
              price: "£20",
              per: "£0.40",
              label: "Business",
              popular: true,
              desc: "Most popular for regular use",
            },
            {
              credits: 200,
              price: "£60",
              per: "£0.30",
              label: "Enterprise",
              desc: "Best value for high volume",
            },
          ].map((plan) => (
            <Card
              key={plan.label}
              className={plan.popular ? "ring-2 ring-primary" : ""}
            >
              <CardHeader>
                {plan.popular && (
                  <span className="inline-flex w-fit items-center rounded-full bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground mb-1">
                    Most popular
                  </span>
                )}
                <CardTitle>{plan.label}</CardTitle>
                <CardDescription>{plan.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{plan.price}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.credits} credits at {plan.per} each
                </p>
                <Button
                  className="mt-4 w-full"
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
      <section className="border-t bg-primary/5">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <ShieldCheck className="size-10 text-primary mx-auto mb-4" />
          <h2 className="text-3xl font-bold tracking-tight">
            Check your next payment
          </h2>
          <p className="mt-2 text-muted-foreground">
            It&apos;s free, takes 30 seconds, and could save you thousands.
          </p>
          <Button
            size="lg"
            className="mt-6"
            render={<Link href="/verify" />}
          >
            Make a check — free
            <ArrowRight className="size-4 ml-1.5" />
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            No account needed. No commitment.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} WhoAmIPaying. All rights
              reserved.
            </p>
            <nav className="flex gap-4 text-sm text-muted-foreground">
              <Link href="#how-it-works" className="hover:text-foreground">
                How it works
              </Link>
              <Link href="/auth/login" className="hover:text-foreground">
                Sign in
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
