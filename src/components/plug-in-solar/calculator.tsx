// Plug-in solar payback calculator — client-side, no API calls.
//
// Model: for each kit, work out annual generation from capacity ×
// UK base yield × direction multiplier, apply a self-consumption
// factor, multiply by the user's electricity price, and derive
// payback from that. Ranked by payback (lowest first).
//
// Voice: plain-English on every label — this is a marketing tool
// aimed at consumers, not a spec sheet. Numeric outputs are rounded
// to whole pounds and single-decimal years so the results feel
// concrete rather than fake-precise.
//
// Follows the Solarplug pattern (see /plug-in-solar/best-kits-uk-2026
// for kit references) with a fraction of the complexity — no
// postcode lookup, no half-hourly tariff modelling, no batteries in
// the plug-in scope yet.

"use client";

import { useMemo, useState, type ReactElement } from "react";

// ─── Kit catalogue ─────────────────────────────────────────────────
// Each entry mirrors what best-kits-uk-2026 recommends. Prices
// checked mid-2026 — refresh quarterly. `amazonAsin` null means
// buy-direct-only.
interface Kit {
  id: string;
  name: string;
  subtitle: string;
  capacityW: number;
  panelCount: number;
  panelW: number;
  priceGBP: number;
  amazonAsin: string | null;
  brand: "anker" | "ecoflow" | "generic";
  color: string; // CSS colour for the visual header
}

const KITS: Kit[] = [
  {
    id: "anker-solix-rs40p",
    name: "Anker SOLIX RS40P",
    subtitle: "Best all-round — 10-year warranty, UK service",
    capacityW: 800,
    panelCount: 2,
    panelW: 445,
    priceGBP: 799,
    amazonAsin: "B0DGCH5GTP",
    brand: "anker",
    color: "#0e73f6",
  },
  {
    id: "ecoflow-stream-micro",
    name: "EcoFlow STREAM Micro",
    subtitle: "Best for adding a battery later",
    capacityW: 800,
    panelCount: 2,
    panelW: 445,
    priceGBP: 899,
    amazonAsin: "B0DXKQXPZ7",
    brand: "ecoflow",
    color: "#00b287",
  },
  {
    id: "amazon-budget-800w",
    name: "Amazon budget kit (2-panel)",
    subtitle: "Cheapest legit — check tested-equipment listing",
    capacityW: 800,
    panelCount: 2,
    panelW: 400,
    priceGBP: 500,
    amazonAsin: null,
    brand: "generic",
    color: "#c85a3e",
  },
  {
    id: "amazon-budget-400w",
    name: "Amazon budget kit (1-panel starter)",
    subtitle: "Single-panel starter — testing the water",
    capacityW: 400,
    panelCount: 1,
    panelW: 400,
    priceGBP: 400,
    amazonAsin: null,
    brand: "generic",
    color: "#8b7fc7",
  },
];

// ─── Model ────────────────────────────────────────────────────────
// UK national average yield per kilowatt of south-facing capacity —
// a smoothed average from published PVGIS data across the four UK
// regions. Used as-is for south; scaled for other directions.
const BASE_YIELD_KWH_PER_KW = 900;

const DIRECTION_MULT: Record<Direction, number> = {
  south: 1.0,
  "east-west": 0.8,
  north: 0.55, // included for completeness; the UI warns against it
};

// Self-consumption — the share of generation you actually use rather
// than losing to the grid. Plug-in kits don't export, so anything
// unused just goes nowhere. Rough real-world bands from published
// German + UK studies.
const SELF_CONSUMPTION: Record<HomeUse, number> = {
  "home-daytime": 0.85,
  "sometimes-home": 0.6,
  "out-all-day": 0.4,
};

type Direction = "south" | "east-west" | "north";
type HomeUse = "home-daytime" | "sometimes-home" | "out-all-day";

interface KitResult {
  kit: Kit;
  annualKwh: number;
  annualSavingGBP: number;
  monthlySavingGBP: number;
  paybackYears: number;
  tenYearNetGBP: number;
}

function calculateKit(
  kit: Kit,
  direction: Direction,
  homeUse: HomeUse,
  tariffPence: number,
): KitResult {
  const capacityKw = kit.capacityW / 1000;
  const annualKwh = Math.round(
    capacityKw * BASE_YIELD_KWH_PER_KW * DIRECTION_MULT[direction],
  );
  const usedKwh = annualKwh * SELF_CONSUMPTION[homeUse];
  const annualSavingGBP = (usedKwh * tariffPence) / 100;
  const monthlySavingGBP = annualSavingGBP / 12;
  const paybackYears =
    annualSavingGBP > 0 ? kit.priceGBP / annualSavingGBP : Infinity;
  const tenYearNetGBP = annualSavingGBP * 10 - kit.priceGBP;
  return {
    kit,
    annualKwh,
    annualSavingGBP,
    monthlySavingGBP,
    paybackYears,
    tenYearNetGBP,
  };
}

