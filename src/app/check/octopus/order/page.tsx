// /check/octopus/order — Tesla-style booking flow (placeholder).
//
// PR 3 of the Octopus journey rework lands the real single-screen
// "pick a date → confirm" flow here. For now this is a polished
// holding page so the Order Now CTA on /check/octopus has a real
// destination instead of a 404. Same dark theme, same illustrative
// disclaimer.

import Link from "next/link";
import { ArrowLeft, CalendarCheck } from "lucide-react";
import { Logo } from "@/components/logo";
import { LandingFooter } from "@/components/landing-footer";

export const metadata = {
  title: "Book your pre-install check-in — Propertoasty",
  description:
    "Pick a slot for a short pre-install check-in with the Octopus team.",
};

export default function OctopusOrderPage() {
  return (
    <div className="theme-octopus bg-cream min-h-[100dvh] flex flex-col">
      <header className="border-b border-[var(--border)] bg-cream/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/check/octopus"
            className="inline-flex items-center gap-2 shrink-0 text-[var(--muted-brand)] hover:text-navy transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <Logo size="sm" variant="light" />
          </Link>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
            Illustrative
          </span>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
          <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-coral-pale text-coral">
            <CalendarCheck className="w-8 h-8" />
          </span>
          <p className="eyebrow mt-6">Order</p>
          <h1 className="mt-3 text-3xl sm:text-4xl text-navy tracking-tight">
            Pre-install check-in booking is shipping in the next release.
          </h1>
          <p className="mt-4 text-[var(--muted-brand)] leading-relaxed">
            One screen, three slots, no friction. Until then, you can head
            back to your savings summary.
          </p>
          <Link
            href="/check/octopus"
            className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to my savings
          </Link>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
