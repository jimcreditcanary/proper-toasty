"use client";

// EpcRatingBar — vertical A→G band ladder with current + potential
// arrows. Mirrors the GOV.UK EPC certificate's headline visual: each
// band sits on its own row coloured per the canonical palette, and
// the user's current + potential ratings are called out with arrows
// pointing in from the right.
//
// Layout:
//
//   ┌───┐                    ┌─────┐
//   │ A │                    │ ... │
//   ├───┤                    └─────┘
//   │ B │              Current     Potential
//   ├───┤                    ┌─────┐
//   │ C │  ← 62 C            │     │
//   ├───┤                    │     │
//   │ D │  ← 58 C            │     │
//   ├───┤                    │     │
//   │ E │                    │     │
//   ├───┤                    │     │
//   │ F │                    │     │
//   ├───┤                    │     │
//   │ G │                    │     │
//   └───┘                    └─────┘
//
// Bar widths cascade A → G (A is shortest, G is widest) the same way
// they do on the certificate, so the visual hierarchy reads at a
// glance. Arrows are simple coloured chips with a triangular notch
// pointing left at the row of the matching band.

interface Props {
  currentBand: string | null;
  potentialBand: string | null;
  /** SAP score (0–100) shown alongside the band letter on each arrow.
   *  Optional — many certs ship the band without the rating number.  */
  currentRating?: number | null;
  potentialRating?: number | null;
}

const BANDS = ["A", "B", "C", "D", "E", "F", "G"] as const;
type Band = (typeof BANDS)[number];

const BAND_COLOR: Record<Band, string> = {
  A: "bg-[#0e8a3a]",
  B: "bg-[#3da935]",
  C: "bg-[#8dc63f]",
  D: "bg-[#ffd602]",
  E: "bg-[#fdb515]",
  F: "bg-[#f47e20]",
  G: "bg-[#e1251b]",
};

// Text colour per band — yellow / orange need dark text for AA contrast,
// the rest take white.
const BAND_TEXT: Record<Band, string> = {
  A: "text-white",
  B: "text-white",
  C: "text-white",
  D: "text-navy",
  E: "text-navy",
  F: "text-white",
  G: "text-white",
};

// Bar widths match the certificate's stepped cascade. Each value is
// the proportion of the row width the coloured bar fills (0–1).
const BAND_WIDTH: Record<Band, number> = {
  A: 0.42,
  B: 0.5,
  C: 0.58,
  D: 0.66,
  E: 0.74,
  F: 0.82,
  G: 0.9,
};

export function EpcRatingBar({
  currentBand,
  potentialBand,
  currentRating,
  potentialRating,
}: Props) {
  const cur = (currentBand?.toUpperCase().slice(0, 1) ?? null) as Band | null;
  const pot = (potentialBand?.toUpperCase().slice(0, 1) ?? null) as Band | null;

  return (
    <div role="group" aria-label="Energy Performance Certificate ratings">
      {/* Header row — Current / Potential column labels, aligned over
          the arrow track. Mirrors the certificate's column titles. */}
      <div className="flex items-center justify-end gap-2 text-xs font-medium text-slate-500 mb-2 pr-1">
        <span className="w-14 text-center">Current</span>
        <span className="w-14 text-center">Potential</span>
      </div>

      <div className="space-y-1">
        {BANDS.map((band) => (
          <BandRow
            key={band}
            band={band}
            isCurrent={band === cur}
            isPotential={band === pot}
            currentRating={band === cur ? currentRating ?? null : null}
            potentialRating={band === pot ? potentialRating ?? null : null}
          />
        ))}
      </div>
    </div>
  );
}

function BandRow({
  band,
  isCurrent,
  isPotential,
  currentRating,
  potentialRating,
}: {
  band: Band;
  isCurrent: boolean;
  isPotential: boolean;
  currentRating: number | null;
  potentialRating: number | null;
}) {
  const widthPct = `${Math.round(BAND_WIDTH[band] * 100)}%`;
  return (
    <div className="flex items-center gap-2">
      {/* The coloured bar — flexes to its mapped width, letter on the
          right edge so the visual reads like a stepped pyramid. */}
      <div className="flex-1 flex">
        <div
          className={`relative h-7 flex items-center justify-end pr-2 rounded-r-md ${BAND_COLOR[band]} ${BAND_TEXT[band]} font-bold text-sm`}
          style={{ width: widthPct }}
        >
          {band}
        </div>
      </div>
      {/* Arrow track — two fixed-width slots so the Current/Potential
          chips align across rows even when only one arrow lights up. */}
      <div className="flex items-center gap-2 shrink-0">
        <ArrowSlot band={band} rating={currentRating} active={isCurrent} />
        <ArrowSlot band={band} rating={potentialRating} active={isPotential} />
      </div>
    </div>
  );
}

function ArrowSlot({
  band,
  rating,
  active,
}: {
  band: Band;
  rating: number | null;
  active: boolean;
}) {
  if (!active) {
    // Reserved empty slot keeps every row the same width.
    return <div aria-hidden="true" className="w-14 h-7" />;
  }
  return (
    <div
      className={`relative w-14 h-7 ${BAND_COLOR[band]} ${BAND_TEXT[band]} font-bold text-xs flex items-center justify-center rounded-r-md`}
      title={`${rating ?? ""} ${band}`.trim()}
    >
      {/* Left-pointing notch — gives the chip the arrow shape that
          points at the band on its left. clip-path triangle inherits
          the band's bg-utility class so the colour matches. */}
      <NotchOverlay bandClass={BAND_COLOR[band]} />
      <span className="relative z-10">
        {rating != null ? `${rating} ` : ""}
        {band}
      </span>
    </div>
  );
}

/** A coloured triangle pointing left, anchored to the chip's left edge.
 *  Placed in its own absolutely-positioned <span> so it shares the
 *  chip's bg-color utility class without us having to reach into the
 *  Tailwind hex constants from the inline style. */
function NotchOverlay({ bandClass }: { bandClass: string }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute -left-[7px] top-0 h-7 w-2 ${bandClass}`}
      style={{
        clipPath: "polygon(100% 0, 100% 100%, 0 50%)",
      }}
    />
  );
}

// Backwards-compatibility alias — the old name was EpcDualBadge.
export { EpcRatingBar as EpcDualBadge };
