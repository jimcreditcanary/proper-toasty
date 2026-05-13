// /research/uk-affordability-index — UK Heat Pump & Solar Affordability Index.
//
// Server-rendered data asset page. Reads the trended EPC snapshot
// from src/data/affordability-trends.json (regenerated from
// scripts/epc-bulk/trends.ts) and renders:
//
//   - Headline statistic + 40-60 word direct answer
//   - Inline SVG chart of "% homes at EPC band C or better" by year
//   - Per-year aggregate table (national)
//   - Per-region breakdown table (most recent snapshot year)
//
// Charts are inline SVG so AI crawlers (which can't execute JS but
// can read SVG content) ingest the data + axis labels verbatim. No
// client JS on this page.
//
// Refresh cadence: monthly with the EPC bulk dump. Re-run
// scripts/epc-bulk/trends.ts, copy tmp/epc-aggregates/trends.json
// over src/data/affordability-trends.json, ship the PR.

import type { Metadata } from "next";
import { AEOPage } from "@/components/seo";
import { DEFAULT_AUTHOR_SLUG } from "@/lib/seo/authors";
import affordabilityData from "@/data/affordability-trends.json";

const URL =
  "https://www.propertoasty.com/research/uk-affordability-index";

type Band = "A" | "B" | "C" | "D" | "E" | "F" | "G";

interface Snapshot {
  year: number;
  region: string;
  sample_size: number;
  band_distribution_pct: Partial<Record<Band, number>>;
  band_c_or_better_pct: number;
  band_d_or_worse_pct: number;
  median_floor_area_m2: number | null;
  median_heating_cost_gbp: number | null;
  mains_gas_pct: number | null;
  top_property_type: string | null;
  top_age_band: string | null;
}

interface AffordabilityDataset {
  _placeholder?: boolean;
  snapshots: Snapshot[];
}

const data = affordabilityData as unknown as AffordabilityDataset;
const isPlaceholder = data._placeholder === true || data.snapshots.length === 0;

// ─── Metadata ────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title:
    "UK Heat Pump & Solar Affordability Index 2026 — EPC-backed data asset",
  description:
    "Annual snapshot of UK home energy affordability — EPC band shares, heating costs, mains-gas coverage, by year and region. Built from the full GOV.UK EPC Register.",
  alternates: { canonical: URL },
  openGraph: {
    title: "UK Heat Pump & Solar Affordability Index 2026",
    description:
      "EPC-backed data asset: how UK home energy affordability has shifted by year and region.",
    type: "article",
    url: URL,
    siteName: "Propertoasty",
    locale: "en_GB",
    images: [{ url: "/hero-heatpump.jpg", width: 1200, height: 630 }],
  },
};

// ─── SVG chart helpers ───────────────────────────────────────────────

interface LinePoint {
  year: number;
  value: number;
  label: string;
}

