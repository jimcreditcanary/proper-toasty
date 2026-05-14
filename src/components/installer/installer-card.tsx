"use client";

// Installer card — public-facing trust signal for town / LA / postcode
// + dedicated installer-listing pages.
//
// Layout: horizontal 1-column card. Company info + trust badges on
// the left, rating + CTA stack on the right. More breathing room than
// the previous 3-col grid version which felt cramped.
//
// Server-renders the static data; client-side useEffect hydrates the
// Google rating row on demand.
//
// Phase 5 constraints (per the brief):
//   MUST show: company name, Google rating + count + "last verified"
//              date, Checkatrade verification badge (when URL is on
//              file), services covered, primary CTA.
//   MUST NOT show: phone, email, website, "Book a meeting" CTA.
//
// CTA copy: "Request a quote" — matches user expectation from
// directory sites (Checkatrade, MyBuilder, Bark) + honest about the
// flow (users DO get a quote after the 5-minute property check).
// Helper subtext clarifies the path.

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
  return d.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
}

function companyInitials(name: string): string {
  // Strip "Limited" / "Ltd" / "LLP" so initials are about the brand
  // not the corporate suffix.
  const stripped = name
    .replace(/\b(limited|ltd\.?|llp|plc)\b/gi, "")
    .trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function InstallerCard({ installer, capability }: InstallerCardProps) {
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

  // Capability list — services this installer offers, relevant to
  // the current page context.
  const capBadges: string[] = [];
  if (installer.cap_air_source_heat_pump) capBadges.push("Air-source heat pump");
  if (installer.cap_ground_source_heat_pump) capBadges.push("Ground-source heat pump");
  if (installer.cap_solar_pv) capBadges.push("Solar PV");
  if (installer.cap_battery_storage) capBadges.push("Battery storage");

  const showGoogleRow =
    googleStatus === "ok" && googleRating != null && googleCount != null;
  const showCheckatradeBadge =
    installer.checkatrade_url != null && installer.checkatrade_status === "ok";

  return (
    <article className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 flex flex-col sm:flex-row gap-5 sm:gap-6 hover:border-coral/40 hover:shadow-sm transition-all">
      {/* ─── Left: company info ─────────────────────────────────────── */}
      <div className="flex flex-1 gap-4 min-w-0">
        {/* Initials avatar */}
        <div
          aria-hidden
          className="hidden sm:flex shrink-0 w-12 h-12 rounded-full bg-cream border border-[var(--border)] items-center justify-center text-sm font-semibold text-navy"
        >
          {companyInitials(installer.company_name)}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-navy leading-tight">
            {installer.company_name}
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            {installer.distance_km < 1
              ? "Under 1 km away"
              : `${installer.distance_km.toFixed(1)} km away`}
            {installer.postcode ? ` · ${installer.postcode}` : ""}
          </p>

          {capBadges.length > 0 && (
            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              <span className="font-medium text-navy">Covers:</span>{" "}
              {capBadges.join(" · ")}
            </p>
          )}

          {/* Trust badges row */}
          <ul className="not-prose mt-3 flex flex-wrap gap-1.5">
            <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-700">
              <ShieldCheck className="w-3.5 h-3.5 text-coral" aria-hidden />
              MCS #{installer.certification_number}
            </li>
            {installer.bus_registered && capability === "heat_pump" && (
              <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-700">
                <Award className="w-3.5 h-3.5 text-coral" aria-hidden />
                BUS registered
              </li>
            )}
            {installer.years_in_business != null &&
              installer.years_in_business >= 3 && (
                <li className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-700">
                  {installer.years_in_business}+ years in business
                </li>
              )}
            {showCheckatradeBadge && installer.checkatrade_url && (
              <li>
                <a
                  href={installer.checkatrade_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-full bg-cream border border-[var(--border)] px-2.5 py-1 text-[11px] text-slate-700 hover:border-coral hover:text-coral transition-colors"
                >
                  <ShieldCheck
                    className="w-3.5 h-3.5 text-emerald-600"
                    aria-hidden
                  />
                  Verified on Checkatrade
                  <span aria-hidden>↗</span>
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* ─── Right: rating + CTA stack ─────────────────────────────── */}
      <div className="flex sm:flex-col sm:items-end justify-between gap-3 sm:gap-4 sm:min-w-[200px] sm:border-l sm:border-[var(--border)] sm:pl-6">
        {showGoogleRow ? (
          <div className="text-left sm:text-right">
            <div className="inline-flex items-center gap-1.5">
              <Star
                className="w-4 h-4 fill-current text-amber-500"
                aria-hidden
              />
              <span className="text-lg font-semibold text-navy">
                {googleRating}
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-0.5">
              {googleCount} Google {googleCount === 1 ? "review" : "reviews"}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Verified {fmtDate(googleAt)}
            </p>
          </div>
        ) : (
          // Reserve space silently so cards align in a row.
          <div className="text-left sm:text-right opacity-0 select-none">
            <span className="text-lg font-semibold">—</span>
            <p className="text-xs">—</p>
          </div>
        )}

        <div className="text-right">
          <Link
            href={ctaHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-coral hover:bg-coral-dark text-cream font-medium text-sm h-10 px-5 transition-colors whitespace-nowrap"
          >
            Request a quote
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-[10px] text-slate-400 mt-1.5 sm:text-right">
            Free 5-minute property check first
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * Small footer that should appear once at the bottom of any list of
 * installer cards — satisfies the Google Maps Platform attribution
 * requirement without repeating "Powered by Google" on every card.
 */
export function InstallerCardAttribution() {
  return (
    <p className="text-[11px] text-slate-400 mt-4 text-center">
      Rating data sourced from Google Maps. Powered by Google.
    </p>
  );
}
