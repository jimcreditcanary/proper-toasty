"use client";

// Installer card — public-facing trust signal for town / LA / postcode
// pages. Server-renders the static data (name, certifications,
// services); client-side useEffect hydrates the Google rating row.
//
// Phase 5 constraints (per the brief):
//   MUST show: company name, Google rating + count + "last verified"
//              date, Checkatrade verification badge (when URL is on
//              file), services covered, primary CTA "Get a free
//              suitability report".
//   MUST NOT show: phone, email, website, "Book a meeting" CTA.
//
// The card's only job is to communicate trust and route the user into
// the Phase 6 questionnaire flow with the installer-id pre-bound.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, Award } from "lucide-react";
import type { InstallerCardData } from "@/lib/installers/by-area";

interface InstallerCardProps {
  installer: InstallerCardData;
  /** Heat pump vs solar context; drives the CTA href + capability
   *  badges. */
  capability: "heat_pump" | "solar";
}

interface GoogleRefreshResponse {
  ok: boolean;
  results: Array<{
    id: number;
    googleRating: number | null;
    googleReviewCount: number | null;
    googleStatus: string | null;
    googleCapturedAt: string | null;
  }>;
}

/** Cache TTL — must match the server-side 30-day TTL in google-places.ts. */
const GOOGLE_TTL_DAYS = 30;

function isGoogleFresh(capturedAt: string | null): boolean {
  if (!capturedAt) return false;
  const cutoff = Date.now() - GOOGLE_TTL_DAYS * 24 * 60 * 60 * 1000;
  return new Date(capturedAt).getTime() > cutoff;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
  });
}

export function InstallerCard({ installer, capability }: InstallerCardProps) {
  // The DB row carries cached review data. We hydrate on mount if
  // the cache is stale or empty.
  const [googleRating, setGoogleRating] = useState(installer.google_rating);
  const [googleCount, setGoogleCount] = useState(installer.google_review_count);
  const [googleStatus, setGoogleStatus] = useState(installer.google_status);
  const [googleAt, setGoogleAt] = useState(installer.google_captured_at);

  useEffect(() => {
    if (isGoogleFresh(installer.google_captured_at)) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/installers/google-refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [installer.id] }),
        });
        if (!res.ok || cancelled) return;
        const json = (await res.json()) as GoogleRefreshResponse;
        const hit = json.results?.find((r) => r.id === installer.id);
        if (!hit || cancelled) return;
        setGoogleRating(hit.googleRating);
        setGoogleCount(hit.googleReviewCount);
        setGoogleStatus(hit.googleStatus);
        setGoogleAt(hit.googleCapturedAt);
      } catch {
        // best-effort — silent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [installer.id, installer.google_captured_at]);

  const ctaHref = `/check?installer=${installer.id}&capability=${capability}`;

  // Capability badges — what does this installer do?
  const capBadges: string[] = [];
  if (installer.cap_air_source_heat_pump) capBadges.push("Air-source heat pump");
  if (installer.cap_ground_source_heat_pump) capBadges.push("Ground-source heat pump");
  if (installer.cap_solar_pv) capBadges.push("Solar PV");
  if (installer.cap_battery_storage) capBadges.push("Battery storage");

  const showGoogleRow = googleStatus === "ok" && googleRating != null && googleCount != null;
  const showCheckatradeBadge =
    installer.checkatrade_url != null && installer.checkatrade_status === "ok";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5 flex flex-col">
      {/* Header — name + distance */}
      <header className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-navy leading-tight">
            {installer.company_name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            {installer.distance_km < 1
              ? "Under 1 km away"
              : `${installer.distance_km.toFixed(1)} km away`}
            {installer.postcode ? ` · ${installer.postcode}` : ""}
          </p>
        </div>
      </header>

      {/* Trust signals — MCS, BUS, years-in-business */}
      <ul className="not-prose mb-3 flex flex-wrap gap-1.5">
        <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-xs text-navy">
          <ShieldCheck className="w-3.5 h-3.5 text-coral" aria-hidden />
          MCS #{installer.certification_number}
        </li>
        {installer.bus_registered && capability === "heat_pump" && (
          <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-xs text-navy">
            <Award className="w-3.5 h-3.5 text-coral" aria-hidden />
            BUS registered
          </li>
        )}
        {installer.years_in_business != null && installer.years_in_business >= 3 && (
          <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-xs text-navy">
            {installer.years_in_business}+ years in business
          </li>
        )}
      </ul>

      {/* Google rating row — hides when status != ok */}
      {showGoogleRow && (
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 font-medium text-navy">
            <Star className="w-4 h-4 fill-current text-amber-500" aria-hidden />
            {googleRating}
          </span>
          <span className="text-slate-600">
            ({googleCount} Google {googleCount === 1 ? "review" : "reviews"})
          </span>
          <span className="text-[11px] text-slate-400 ml-auto">
            Verified {fmtDate(googleAt)}
          </span>
        </div>
      )}

      {/* Checkatrade link-out badge — Option A from Phase 2 */}
      {showCheckatradeBadge && installer.checkatrade_url && (
        <a
          href={installer.checkatrade_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-xs text-slate-700 hover:border-coral hover:text-coral transition-colors"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden />
          Verified on Checkatrade
          <span aria-hidden>↗</span>
        </a>
      )}

      {/* Services covered */}
      {capBadges.length > 0 && (
        <p className="text-xs text-slate-600 leading-relaxed mb-4">
          <span className="font-medium text-navy">Covers:</span>{" "}
          {capBadges.join(" · ")}
        </p>
      )}

      {/* Primary CTA — routes to /check with installer pre-bound (Phase 6) */}
      <Link
        href={ctaHref}
        className="mt-auto inline-flex items-center justify-center gap-1.5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm h-10 px-4 transition-colors"
      >
        Get a free suitability report
        <ArrowRight className="w-4 h-4" />
      </Link>

      {/* Google attribution footnote — required by Maps Platform ToS
          when displaying ratings sourced from Places API. */}
      {showGoogleRow && (
        <p className="mt-3 text-[10px] text-slate-400">
          Rating data sourced from Google Maps. Powered by Google.
        </p>
      )}
    </article>
  );
}
