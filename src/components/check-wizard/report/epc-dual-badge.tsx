"use client";

// EpcRatingBar — a tighter, more informative EPC visual than the old
// side-by-side dual badge. Shows:
//   - A big band-letter tile for the current rating (the most
//     prominent thing on the certificate)
//   - "Current: Band X" + "Potential: Band Y" labels next to it
//   - A horizontal A→G scale where the user's current and potential
//     bands are highlighted, every other band muted. Mirrors the
//     stripe an EPC certificate uses so the homeowner immediately
//     recognises the visual.
//
// Colours match the GOV.UK EPC palette (A green → G red).

interface Props {
  currentBand: string | null;
  potentialBand: string | null;
}

const BANDS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const BAND_TONE: Record<string, { bg: string; text: string }> = {
  A: { bg: "bg-[#0e8a3a]", text: "text-white" },
  B: { bg: "bg-[#3da935]", text: "text-white" },
  C: { bg: "bg-[#8dc63f]", text: "text-white" },
  D: { bg: "bg-[#ffd602]", text: "text-navy" },
  E: { bg: "bg-[#fdb515]", text: "text-navy" },
  F: { bg: "bg-[#f47e20]", text: "text-white" },
  G: { bg: "bg-[#e1251b]", text: "text-white" },
};

const FALLBACK_TONE = { bg: "bg-slate-200", text: "text-slate-500" };

export function EpcRatingBar({ currentBand, potentialBand }: Props) {
  const cur = currentBand?.toUpperCase().slice(0, 1) ?? null;
  const pot = potentialBand?.toUpperCase().slice(0, 1) ?? null;
  const curTone = (cur && BAND_TONE[cur]) || FALLBACK_TONE;

  return (
    <div role="group" aria-label="Energy Performance Certificate ratings">
      <div className="flex items-center gap-3">
        {/* Big tile showing the current band — the bit a homeowner
            already remembers from their certificate. */}
        <div
          className={`shrink-0 w-16 h-16 rounded-lg flex items-center justify-center font-bold text-3xl tracking-tight ${curTone.bg} ${curTone.text}`}
          aria-hidden="true"
        >
          {cur ?? "—"}
        </div>
        <div className="min-w-0">
          <p className="text-base font-semibold text-navy leading-tight">
            <span className="text-slate-500">Current:</span>{" "}
            {cur ? `Band ${cur}` : "Not on file"}
          </p>
          <p className="mt-0.5 text-sm text-slate-600 leading-tight">
            <span className="text-slate-500">Potential:</span>{" "}
            {pot ? `Band ${pot}` : "—"}
          </p>
        </div>
      </div>

      {/* A→G horizontal scale. Each band is a thin pill the width of
          ~1/7th of the row. Active bands (current + potential) sit at
          full saturation; inactive bands fade to half opacity so the
          eye lands on the user's two bands first. */}
      <div className="mt-3 flex items-center gap-1" aria-hidden="true">
        {BANDS.map((band) => {
          const tone = BAND_TONE[band] ?? FALLBACK_TONE;
          const isCurrent = band === cur;
          const isPotential = band === pot;
          const dim = !isCurrent && !isPotential;
          return (
            <div
              key={band}
              className={`flex-1 h-2.5 rounded-full ${tone.bg} ${
                dim ? "opacity-30" : ""
              }`}
              title={`Band ${band}`}
            />
          );
        })}
      </div>
    </div>
  );
}

// Backwards-compatibility alias — the old name was EpcDualBadge.
// Kept exporting so existing imports in overview-tab don't break
// during the rename. Remove once no callers remain.
export { EpcRatingBar as EpcDualBadge };
