import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";
import { Mail, ArrowRight, Users, Zap, BarChart3 } from "lucide-react";

export const metadata = {
  title: "For installers & partners",
  description:
    "Bulk property checks, API access, and lead routing for MCS-certified heat pump and solar installers — coming soon.",
};

export default function EnterprisePage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <SiteHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-4 sm:px-6 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-coral animate-pulse" />
            Installer partnerships — coming soon
          </div>

          <h1 className="mt-8 text-4xl sm:text-5xl font-bold tracking-tight text-navy leading-tight">
            For MCS installers &amp; partners
          </h1>

          <p className="mt-5 text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
            Propertoasty gives your team a pre-survey indication for every property in minutes —
            so you can quote remotely with confidence and only send an engineer when the numbers
            justify it.
          </p>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left">
            <Card
              icon={<Users className="w-5 h-5" />}
              title="Bulk checks"
              body="Upload a list, get a verdict per property. CSV in, CSV out."
            />
            <Card
              icon={<Zap className="w-5 h-5" />}
              title="API access"
              body="Programmatic eligibility + suitability for your CRM or quoting tool."
            />
            <Card
              icon={<BarChart3 className="w-5 h-5" />}
              title="Lead routing"
              body="Warm UK homeowners matched to your MCS certification region."
            />
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              className="h-11 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-6 rounded-lg"
              render={<Link href="mailto:hello@propertoasty.com?subject=Installer%20partnership">
                Register interest <ArrowRight className="w-4 h-4 ml-1" />
              </Link>}
            />
            <Button
              variant="ghost"
              className="h-11 text-sm text-slate-600 hover:text-slate-900"
              render={<Link href="/check">
                <Mail className="w-4 h-4 mr-1" /> Try a consumer check
              </Link>}
            />
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <span>
            &copy; {new Date().getFullYear()} Propertoasty is a trading name of{" "}
            <a
              href="https://find-and-update.company-information.service.gov.uk/company/11591983"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-navy underline-offset-2 hover:underline"
            >
              Braemar, Brook &amp; New Limited
            </a>
            {" "}(company no. 11591983). All rights reserved.
          </span>
          <nav className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-slate-900">Privacy</Link>
            <Link href="/terms" className="hover:text-slate-900">Terms</Link>
            <Link href="/ai-statement" className="hover:text-slate-900">AI use</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function Card({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
      <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-pale text-coral">
        {icon}
      </div>
      <h3 className="mt-3 text-sm font-semibold text-navy">{title}</h3>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
