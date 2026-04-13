import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import {
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Zap,
  FileText,
  Code2,
  Users,
  BarChart3,
} from "lucide-react";
import { EnterprisePricingCalculator } from "@/components/enterprise-calculator";

function EnterpriseHeader() {
  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        <nav className="hidden sm:flex items-center gap-6">
          <Link href="/enterprise" className="text-sm font-semibold text-slate-900 transition-colors">
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

const TIERS = [
  { credits: 25, pricePerCredit: 1.8, total: 45, envKey: "STRIPE_PRICE_ENT_25" },
  { credits: 50, pricePerCredit: 1.5, total: 75, envKey: "STRIPE_PRICE_ENT_50" },
  { credits: 100, pricePerCredit: 1.2, total: 120, envKey: "STRIPE_PRICE_ENT_100" },
  { credits: 250, pricePerCredit: 0.9, total: 225, envKey: "STRIPE_PRICE_ENT_250" },
  { credits: 500, pricePerCredit: 0.7, total: 350, envKey: "STRIPE_PRICE_ENT_500" },
];

const FEATURES = [
  {
    icon: Zap,
    title: "Volume pricing",
    description:
      "The more checks you run, the less you pay per check. Starts at £1.80 and drops to £0.70.",
  },
  {
    icon: Code2,
    title: "API access",
    description:
      "Integrate checks directly into your workflow. RESTful API with full documentation.",
  },
  {
    icon: FileText,
    title: "Invoiced billing",
    description:
      "Monthly invoices with full breakdown. Download PDFs for your records.",
  },
  {
    icon: Users,
    title: "Team accounts",
    description:
      "Share credits across your team. Central billing, individual logins.",
  },
  {
    icon: BarChart3,
    title: "Usage dashboard",
    description:
      "Track spend, usage trends, and check history across your organisation.",
  },
  {
    icon: ShieldCheck,
    title: "Priority support",
    description:
      "Dedicated support channel with faster response times for enterprise customers.",
  },
];

export default function EnterprisePage() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <EnterpriseHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-coral/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-4xl px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-coral/20 border border-coral/30 px-4 py-1.5 mb-6">
            <Building2 className="size-4 text-coral" />
            <span className="text-sm font-semibold text-coral">Enterprise</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.1]">
            Built for teams that
            <br />
            verify at <span className="text-coral">scale</span>
          </h1>
          <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Monthly credit subscriptions with volume pricing. The more you
            check, the less you pay — from &pound;1.80 down to &pound;0.70 per
            check.
          </p>
        </div>
      </section>

      {/* Pricing calculator */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20 sm:py-24">
        <div className="text-center mb-14">
          <span className="text-xs font-bold uppercase tracking-widest text-coral">Pricing</span>
          <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
            Choose your monthly plan
          </h2>
          <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Select a monthly credit allowance. Unused credits roll over. Cancel
            or change plan any time.
          </p>
        </div>

        <EnterprisePricingCalculator tiers={TIERS} />

        {/* Comparison to pay-as-you-go */}
        <div className="mt-12 mx-auto max-w-2xl">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-6">
            <h3 className="font-semibold text-slate-900 mb-3">
              How does this compare to pay-as-you-go?
            </h3>
            <div className="space-y-2.5">
              {[
                "Pay-as-you-go: £2.50 per enhanced check (no commitment)",
                "Enterprise 25: £1.80/check — save 28% vs pay-as-you-go",
                "Enterprise 100: £1.20/check — save 52% vs pay-as-you-go",
                "Enterprise 500: £0.70/check — save 72% vs pay-as-you-go",
              ].map((item) => (
                <div key={item} className="flex items-start gap-2.5">
                  <Check className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-600">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="text-center mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-coral">Features</span>
            <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
              Everything you need at scale
            </h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-200 bg-white p-6"
              >
                <div className="flex size-10 items-center justify-center rounded-lg bg-coral/10 mb-4">
                  <feature.icon className="size-5 text-coral" />
                </div>
                <h3 className="font-semibold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API section */}
      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-coral">API Access</span>
            <h2 className="text-3xl sm:text-4xl mt-3 font-bold tracking-tight">
              Integrate directly
            </h2>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed">
              Run verification checks programmatically from your own systems.
              Same checks, same data, delivered via a simple REST API.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "RESTful JSON API with Bearer token auth",
                "Confirmation of Payee, Companies House, HMRC VAT",
                "Marketplace valuation and online reviews",
                "Webhook notifications for async results",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <div className="flex size-5 items-center justify-center rounded-full bg-emerald-100">
                    <Check className="size-3 text-emerald-600" strokeWidth={3} />
                  </div>
                  <span className="text-slate-700 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl bg-slate-900 p-6 font-mono text-sm text-slate-300 overflow-x-auto">
            <div className="text-slate-500 mb-1"># Run a verification check</div>
            <div>
              <span className="text-emerald-400">curl</span> -X POST \
            </div>
            <div className="pl-4">
              -H <span className="text-amber-300">&quot;Authorization: Bearer YOUR_API_KEY&quot;</span> \
            </div>
            <div className="pl-4">
              -H <span className="text-amber-300">&quot;Content-Type: application/json&quot;</span> \
            </div>
            <div className="pl-4">
              -d <span className="text-amber-300">&apos;&#123;&quot;payeeName&quot;: &quot;Acme Ltd&quot;, &quot;sortCode&quot;: &quot;040004&quot;, &quot;accountNumber&quot;: &quot;12345678&quot;&#125;&apos;</span> \
            </div>
            <div className="pl-4">
              whoamipaying.co.uk/api/verify
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-coral/20 via-transparent to-transparent pointer-events-none" />
        <div className="relative mx-auto max-w-3xl px-6 py-20 text-center">
          <ShieldCheck className="size-12 mx-auto mb-5 text-coral" />
          <h2 className="text-3xl sm:text-4xl text-white font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-slate-400">
            Create an account, choose your plan, and start verifying in minutes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8">
            <Button
              className="h-12 px-8 text-[15px] font-semibold rounded-lg bg-coral hover:bg-coral-dark text-white shadow-lg transition-all"
              render={<Link href="/auth/login?tab=signup" />}
            >
              Create enterprise account
              <ArrowRight className="size-5 ml-2" />
            </Button>
            <Button
              variant="outline"
              className="h-12 px-8 text-[15px] font-medium rounded-lg border-slate-600 text-slate-300 hover:bg-white/10 transition-all"
              render={<Link href="/#pricing" />}
            >
              Compare with pay-as-you-go
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <Logo size="sm" variant="light" showTagline />
            <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <Link href="/blog" className="hover:text-slate-900 transition-colors">Blog</Link>
              <Link href="/verify" className="hover:text-slate-900 transition-colors">Make a check</Link>
              <Link href="/auth/login" className="hover:text-slate-900 transition-colors">Sign in</Link>
            </nav>
          </div>
          <div className="mt-6 flex flex-wrap justify-center sm:justify-start gap-x-6 gap-y-1 text-xs text-slate-400">
            <Link href="/privacy" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
            <Link href="/ai-statement" className="hover:text-slate-600 transition-colors">AI Statement</Link>
          </div>
          <div className="mt-6 pt-6 border-t border-slate-200 text-center sm:text-left">
            <p className="text-xs text-slate-400">
              &copy; {new Date().getFullYear()} WhoAmIPaying is a trading name of Ebanking Integration Limited (company no. 06596920). All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
