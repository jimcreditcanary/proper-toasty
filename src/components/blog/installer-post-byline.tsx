// Author byline rendered directly under the H1 on installer-bylined
// blog posts. Logo + company name + location + MCS-cert tech bucket.
//
// Visually prominent (not metadata-text-small) — readers landing on
// "I've been fitting…" need to see whose voice they're hearing
// immediately. The vibe matches the new installer-card aesthetic on
// directory pages: round logo / initials avatar, navy company name,
// trust-signal pill row.

import Image from "next/image";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export interface InstallerPostBylineProps {
  companyName: string;
  logoUrl: string | null;
  /** Town or county string (best effort — county is what's on the row). */
  locationLabel: string | null;
  /** Human-readable tech bucket — "heat pump", "solar PV", etc. */
  techDisplay: string | null;
  /** Linkable for the byline to land on the author profile page when
   *  there is one. Falls back to plain text. */
  authorHref?: string | null;
}

function companyInitials(name: string): string {
  const stripped = name.replace(/\b(limited|ltd\.?|llp|plc)\b/gi, "").trim();
  const words = stripped.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "—";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function InstallerPostByline({
  companyName,
  logoUrl,
  locationLabel,
  techDisplay,
  authorHref,
}: InstallerPostBylineProps) {
  const name = (
    <span className="text-base sm:text-lg font-semibold text-navy leading-tight">
      {companyName}
    </span>
  );

  return (
    <div className="mt-6 mb-2 flex items-center gap-4 rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5">
      {logoUrl ? (
        <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden border border-[var(--border)] bg-white relative">
          <Image
            src={logoUrl}
            alt={`${companyName} logo`}
            fill
            sizes="56px"
            className="object-contain"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-cream border border-[var(--border)] flex items-center justify-center text-sm font-semibold text-navy"
        >
          {companyInitials(companyName)}
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          By
        </p>
        <p className="mt-0.5">
          {authorHref ? (
            <Link
              href={authorHref}
              className="hover:text-coral-dark transition-colors"
            >
              {name}
            </Link>
          ) : (
            name
          )}
        </p>
        {(locationLabel || techDisplay) && (
          <p className="mt-1 text-xs sm:text-sm text-slate-500 inline-flex items-center gap-1.5 flex-wrap">
            {locationLabel && <span>{locationLabel}</span>}
            {locationLabel && techDisplay && (
              <span aria-hidden className="text-slate-300">
                ·
              </span>
            )}
            {techDisplay && (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck
                  className="w-3.5 h-3.5 text-coral"
                  aria-hidden
                />
                MCS-certified {techDisplay} installer
              </span>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
