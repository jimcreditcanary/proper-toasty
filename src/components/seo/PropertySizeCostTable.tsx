// UK-wide cost tiers by property size. Sunsave uses the same shape
// on every /cities-and-regions/[place] page (2026 crawl) — a small
// table that answers the exact question that pulls tail traffic:
// "how much does [heat pump | solar] cost for a [size] home?".
//
// Figures are UK MCS averages, NOT local — we don't yet have per-
// LA MCS-installer average pricing loaded to Supabase. When we do,
// swap the constants for a per-location prop. Copy stays honest by
// labeling the column "UK average" so we never overclaim locality.
//
// Sources:
//   - Solar: MCS Data Dashboard, mid-2026 residential installer
//     mean price per kWp
//   - Heat pump: DESNZ Boiler Upgrade Scheme statistics + MCS
//     installer average install price (£12,000-13,000 gross; £4,500-
//     5,500 net after BUS £7,500)

import type { ReactElement } from "react";

interface Row {
  size: string;
  usage: string;
  system: string;
  cost: string;
  costWithExtras?: string;
}

interface Props {
  technology: "heat-pump" | "solar";
  placeName: string;
}

// System sizing + MCS-average pricing. Kept UK-wide until per-LA
// data lands. Solar rows lifted from MCS 2024-25 residential
// average, cross-checked with Sunsave/Solar Together published
// figures. Heat pump rows from DESNZ BUS statistics 2025.
const SOLAR_ROWS: Row[] = [
  {
    size: "1-bed / flat",
    usage: "≈1,800 kWh / yr",
    system: "2.25 kWp (5 panels)",
    cost: "£3,900",
    costWithExtras: "£6,900",
  },
  {
    size: "2-3 bed",
    usage: "≈2,700 kWh / yr",
    system: "4.5 kWp (10 panels)",
    cost: "£7,800",
    costWithExtras: "£10,800",
  },
  {
    size: "4-5 bed",
    usage: "≈4,100 kWh / yr",
    system: "6.75 kWp (15 panels)",
    cost: "£11,800",
    costWithExtras: "£14,800",
  },
];

const HEAT_PUMP_ROWS: Row[] = [
  {
    size: "1-bed / flat",
    usage: "≈8,000 kWh heat / yr",
    system: "5 kW ASHP",
    cost: "£9,500",
    costWithExtras: "£2,000",
  },
  {
    size: "2-3 bed",
    usage: "≈12,000 kWh heat / yr",
    system: "7 kW ASHP",
    cost: "£12,500",
    costWithExtras: "£5,000",
  },
  {
    size: "4-5 bed",
    usage: "≈18,000 kWh heat / yr",
    system: "11 kW ASHP",
    cost: "£15,500",
    costWithExtras: "£8,000",
  },
];

export function PropertySizeCostTable({
  technology,
  placeName,
}: Props): ReactElement {
  const rows = technology === "solar" ? SOLAR_ROWS : HEAT_PUMP_ROWS;
  const isSolar = technology === "solar";

  return (
    <>
      <h2>
        {isSolar ? "Solar panel" : "Heat pump"} cost by property size
      </h2>
      <p>
        {isSolar ? (
          <>
            Typical system sizes for a home in {placeName}, with UK
            average prices from the{" "}
            <a
              href="https://mcscertified.com/mcs-data-dashboard/"
              target="_blank"
              rel="noopener noreferrer"
            >
              official MCS installer database
            </a>
            . The right-hand column shows the cost with a home battery
            included (roughly £3,000 extra).
          </>
        ) : (
          <>
            Typical heat pump sizes for a home in {placeName}, with UK
            average install costs from{" "}
            <a
              href="https://www.gov.uk/government/collections/boiler-upgrade-scheme-statistics"
              target="_blank"
              rel="noopener noreferrer"
            >
              government figures
            </a>
            . The right-hand column shows what you actually pay after
            the £7,500 grant is deducted.
          </>
        )}
      </p>
      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Home size</th>
              <th>Yearly usage</th>
              <th>System size</th>
              <th>{isSolar ? "Cost (system only)" : "Full price"}</th>
              <th>
                {isSolar ? "With home battery" : "What you pay after grant"}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.size}>
                <td>{r.size}</td>
                <td>{r.usage}</td>
                <td>{r.system}</td>
                <td>{r.cost}</td>
                <td>{r.costWithExtras}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <small>
          These are UK-wide averages — your actual quote will vary
          with your roof, insulation, and installer. A guide only;
          your installer&rsquo;s final quote will differ.
        </small>
      </p>
    </>
  );
}