// ─── Component ────────────────────────────────────────────────────

const AMAZON_TAG = "propertoasty-21";
const amz = (asin: string) =>
  `https://www.amazon.co.uk/dp/${asin}?tag=${AMAZON_TAG}`;

export function PlugInSolarCalculator(): ReactElement {
  const [direction, setDirection] = useState<Direction>("south");
  const [homeUse, setHomeUse] = useState<HomeUse>("sometimes-home");
  const [tariffPence, setTariffPence] = useState<number>(27);

  const results = useMemo(() => {
    return KITS.map((k) => calculateKit(k, direction, homeUse, tariffPence))
      .slice()
      .sort((a, b) => a.paybackYears - b.paybackYears);
  }, [direction, homeUse, tariffPence]);

  return (
    <div style={styles.wrapper}>
      <div style={styles.headerBar}>
        <p style={styles.eyebrow}>Try it now</p>
        <h2 style={styles.h2}>What would plug-in solar actually save you?</h2>
        <p style={styles.sub}>
          Three quick questions. Real payback numbers on real UK kits.
        </p>
      </div>

      <div style={styles.form}>
        <FormField label="Which way does your balcony or wall face?">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as Direction)}
            style={styles.select}
          >
            <option value="south">South (best)</option>
            <option value="east-west">East or west</option>
            <option value="north">
              North (not really worth doing — but shown anyway)
            </option>
          </select>
        </FormField>

        <FormField label="Are you home during the day?">
          <select
            value={homeUse}
            onChange={(e) => setHomeUse(e.target.value as HomeUse)}
            style={styles.select}
          >
            <option value="home-daytime">
              Yes, most days (work from home, kids at home, retired)
            </option>
            <option value="sometimes-home">
              Sometimes (mix of home and out)
            </option>
            <option value="out-all-day">Out at work all week</option>
          </select>
        </FormField>

        <FormField label="Your electricity price (pence per unit)">
          <input
            type="number"
            min={10}
            max={60}
            step={1}
            value={tariffPence}
            onChange={(e) =>
              setTariffPence(Math.max(10, Math.min(60, Number(e.target.value))))
            }
            style={styles.input}
          />
          <span style={styles.hint}>
            The UK average is 27p. Check the top of your latest electricity
            bill for your specific rate.
          </span>
        </FormField>
      </div>

      <div style={styles.resultsHeader}>
        <p style={styles.eyebrow}>Ranked for you</p>
        <h3 style={styles.h3}>Kits sorted by fastest payback</h3>
      </div>

      <div style={styles.grid}>
        {results.map((r, i) => (
          <KitResultCard key={r.kit.id} result={r} rank={i + 1} />
        ))}
      </div>

      <p style={styles.disclaimer}>
        These are estimates based on UK average sunlight and your inputs.
        Actual savings depend on your specific address, shading, and how
        your electricity use lines up with sunny hours. For a proper
        indication tailored to your home,{" "}
        <a href="/check/solar" style={styles.disclaimerLink}>
          run our free 5-minute solar pre-survey
        </a>
        .
      </p>
    </div>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactElement | ReactElement[];
}) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function KitResultCard({
  result,
  rank,
}: {
  result: KitResult;
  rank: number;
}) {
  const { kit, annualSavingGBP, monthlySavingGBP, paybackYears, tenYearNetGBP } =
    result;
  const paybackDisplay =
    paybackYears === Infinity || paybackYears > 20
      ? "—"
      : `${paybackYears.toFixed(1)} yrs`;

  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardHeader, background: kit.color }}>
        <div style={styles.cardRank}>#{rank}</div>
        <div style={styles.cardPlaceholder}>
          {/* Simple visual placeholder — represents the two panels in a
              typical plug-in kit. Deliberately abstract so we don't
              depend on external image hosts breaking. */}
          <div style={styles.panelSVG}>
            {Array.from({ length: kit.panelCount }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 48,
                  height: 72,
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.05) 100%)",
                  border: "1px solid rgba(255,255,255,0.35)",
                  borderRadius: 4,
                  boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
                }}
              />
            ))}
          </div>
        </div>
      </div>
      <div style={styles.cardBody}>
        <p style={styles.cardName}>{kit.name}</p>
        <p style={styles.cardSubtitle}>{kit.subtitle}</p>

        <div style={styles.statRow}>
          <div style={styles.statBig}>
            <div style={styles.statValue}>£{Math.round(monthlySavingGBP)}</div>
            <div style={styles.statLabel}>a month off your bill</div>
          </div>
          <div style={styles.statBig}>
            <div style={styles.statValue}>{paybackDisplay}</div>
            <div style={styles.statLabel}>to pay for itself</div>
          </div>
        </div>

        <div style={styles.statGrid}>
          <div>
            <div style={styles.statSmall}>
              £{Math.round(annualSavingGBP)}
            </div>
            <div style={styles.statLabel}>a year saved</div>
          </div>
          <div>
            <div style={styles.statSmall}>
              £{tenYearNetGBP >= 0 ? "+" : ""}
              {Math.round(tenYearNetGBP).toLocaleString("en-GB")}
            </div>
            <div style={styles.statLabel}>net after 10 years</div>
          </div>
          <div>
            <div style={styles.statSmall}>£{kit.priceGBP}</div>
            <div style={styles.statLabel}>kit price</div>
          </div>
        </div>

        <div style={styles.ctaRow}>
          {kit.amazonAsin ? (
            <a
              href={amz(kit.amazonAsin)}
              target="_blank"
              rel="noopener sponsored"
              style={styles.ctaPrimary}
            >
              Buy on Amazon UK →
            </a>
          ) : (
            <a
              href={`https://www.amazon.co.uk/s?k=${encodeURIComponent(
                kit.name,
              )}&tag=${AMAZON_TAG}`}
              target="_blank"
              rel="noopener sponsored"
              style={styles.ctaPrimary}
            >
              Browse on Amazon UK →
            </a>
          )}
          <a href="/plug-in-solar/best-kits-uk-2026" style={styles.ctaSecondary}>
            Full review
          </a>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
