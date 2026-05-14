// MarketingHeader — single canonical header for every public /
// marketing page (home, blog, legal, AI statement, shared report).
//
// Dual-audience design. Propertoasty serves two distinct customers:
//   - Homeowners: run a free property check, read the journal.
//   - Installers: sign up, claim leads, sign in, see pricing.
//
// We surface that choice as a persistent toggle at the top of the
// nav — same pattern Airbnb / Uber / DoorDash use for their split
// audiences. The toggle is always visible (so a homeowner who lands
// on /enterprise via a partner link can flip back), shows current
// audience as the active segment, and navigates to that audience's
// landing page on switch.
//
// Audience precedence:
//   1. `audience` prop          — explicit override (canonical pages)
//   2. `pt_audience` cookie     — pinned by proxy on canonical visits
//   3. "homeowner"              — default for new visitors
//
// Auth-aware:
//   - Signed in → "Account" link to the user's role-based home
//     (admin → /admin, installer → /installer, else /dashboard).
//   - Signed out + installer audience → "Sign in" link.
//   - Signed out + homeowner audience → no auth surface (homeowners
//     don't need to sign in for a free check).
//
// Pure synchronous server component. Used to read cookies + Supabase
// session at render time but those calls forced Next.js to mark every
// page that includes the header as dynamic + private, which broke
// Bing indexability on all SEO surfaces (Bing won't index pages with
// cache-control: private).
//
// Now: audience defaults to "homeowner" when not passed; pages that
// need the installer view pass audience="installer" explicitly.
// Auth state is no longer read here — the "Sign in" link is generic;
// /auth/login handles already-signed-in users with a server-side
// redirect to their role-based home.
//
// Mobile menu still <details>/<summary> so no client JS needed.

import Link from "next/link";
import { ArrowRight, CircleUserRound, Hammer, Home, Menu } from "lucide-react";
import { Logo } from "@/components/logo";
import { type MarketingAudience } from "@/lib/marketing/audience";

interface MarketingHeaderProps {
  /** Which audience this page is for. Defaults to "homeowner" when
   *  not passed. Pages targeting installers (/enterprise, /pricing,
   *  /installer-signup) pass audience="installer". */
  audience?: MarketingAudience;
  /** Highlight whichever nav item matches the current page so it
   *  reads as "you are here". */
  active?: "home" | "blog" | "overview" | "pricing" | "signin";
  /** Compact mode hides the nav and the audience toggle — just
   *  logo + a single CTA. Used on the shared-report page where
   *  the homeowner is mid-session and shouldn't see distractions. */
  compact?: boolean;
}

