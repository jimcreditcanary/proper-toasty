// Cross-service link block. Renders the OTHER three service pages
// covering the same location, so /heat-pumps/luton crosslinks to
// /solar-panels/luton + /heat-pump-installers/luton + /solar-panel-
// installers/luton. Modelled on the Checkatrade "related services"
// pattern that pushes PageRank through a location cluster and gives
// AI overviews the full service surface for a place in one click.
//
// The four programmatic route templates all share the same slug
// namespace (pilot town / LA / PCD), so linking is a matter of
// swapping the URL prefix — no data lookup needed.
//
// Archetypes are NOT real places and are gated out at the caller.

import type { ReactElement } from "react";

export type Service =
  | "heat-pumps"
  | "solar-panels"
  | "heat-pump-installers"
  | "solar-panel-installers";

interface Props {
  slug: string;
  placeName: string;
  currentService: Service;
}

const SERVICE_LABEL: Record<Service, (placeName: string) => string> = {
  "heat-pumps": (p) => `Heat pumps in ${p}: cost + BUS grant`,
  "solar-panels": (p) => `Solar panels in ${p}: cost + payback`,
  "heat-pump-installers": (p) => `MCS heat pump installers in ${p}`,
  "solar-panel-installers": (p) => `MCS solar panel installers in ${p}`,
};

const SERVICE_BLURB: Record<Service, string> = {
  "heat-pumps": "guide + local EPC data",
  "solar-panels": "guide + local EPC data",
  "heat-pump-installers": "directory, distance-ranked",
  "solar-panel-installers": "directory, distance-ranked",
};

const ORDER: Service[] = [
  "heat-pumps",
  "solar-panels",
  "heat-pump-installers",
  "solar-panel-installers",
];

export function CrossServiceLinks({
  slug,
  placeName,
  currentService,
}: Props): ReactElement {
  const others = ORDER.filter((s) => s !== currentService);
  return (
    <>
      <h2>Also in {placeName}</h2>
      <p>
        Every service page below is generated from the same local EPC
        + MCS-installer data as this one — pick whichever matches what
        you&rsquo;re researching:
      </p>
      <ul>
        {others.map((service) => (
          <li key={service}>
            <a href={`/${service}/${slug}`}>
              {SERVICE_LABEL[service](placeName)}
            </a>{" "}
            — {SERVICE_BLURB[service]}.
          </li>
        ))}
      </ul>
    </>
  );
}
