"use client";

// Client-side CTA that fires a Vercel Analytics `journey_started`
// event when clicked, then follows the link. Used from every
// homepage calculator card + hero CTA so the funnel dashboard
// can measure entry → completion for each journey type.
//
// Server-component pages (which the marketing pages all are) can
// import this directly — the "use client" boundary lives here.
//
// The completion side of the funnel is emitted from the wizard
// report shell (`journey_completed`) and from the plug-in solar
// calculator (`plug_in_solar_result_shown`).

import Link from "next/link";
import { track } from "@vercel/analytics/react";

export type JourneyType =
  | "heatpump"
  | "solar"
  | "boiler"
  | "battery"
  | "plug_in_solar"
  | "all";

export type CtaSource =
  | "homepage_hero"
  | "homepage_picker_primary"
  | "homepage_picker_secondary"
  | "homepage_footer_cta"
  | "heatpump_landing_hero"
  | "heatpump_landing_footer"
  | "solar_landing_hero"
  | "solar_landing_footer"
  | "boiler_landing_hero"
  | "boiler_landing_footer"
  | "plug_in_solar_landing_hero";

interface Props {
  href: string;
  journey: JourneyType;
  source: CtaSource;
  className?: string;
  children: React.ReactNode;
  /** Optional aria-label override for icon-only variants. */
  ariaLabel?: string;
}

export function JourneyCTA({
  href,
  journey,
  source,
  className,
  children,
  ariaLabel,
}: Props) {
  return (
    <Link
      href={href}
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        track("journey_started", { journey, source });
      }}
    >
      {children}
    </Link>
  );
}
