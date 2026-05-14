// InstallerListSection — server component that queries installers
// covering a given area, then renders a responsive grid of
// InstallerCard tiles.
//
// Drops onto town / LA / postcode pages via:
//   <InstallerListSection
//     lat={town.lat}
//     lng={town.lng}
//     areaLabel={town.name}
//     capability="heat_pump"
//   />
//
// When no installers are found within the widest search radius, the
// section renders a fallback "no installers covering this area yet"
// message rather than disappearing — so the page still has a clear
// next-step CTA.

import { InstallerCard } from "./installer-card";
import {
  selectInstallersByArea,
  type InstallerCapability,
} from "@/lib/installers/by-area";

interface InstallerListSectionProps {
  /** Area centroid used for distance ranking. */
  lat: number;
  lng: number;
  /** Display name of the area — "Sheffield", "S1 (Sheffield)",
   *  "Birmingham (local authority area)". */
  areaLabel: string;
  /** Tech filter — drives which installers are returned + the
   *  copy on the section header. */
  capability: InstallerCapability;
  /** Max installers to render. Defaults to 8 — enough to feel
   *  substantive without overwhelming the page. */
  limit?: number;
}

export async function InstallerListSection({
  lat,
  lng,
  areaLabel,
  capability,
  limit = 8,
}: InstallerListSectionProps) {
  // Coordinates of 0,0 (or null) mean we don't have a sensible area
  // centroid — skip the section entirely rather than rendering all
  // installers ordered by distance from the Atlantic.
  if (!lat || !lng) return null;

  const installers = await selectInstallersByArea({
    lat,
    lng,
    capability,
    limit,
  });

  const techLabel =
    capability === "solar" ? "solar PV" : "heat pump";

  return (
    <section className="not-prose mt-12">
      <h2 className="text-2xl font-semibold text-navy mb-2">
        MCS-certified {techLabel} installers covering {areaLabel}
      </h2>
      <p className="text-sm text-slate-600 mb-6 max-w-2xl">
        We&rsquo;ve matched these installers from the official MCS
        directory based on their service-area coverage of {areaLabel}.
        Ratings come from Google verified reviews. To get an
        installer-ready suitability report and connect with one of
        them, click through to the free 5-minute check.
      </p>

      {installers.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-sm text-slate-600">
          <p>
            We haven&rsquo;t yet indexed MCS-certified {techLabel}{" "}
            installers covering {areaLabel}. Run our{" "}
            <a href="/check" className="text-coral underline">
              free pre-survey
            </a>{" "}
            and we&rsquo;ll match you with installers who serve your
            specific postcode.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {installers.map((i) => (
            <InstallerCard key={i.id} installer={i} capability={capability} />
          ))}
        </div>
      )}
    </section>
  );
}