export function MarketingHeader({
  audience = "homeowner",
  active,
  compact = false,
}: MarketingHeaderProps) {
  const isInstaller = audience === "installer";
  // accountHref kept null to maintain the existing render logic
  // (signed-out branch). Signed-in users get redirected from
  // /auth/login if they hit it, which the auth callback handles.
  const accountHref: string | null = null;

  return (
    <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-5 sm:gap-7">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size="sm" variant="light" />
          </Link>

          {/* Audience tabs. Inline tab-style switcher sitting next to
              the logo — acts as a sub-brand identifier for the current
              audience. Active tab has a coral underline that meets
              the header's bottom border, the standard tabbed-nav idiom
              ("you are in this section of the site"). Hidden on small
              screens where the burger menu carries the choice. */}
          {!compact && (
            <>
              <div
                aria-hidden="true"
                className="hidden md:block h-6 w-px bg-[var(--border)]"
              />
              <AudienceTabs current={audience} />
            </>
          )}
        </div>

        {/* Right-hand cluster: nav links sit immediately to the left
            of the CTA. Internal gap-6 keeps the links tight so they
            read as a single right-aligned group rather than a third
            distributed section. The CTA is the visual anchor on the
            far right. */}
        <div className="flex items-center gap-6">
          {/* Audience-specific nav links. */}
          {!compact && (
            <nav className="hidden md:flex items-center gap-6 text-sm">
              {isInstaller ? (
                <>
                  <Link
                    href="/enterprise"
                    className={navItemClasses(active === "overview")}
                  >
                    How it works
                  </Link>
                  <Link
                    href="/pricing"
                    className={navItemClasses(active === "pricing")}
                  >
                    Pricing
                  </Link>
                  {accountHref ? (
                    <Link
                      href={accountHref}
                      className={navItemClasses(active === "signin")}
                    >
                      Account
                    </Link>
                  ) : (
                    <Link
                      href="/auth/login"
                      className={navItemClasses(active === "signin")}
                    >
                      Sign in
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link
                    href="/blog"
                    className={navItemClasses(active === "blog")}
                  >
                    Journal
                  </Link>
                  {/* Homeowners don't need a sign-in surface when
                      logged out — they fill in the wizard guest-style.
                      But signed-in users still benefit from a quick
                      hop to their dashboard. */}
                  {accountHref && (
                    <Link
                      href={accountHref}
                      className={navItemClasses(false)}
                    >
                      Account
                    </Link>
                  )}
                </>
              )}
            </nav>
          )}

          {/* Desktop CTA. Audience-specific:
                Homeowner → "Check my home" (the free pre-survey tool)
                Installer → "Get started" (signup) */}
          <Link
            href={isInstaller ? "/installer-signup" : "/check"}
            className="hidden md:inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm transition-colors"
          >
            {isInstaller ? "Get started" : "Check my home"}
            <ArrowRight className="w-4 h-4" />
          </Link>

          {!compact && (
            // Mobile menu — <details> means zero JS. The toggle lives
            // at the very top of the panel since it's the most
            // important context-switching primitive for this site.
            <details className="md:hidden relative">
              <summary
                aria-label="Open menu"
                className="list-none inline-flex items-center justify-center h-11 w-11 rounded-lg text-navy hover:bg-cream-deep transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
              >
                <Menu className="w-5 h-5" />
              </summary>
              <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--border)] bg-white shadow-lg overflow-hidden">
                {/* Audience switcher at the top of the panel — the
                    inline tabs don't fit in the small-screen header
                    so we surface the choice here as a pill toggle. */}
                <div className="p-3 bg-cream-deep/40">
                  <AudienceTogglePill current={audience} />
                </div>
                {isInstaller ? (
                  <>
                    <Link
                      href="/installer-signup"
                      className="block px-4 py-3 text-base font-semibold text-coral-dark hover:bg-coral-pale/40 transition-colors"
                    >
                      Get started
                    </Link>
                    <div className="border-t border-[var(--border)]" />
                    <Link
                      href="/enterprise"
                      className={mobileNavItemClasses(active === "overview")}
                    >
                      How it works
                    </Link>
                    <Link
                      href="/pricing"
                      className={mobileNavItemClasses(active === "pricing")}
                    >
                      Pricing
                    </Link>
                    <div className="border-t border-[var(--border)]" />
                    {accountHref ? (
                      <Link
                        href={accountHref}
                        className={mobileNavItemClasses(false)}
                      >
                        <span className="inline-flex items-center gap-2">
                          <CircleUserRound className="w-4 h-4 text-coral" />
                          Account
                        </span>
                      </Link>
                    ) : (
                      <Link
                        href="/auth/login"
                        className={mobileNavItemClasses(active === "signin")}
                      >
                        Sign in
                      </Link>
                    )}
                  </>
                ) : (
                  <>
                    <Link
                      href="/check"
                      className="block px-4 py-3 text-base font-semibold text-coral-dark hover:bg-coral-pale/40 transition-colors"
                    >
                      Check my home
                    </Link>
                    <div className="border-t border-[var(--border)]" />
                    <Link
                      href="/blog"
                      className={mobileNavItemClasses(active === "blog")}
                    >
                      Journal
                    </Link>
                    {accountHref && (
                      <>
                        <div className="border-t border-[var(--border)]" />
                        <Link
                          href={accountHref}
                          className={mobileNavItemClasses(false)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CircleUserRound className="w-4 h-4 text-coral" />
                            Account
                          </span>
                        </Link>
                      </>
                    )}
                  </>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </header>
  );
}

/**
 * Inline tab-style audience switcher. Two text links with a coral
 * underline on the active one — the standard "tabbed sections of a
 * site" idiom (Stripe docs, Linear changelog, Vercel templates).
 *
 * Sits inline next to the logo on desktop. Switching navigates to
 * that audience's canonical landing page (/ or /enterprise); the
 * proxy then pins the choice in the `pt_audience` cookie so it
 * persists across non-canonical pages.
 */
function AudienceTabs({ current }: { current: MarketingAudience }) {
  return (
    <nav
      role="tablist"
      aria-label="Switch audience"
      className="hidden md:flex items-center gap-1"
    >
      <AudienceTab
        href="/"
        active={current === "homeowner"}
        label="Homeowners"
      />
      <AudienceTab
        href="/enterprise"
        active={current === "installer"}
        label="Installers"
      />
    </nav>
  );
}

function AudienceTab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={[
        // Tab geometry — fits inside the 64px header. Bottom padding
        // matches the offset of the active underline so inactive tabs
        // don't visually shift on hover.
        "relative inline-flex items-center h-16 px-3 text-sm font-medium transition-colors",
        active
          ? "text-navy"
          : "text-[var(--muted-brand)] hover:text-navy",
      ].join(" ")}
    >
      {label}
      {/* Underline indicator. Sits at the bottom of the tab, flush
          with the header's bottom border so it reads as "this section
          of the site is open". Coloured coral for the active tab; a
          transparent placeholder on inactive tabs keeps the layout
          identical (no jump on hover/switch). */}
      <span
        aria-hidden="true"
        className={[
          "absolute left-3 right-3 bottom-0 h-0.5 rounded-t-full",
          active ? "bg-coral" : "bg-transparent",
        ].join(" ")}
      />
    </Link>
  );
}

/**
 * Pill-shaped two-segment toggle. Used inside the mobile burger
 * menu where the inline tabs don't fit. Same navigation behaviour
 * as the desktop tabs.
 */
function AudienceTogglePill({
  current,
}: {
  current: MarketingAudience;
}) {
  return (
    <div
      className="inline-flex w-full p-0.5 rounded-full bg-white border border-[var(--border)]"
      role="tablist"
      aria-label="Switch audience"
    >
      <PillSegment
        href="/"
        active={current === "homeowner"}
        icon={<Home className="w-3.5 h-3.5" />}
        label="Homeowners"
      />
      <PillSegment
        href="/enterprise"
        active={current === "installer"}
        icon={<Hammer className="w-3.5 h-3.5" />}
        label="Installers"
      />
    </div>
  );
}

function PillSegment({
  href,
  active,
  icon,
  label,
}: {
  href: string;
  active: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={[
        "flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-colors",
        active
          ? "bg-coral text-cream shadow-sm"
          : "text-navy hover:text-coral-dark",
      ].join(" ")}
    >
      {icon}
      {label}
    </Link>
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
