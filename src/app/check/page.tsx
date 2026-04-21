import { notFound } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/logo";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Check your home",
  description:
    "Find out if your UK home is eligible for the Boiler Upgrade Scheme and suitable for rooftop solar — a pre-survey indication in minutes.",
};

export default function CheckPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();

  return (
    <>
      <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center">
            <Logo size="sm" variant="light" />
          </Link>
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--muted-brand)]">
            Heat pump &amp; solar check
          </span>
        </div>
      </header>
      <main className="flex-1 bg-gradient-to-b from-cream-deep to-cream">
        <CheckWizard />
      </main>
    </>
  );
}