// Inline styles kept because the calculator ships as a drop-in
// component; keeping the CSS local avoids adding a global stylesheet
// dependency for callers to remember.
const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: "var(--cream-deep, #f5efe6)",
    border: "1px solid var(--border, #e2dcd0)",
    borderRadius: 20,
    padding: "2rem 1.5rem",
    marginTop: "2rem",
    marginBottom: "2rem",
  },
  headerBar: {
    textAlign: "center",
    marginBottom: "1.5rem",
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "#c85a3e",
    margin: 0,
  },
  h2: {
    fontSize: 28,
    marginTop: 8,
    marginBottom: 4,
    color: "var(--navy, #0f1f3a)",
  },
  h3: {
    fontSize: 22,
    marginTop: 8,
    marginBottom: 4,
    color: "var(--navy, #0f1f3a)",
  },
  sub: {
    fontSize: 15,
    color: "var(--muted-brand, #6b6157)",
    margin: 0,
  },
  form: {
    display: "grid",
    gap: 16,
    marginBottom: 24,
    maxWidth: 640,
    marginLeft: "auto",
    marginRight: "auto",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--navy, #0f1f3a)",
  },
  select: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border, #e2dcd0)",
    background: "white",
    fontSize: 15,
    color: "var(--navy, #0f1f3a)",
  },
  input: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid var(--border, #e2dcd0)",
    background: "white",
    fontSize: 15,
    color: "var(--navy, #0f1f3a)",
  },
  hint: {
    fontSize: 12,
    color: "var(--muted-brand, #6b6157)",
  },
  resultsHeader: {
    textAlign: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  grid: {
    display: "grid",
    gap: 16,
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  },
  card: {
    background: "white",
    borderRadius: 16,
    overflow: "hidden",
    border: "1px solid var(--border, #e2dcd0)",
    display: "flex",
    flexDirection: "column",
  },
  cardHeader: {
    position: "relative",
    padding: "1.5rem",
    minHeight: 120,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "white",
  },
  cardRank: {
    position: "absolute",
    top: 12,
    left: 12,
    background: "rgba(255,255,255,0.2)",
    color: "white",
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 10px",
    borderRadius: 999,
  },
  cardPlaceholder: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  panelSVG: {
    display: "flex",
    gap: 4,
  },
  cardBody: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
  },
  cardName: {
    fontSize: 17,
    fontWeight: 600,
    color: "var(--navy, #0f1f3a)",
    margin: 0,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "var(--muted-brand, #6b6157)",
    margin: 0,
    lineHeight: 1.4,
  },
  statRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    padding: "12px",
    background: "var(--cream, #faf7f2)",
    borderRadius: 10,
  },
  statBig: {
    textAlign: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "var(--navy, #0f1f3a)",
    lineHeight: 1.1,
  },
  statSmall: {
    fontSize: 15,
    fontWeight: 600,
    color: "var(--navy, #0f1f3a)",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: 11,
    color: "var(--muted-brand, #6b6157)",
    marginTop: 4,
    lineHeight: 1.3,
  },
  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 8,
    textAlign: "center",
  },
  ctaRow: {
    display: "flex",
    gap: 8,
    marginTop: "auto",
  },
  ctaPrimary: {
    flex: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    background: "#c85a3e",
    color: "white",
    borderRadius: 999,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 600,
  },
  ctaSecondary: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 14px",
    background: "transparent",
    color: "var(--navy, #0f1f3a)",
    border: "1px solid var(--border, #e2dcd0)",
    borderRadius: 999,
    textDecoration: "none",
    fontSize: 14,
    fontWeight: 500,
  },
  disclaimer: {
    fontSize: 12,
    color: "var(--muted-brand, #6b6157)",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 0,
    lineHeight: 1.5,
  },
  disclaimerLink: {
    color: "#c85a3e",
    textDecoration: "underline",
  },
};
