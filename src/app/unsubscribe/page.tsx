// /unsubscribe — confirmation page for the one-click outreach
// unsubscribe flow. Pure server-rendered HTML so it works without
// JavaScript (RFC 8058 requires that one-click works in
// JS-disabled clients).
//
// The /api/unsubscribe route handles the actual suppression then
// 303-redirects here. This page just renders the outcome.

import Link from "next/link";
import { MarketingHeader } from "@/components/marketing-header";
import { LandingFooter } from "@/components/landing-footer";
import { CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ error?: string }>;
}

export const metadata = {
  title: "Unsubscribed",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const ok = !error;

  return (
    <div className="bg-cream min-h-screen flex flex-col">
      <MarketingHeader />
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full rounded-2xl border border-[var(--border)] bg-white p-8 text-center">
          {ok ? (
            <>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 mb-4">
                <CheckCircle2 className="w-7 h-7" />
              </span>
              <h1 className="text-2xl font-semibold text-navy">
                You&rsquo;re unsubscribed
              </h1>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                You won&rsquo;t receive any more outreach from us. Your
                email has been added to our suppression list.
              </p>
              <p className="text-xs text-slate-500 mt-4 leading-relaxed">
                If this was a mistake, or you change your mind later,
                email{" "}
                <a
                  href="mailto:jim@propertoasty.com"
                  className="text-coral hover:text-coral-dark underline"
                >
                  jim@propertoasty.com
                </a>{" "}
                and we&rsquo;ll sort it.
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-rose-50 text-rose-600 mb-4">
                <XCircle className="w-7 h-7" />
              </span>
              <h1 className="text-2xl font-semibold text-navy">
                We couldn&rsquo;t process that
              </h1>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                The unsubscribe link looks invalid or has been tampered
                with. If you got it from one of our emails, forward us
                the original and we&rsquo;ll remove you manually.
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Reason: {error}
              </p>
              <p className="text-xs text-slate-500 mt-4">
                Email{" "}
                <a
                  href="mailto:jim@propertoasty.com"
                  className="text-coral hover:text-coral-dark underline"
                >
                  jim@propertoasty.com
                </a>
              </p>
            </>
          )}
          <div className="mt-8">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-navy underline"
            >
              ← Back to propertoasty.com
            </Link>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
