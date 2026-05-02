"use client";

// Reusable wrapper for the /admin and /installer portals.
//
// Renders a section header (portal name + page title) and a horizontal
// nav strip — empty in F1 so each portal just has somewhere to land.
// Each subsequent feature PR (I1 availability, I2 leads, A1 user mgmt
// etc.) appends its own NavItem.
//
// Hard role-gating happens in the route's layout.tsx and the
// middleware. This component is presentation-only.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export interface NavItem {
  label: string;
  href: string;
  icon?: ReactNode;
}

export interface BackLink {
  href: string;
  label: string;
}

interface Props {
  /** Coral-pill label up top — "Admin portal" / "Installer portal" */
  portalName: "Admin" | "Installer";
  /** Big H1 below the portal name. Per-page title. */
  pageTitle: string;
  /** Optional sub-headline under the page title. */
  pageSubtitle?: string;
  /** Tabs along the bottom of the header. Empty in F1. */
  navItems?: NavItem[];
  /** Optional "← Back to ..." link rendered above the page title.
   *  Use on subpages (e.g. /installer/leads) so users have a one-
   *  click path back to /installer without hunting for the logo. */
  backLink?: BackLink;
  children: ReactNode;
}

export function PortalShell({
  portalName,
  pageTitle,
  pageSubtitle,
  navItems = [],
  backLink,
  children,
}: Props) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-6 pb-4">
          {backLink && (
            <Link
              href={backLink.href}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-coral transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {backLink.label}
            </Link>
          )}
          <p className="text-xs font-semibold uppercase tracking-wider text-coral">
            {portalName} portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-navy leading-tight">
            {pageTitle}
          </h1>
          {pageSubtitle && (
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {pageSubtitle}
            </p>
          )}
        </div>

        {navItems.length > 0 && (
          <nav
            className="mx-auto max-w-6xl px-4 sm:px-6 overflow-x-auto"
            aria-label={`${portalName} sections`}
          >
            <ul className="flex gap-1 -mb-px">
              {navItems.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href} className="shrink-0">
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`inline-flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                        active
                          ? "border-coral text-navy"
                          : "border-transparent text-slate-600 hover:text-navy hover:border-slate-300"
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