function BandCOrBetterChart({ points }: { points: LinePoint[] }) {
  if (points.length < 2) return null;

  const width = 720;
  const height = 360;
  const padding = { top: 30, right: 30, bottom: 50, left: 60 };
  const plotW = width - padding.left - padding.right;
  const plotH = height - padding.top - padding.bottom;

  const years = points.map((p) => p.year);
  const xMin = Math.min(...years);
  const xMax = Math.max(...years);
  const xSpan = xMax - xMin || 1;

  const values = points.map((p) => p.value);
  const yMin = Math.max(0, Math.floor(Math.min(...values) / 10) * 10 - 5);
  const yMax = Math.min(100, Math.ceil(Math.max(...values) / 10) * 10 + 5);
  const ySpan = yMax - yMin || 1;

  const x = (year: number): number =>
    padding.left + ((year - xMin) / xSpan) * plotW;
  const y = (val: number): number =>
    padding.top + plotH - ((val - yMin) / ySpan) * plotH;

  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p.year)},${y(p.value)}`)
    .join(" ");

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax; v += 10) yTicks.push(v);

  return (
    <figure className="not-prose my-8">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-labelledby="afford-chart-title"
        className="bg-white border border-[var(--border)] rounded-2xl"
      >
        <title id="afford-chart-title">
          % of UK home EPC lodgements at band C or better, by year
        </title>
        {/* Y axis gridlines + labels */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              y1={y(v)}
              x2={padding.left + plotW}
              y2={y(v)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y(v) + 4}
              textAnchor="end"
              fontSize={11}
              fill="#64748b"
            >
              {v}%
            </text>
          </g>
        ))}
        {/* X axis labels */}
        {points.map((p) => (
          <g key={p.year}>
            <text
              x={x(p.year)}
              y={padding.top + plotH + 20}
              textAnchor="middle"
              fontSize={11}
              fill="#64748b"
            >
              {p.year}
            </text>
          </g>
        ))}
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke="#ff6b35"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points */}
        {points.map((p) => (
          <g key={p.year}>
            <circle cx={x(p.year)} cy={y(p.value)} r={4} fill="#ff6b35" />
            <text
              x={x(p.year)}
              y={y(p.value) - 10}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#1e293b"
            >
              {p.value.toFixed(1)}%
            </text>
          </g>
        ))}
        {/* Axis lines */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + plotH}
          stroke="#1e293b"
          strokeWidth={1}
        />
        <line
          x1={padding.left}
          y1={padding.top + plotH}
          x2={padding.left + plotW}
          y2={padding.top + plotH}
          stroke="#1e293b"
          strokeWidth={1}
        />
        <text
          x={width / 2}
          y={height - 8}
          textAnchor="middle"
          fontSize={12}
          fill="#1e293b"
          fontWeight={500}
        >
          Lodgement year
        </text>
      </svg>
      <figcaption className="text-xs text-slate-500 mt-2 text-center">
        Source: GOV.UK EPC Register (Open Government Licence v3.0).
        Each year shows lodgements made in that calendar year only.
      </figcaption>
    </figure>
  );
}

// ─── Page ───────────────────────────────────────────────────────────

function nationalSnapshots(): Snapshot[] {
  return data.snapshots
    .filter((s) => s.region === "UK total")
    .sort((a, b) => a.year - b.year);
}

function regionalSnapshotsForLatestYear(): Snapshot[] {
  if (data.snapshots.length === 0) return [];
  const latestYear = Math.max(...data.snapshots.map((s) => s.year));
  return data.snapshots
    .filter((s) => s.year === latestYear && s.region !== "UK total")
    .sort((a, b) => b.band_c_or_better_pct - a.band_c_or_better_pct);
}

function buildDirectAnswer(nationals: Snapshot[]): string {
  if (nationals.length === 0) {
    return "The UK Heat Pump & Solar Affordability Index tracks how UK home energy affordability has shifted year-on-year using the full GOV.UK EPC Register. Headline metrics: EPC band shares, median heating cost, mains-gas coverage, dominant property type. Data refreshed monthly with the bulk EPC dump.";
  }
  const earliest = nationals[0];
  const latest = nationals[nationals.length - 1];
  const delta = latest.band_c_or_better_pct - earliest.band_c_or_better_pct;
  const direction = delta >= 0 ? "improved" : "declined";
  return `Across ${nationals.length} snapshot years (${earliest.year}–${latest.year}), the share of UK home EPC lodgements rated band C or better has ${direction} from ${earliest.band_c_or_better_pct.toFixed(0)}% to ${latest.band_c_or_better_pct.toFixed(0)}%. In ${latest.year}, the median UK home cost £${latest.median_heating_cost_gbp ?? "—"}/yr to heat with ${latest.mains_gas_pct?.toFixed(0) ?? "—"}% of properties on mains gas. Source: full GOV.UK EPC Register.`;
}

export default function UkAffordabilityIndexPage() {
  const nationals = nationalSnapshots();
  const regionals = regionalSnapshotsForLatestYear();
  const linePoints: LinePoint[] = nationals.map((s) => ({
    year: s.year,
    value: s.band_c_or_better_pct,
    label: `${s.year}: ${s.band_c_or_better_pct.toFixed(1)}%`,
  }));

  return (
    <AEOPage
      headline={
        isPlaceholder
          ? "UK Heat Pump & Solar Affordability Index 2026 (data refresh pending)"
          : "UK Heat Pump & Solar Affordability Index 2026"
      }
      description="EPC-backed data asset: how UK home energy affordability has shifted by year and region, drawn from the full GOV.UK EPC Register."
      url={URL}
      image="/hero-heatpump.jpg"
      datePublished="2026-05-13"
      dateModified="2026-05-13"
      authorSlug={DEFAULT_AUTHOR_SLUG}
      section="Research · UK Affordability Index"
      breadcrumbs={[
        { name: "Home", url: "/" },
        { name: "Research", url: "/research" },
        { name: "UK Affordability Index" },
      ]}
      directAnswer={buildDirectAnswer(nationals)}
      tldr={
        isPlaceholder
          ? [
              "Data refresh in progress — full snapshot lands when the next bulk-CSV trends pass completes.",
              "Page renders the structure now; numbers fill in on the next deploy.",
              "Source: GOV.UK EPC Register, Open Government Licence v3.0.",
            ]
          : [
              `${nationals.length} year snapshots: ${nationals[0]?.year}–${nationals[nationals.length - 1]?.year}.`,
              `Band C or better share moved from ${nationals[0]?.band_c_or_better_pct.toFixed(0)}% to ${nationals[nationals.length - 1]?.band_c_or_better_pct.toFixed(0)}%.`,
              `${nationals[nationals.length - 1]?.mains_gas_pct?.toFixed(0)}% of UK homes on mains gas (latest snapshot).`,
              `Median UK heating cost: £${nationals[nationals.length - 1]?.median_heating_cost_gbp}/yr.`,
              "Regional breakdown + raw numbers below.",
            ]
      }
      sourcesEpc
      sources={[
        {
          name: "GOV.UK — Find an Energy Performance Certificate (EPC Register)",
          url: "https://find-energy-certificate.service.gov.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "GOV.UK — EPC bulk download (technical documentation)",
          url: "https://get-energy-performance-data.communities.gov.uk/api-technical-documentation/",
          accessedDate: "May 2026",
        },
        {
          name: "Energy Saving Trust — Energy efficiency context",
          url: "https://energysavingtrust.org.uk/",
          accessedDate: "May 2026",
        },
        {
          name: "Ofgem — Domestic energy price cap",
          url: "https://www.ofgem.gov.uk/energy-price-cap",
          accessedDate: "May 2026",
        },
      ]}
    >
      {isPlaceholder ? (
        <>
          <h2>Refresh in progress</h2>
          <p>
            The data asset behind this page is regenerated monthly
            from the full GOV.UK EPC Register. The next snapshot is
            being processed; the page will populate with the latest
            numbers on the next deploy.
          </p>
          <p>
            In the meantime, see the per-area data on the{" "}
            <a href="/heat-pumps">heat-pump town pages</a> and{" "}
            <a href="/solar-panels">solar town pages</a> for
            location-specific EPC aggregates.
          </p>
        </>
      ) : (
        <>
          <h2>Headline trend — UK homes at EPC band C or better</h2>
          <p>
            Band C or better is the threshold that broadly maps to
            &ldquo;heat-pump ready without significant fabric
            work&rdquo;. The line below tracks the share of EPC
            lodgements rated C or better in each snapshot year.
          </p>

          <BandCOrBetterChart points={linePoints} />

          <h2>Per-year national snapshot</h2>
          <p>
            EPC lodgements per snapshot year, with the headline
            metrics. Each row is the cohort of certificates lodged
            in that calendar year — not a cumulative current-state
            picture.
          </p>

          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Lodgements</th>
                <th>Band C+</th>
                <th>Band D+</th>
                <th>Median heating cost</th>
                <th>Median floor area</th>
                <th>Mains gas</th>
              </tr>
            </thead>
            <tbody>
              {nationals.map((s) => (
                <tr key={s.year}>
                  <td>
                    <strong>{s.year}</strong>
                  </td>
                  <td>{s.sample_size.toLocaleString("en-GB")}</td>
                  <td>{s.band_c_or_better_pct.toFixed(1)}%</td>
                  <td>{s.band_d_or_worse_pct.toFixed(1)}%</td>
                  <td>
                    {s.median_heating_cost_gbp != null
                      ? `£${s.median_heating_cost_gbp.toLocaleString("en-GB")}`
                      : "—"}
                  </td>
                  <td>
                    {s.median_floor_area_m2 != null
                      ? `${s.median_floor_area_m2} m²`
                      : "—"}
                  </td>
                  <td>
                    {s.mains_gas_pct != null
                      ? `${s.mains_gas_pct.toFixed(0)}%`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {regionals.length > 0 && (
            <>
              <h2>
                Regional breakdown — {nationals[nationals.length - 1]?.year}
              </h2>
              <p>
                The same metrics by Government Statistical Service
                region code, latest snapshot year only. Ranked by
                share of band C+ lodgements descending.
              </p>
              <table>
                <thead>
                  <tr>
                    <th>Region</th>
                    <th>Lodgements</th>
                    <th>Band C+</th>
                    <th>Median heating cost</th>
                    <th>Mains gas</th>
                    <th>Dominant property type</th>
                  </tr>
                </thead>
                <tbody>
                  {regionals.map((s) => (
                    <tr key={s.region}>
                      <td>{s.region}</td>
                      <td>{s.sample_size.toLocaleString("en-GB")}</td>
                      <td>{s.band_c_or_better_pct.toFixed(1)}%</td>
                      <td>
                        {s.median_heating_cost_gbp != null
                          ? `£${s.median_heating_cost_gbp.toLocaleString("en-GB")}`
                          : "—"}
                      </td>
                      <td>
                        {s.mains_gas_pct != null
                          ? `${s.mains_gas_pct.toFixed(0)}%`
                          : "—"}
                      </td>
                      <td>{s.top_property_type ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <h2>Methodology</h2>
          <p>
            The dataset is built from the full GOV.UK EPC Register
            bulk download — every domestic Energy Performance
            Certificate lodged in England and Wales. The snapshot
            years (default 2012, 2016, 2020, 2024, 2026) are
            processed independently: each row represents the cohort
            of certs lodged in that calendar year, not the
            cumulative state of UK housing.
          </p>
          <p>
            Two consequences worth flagging:
          </p>
          <ul>
            <li>
              <strong>Sampling bias.</strong> EPCs are required at
              sale and new build, so the year cohort over-represents
              moving-house events. The dataset is the population of
              lodgements, not the population of UK homes.
            </li>
            <li>
              <strong>Definition drift.</strong> EPC methodology has
              changed across the period (RdSAP updates, age band
              re-labelling, glazing assessment refinements). Year-on-
              year comparisons are directionally robust; pixel-perfect
              comparisons are not.
            </li>
          </ul>
          <p>
            Pipeline scripts:{" "}
            <a href="https://github.com/jimcreditcanary/proper-toasty/tree/main/scripts/epc-bulk">
              scripts/epc-bulk/
            </a>
            .
          </p>

          <h2>Use this data</h2>
          <p>
            Cite this page when referencing the figures. The
            underlying EPC data is published under the{" "}
            <a
              href="https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Government Licence v3.0
            </a>{" "}
            (&copy; Crown copyright). Press / research enquiries:{" "}
            <a href="/contact">contact page</a>.
          </p>
        </>
      )}
    </AEOPage>
  );
}
