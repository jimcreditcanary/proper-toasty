// MarketingHeader — single canonical header for every public /
// marketing page (home, blog, legal, AI statement, shared report).
//
// Why a new component instead of reusing SiteHeader:
//   - SiteHeader is "use client" (it owns the signed-in dropdown
//     with Supabase + router). Marketing pages don't need any of
//     that and shouldn't pay the JS bundle cost on first paint.
//   - We had ~7 different inline header implementations in the
//     marketing surface, each with subtly different palettes
//     (cream vs white), different nav links ("Enterprise" vs "For
//     installers"), different CTAs ("Make a check" pointing to a
//     non-existent /verify route, vs "Check my home" → /check).
//     Consolidating fixes the inconsistency the user flagged + a
//     latent broken-link bug on the legal pages.
//
// Mobile menu: <details>/<summary> rather than a JS dropdown so
// this stays a pure server component with zero hydration cost.
// Accessibility-wise it's fine — keyboard + screen reader native.

import Link from "next/link";
import { ArrowRight, Menu } from "lucide-react";
import { Logo } from "@/components/logo";

interface MarketingHeaderProps {
  /**
   * Highlight whichever nav item matches the current page so it
   * reads as "you are here". Optional — leave undefined on pages
   * that don't map cleanly to the nav (legal, shared report, etc).
   */
  active?: "installers" | "pricing" | "blog";
  /**
   * Compact mode hides the nav links entirely — just logo + CTA.
   * Used on the shared-report page (/r/[token]) where the homeowner
   * is mid-session and shouldn't see marketing distractions.
   */
  compact?: boolean;
}

export function MarketingHeader({
  active,
  compact = false,
}: MarketingHeaderProps) {
  return (
    <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center shrink-0">
          <Logo size="sm" variant="light" />
        </Link>

        {!compact && (
          <nav className="hidden sm:flex items-center gap-7 text-sm">
            <Link
              href="/enterprise"
              className={navItemClasses(active === "installers")}
            >
              For installers
            </Link>
            <Link
              href="/pricing"
              className={navItemClasses(active === "pricing")}
            >
              Pricing
            </Link>
            <Link href="/blog" className={navItemClasses(active === "blog")}>
              Journal
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {/* Desktop CTA. Hidden below sm — the mobile menu has its
              own copy of the same link as the first item so it's
              still one tap away. */}
          <Link
            href="/check"
            className="hidden sm:inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm transition-colors"
          >
            Check my home
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!compact && (
            // Mobile menu — <details> means zero JS. The summary
            // toggles open/closed natively. Tailwind's group/...
            // could rotate the chevron but we're keeping it simple.
            <details className="sm:hidden relative">
              <summary
                aria-label="Open menu"
                className="list-none inline-flex items-center justify-center h-11 w-11 rounded-lg text-navy hover:bg-cream-deep transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                <Menu className="w-5 h-5" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-[var(--border)] bg-white shadow-lg overflow-hidden">
                <Link
                  href="/check"
                  className="block px-4 py-3 text-base font-semibold text-coral-dark hover:bg-coral-pale/40 transition-colors"
                >
                  Check my home
                </Link>
                <div className="border-t border-[var(--border)]" />
                <Link
                  href="/enterprise"
                  className={mobileNavItemClasses(active === "installers")}
                >
                  For installers
                </Link>
                <Link
                  href="/pricing"
                  className={mobileNavItemClasses(active === "pricing")}
                >
                  Pricing
                </Link>
                <Link
                  href="/blog"
                  className={mobileNavItemClasses(active === "blog")}
                >
                  Journal
                </Link>
                <div className="border-t border-[var(--border)]" />
                <Link
                  href="/auth/login"
                  className="block px-4 py-3 text-base text-navy hover:bg-cream-deep transition-colors"
                >
                  Sign in
                </Link>
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}

function navItemClasses(active: boolean): string {
  return [
    "transition-colors",
    active
      ? "text-navy font-semibold"
      : "text-[var(--muted-brand)] hover:text-navy",
  ].join(" ");
}

function mobileNavItemClasses(active: boolean): string {
  return [
    "block px-4 py-3 text-base transition-colors",
    active
      ? "text-navy font-semibold bg-cream-deep"
      : "text-navy hover:bg-cream-deep",
  ].join(" ");
}
