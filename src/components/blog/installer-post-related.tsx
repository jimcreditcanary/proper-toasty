// "Other installers in this area" card rendered at the bottom of
// installer-bylined posts. Two jobs:
//
//   1. Internal-linking lift — points crawlers (+ readers who don't
//      want to book the post author) at the dedicated directory page
//      for the author's area.
//   2. Pivot path for readers — three thumbnail tiles of other
//      installers in the same area + tech, each with their own logo,
//      rating, and "Request a quote" link.
//
// Server component — queries Supabase inline via selectInstallersByArea
// (the same helper that powers town / LA / postcode-district pages).

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Star } from "lucide-react";
import {
  selectInstallersByArea,
  type InstallerCapability,
} from "@/lib/installers/by-area";

interface InstallerPostRelatedProps {
  /** Post author — excluded from the related list. */
  excludeInstallerId: number;
  /** Author's location label — only used for the heading copy. */
  areaLabel: string;
  /** Directory route for the area — null when we don't have a slug.
   *  When null the section heading still renders but without a link. */
  directoryHref: string | null;
  /** Capability — heat_pump or solar. */
  capability: InstallerCapability;
  /** Author's lat/lng — drives the distance-ranked query. */
  lat: number;
  lng: number;
}

function companyInitials(name: string): string {
  const stripped = name.replace(/\b(limited|ltd\.?|llp|plc)\b/gi, "").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export async function InstallerPostRelated({
  excludeInstallerId,
  areaLabel,
  directoryHref,
  capability,
  lat,
  lng,
}: InstallerPostRelatedProps) {
  if (!lat || !lng) return null;

  // Fetch a few more than we render so we can drop the post author
  // without coming up short. The post author themselves will usually
  // be the nearest match.
  const candidates = await selectInstallersByArea({
    lat,
    lng,
    capability,
    limit: 6,
  });
  const others = candidates
    .filter((c) => c.id !== excludeInstallerId)
    .slice(0, 4);

  if (others.length === 0) return null;

  const techLabel = capability === "solar" ? "solar PV" : "heat pump";
  const ctaHrefFor = (id: number) =>
    `/check?installer=${id}&capability=${capability}`;

  return (
    <section
      aria-label={`Other ${techLabel} installers covering ${areaLabel}`}
      className="not-prose mt-12 rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8"
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
        <h2 className="text-xl font-bold text-navy">
          Other {techLabel} installers covering {areaLabel}
        </h2>
        {directoryHref && (
          <Link
            href={directoryHref}
            className="text-sm font-medium text-coral hover:text-coral-dark inline-flex items-center gap-1"
          >
            See full directory
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {others.map((i) => {
          const showRating =
            i.google_status === "ok" &&
            i.google_rating != null &&
            i.google_review_count != null;
          return (
            <li key={i.id}>
              <Link
                href={ctaHrefFor(i.id)}
                className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-white p-3 hover:border-coral/40 hover:shadow-sm transition-all"
              >
                {i.logo_url ? (
                  <div className="shrink-0 w-10 h-10 rounded-full overflow-hidden border border-[var(--border)] bg-white relative">
                    <Image
                      src={i.logo_url}
                      alt=""
                      fill
                      sizes="40px"
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div
                    aria-hidden
                    className="shrink-0 w-10 h-10 rounded-full bg-cream border border-[var(--border)] flex items-center justify-center text-xs font-semibold text-navy"
                  >
                    {companyInitials(i.company_name)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy leading-tight truncate">
                    {i.company_name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 inline-flex items-center gap-1.5 flex-wrap">
                    {showRating && (
                      <span className="inline-flex items-center gap-1">
                        <Star
                          className="w-3 h-3 fill-current text-amber-500"
                          aria-hidden
                        />
                        <span className="font-medium text-navy">
                          {i.google_rating}
                        </span>
                        <span>({i.google_review_count})</span>
                      </span>
                    )}
                    {showRating && (
                      <span aria-hidden className="text-slate-300">
                        ·
                      </span>
                    )}
                    <span>
                      {i.distance_km < 1
                        ? "Under 1 km"
                        : `${i.distance_km.toFixed(1)} km`}
                    </span>
                  </p>
                </div>
                <ArrowRight
                  className="w-4 h-4 text-coral group-hover:translate-x-0.5 transition-transform shrink-0"
                  aria-hidden
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
