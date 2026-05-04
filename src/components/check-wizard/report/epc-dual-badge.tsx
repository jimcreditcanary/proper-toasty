"use client";

// EpcDualBadge — clean side-by-side display of an EPC's current + potential
// energy bands. Mirrors the colour-coded letter system the GOV.UK EPC
// register uses (A green → G red), so a homeowner looking at their
// real EPC certificate immediately recognises the visual.
//
// We show the band letter big, the optional numeric score below it.
// Two side-by-side blocks (Current | Potential) so the user can see
// at a glance how much headroom they've got.

interface Props {
  currentBand: string | null;
  potentialBand: string | null;
  currentScore?: number | null;
}

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

export function EpcDualBadge({
  currentBand,
  potentialBand,
  currentScore,
}: Props) {
  return (
    <div
      role="group"
      aria-label="Energy Performance Certificate ratings"
      className="grid grid-cols-2 gap-2"
    >
      <BandBlock label="Current" band={currentBand} score={currentScore} />
      <BandBlock label="Potential" band={potentialBand} />
    </div>
  );
}

function BandBlock({
  label,
  band,
  score,
}: {
  label: string;
  band: string | null;
  score?: number | null;
}) {
  const upper = band?.toUpperCase().slice(0, 1) ?? null;
  const tone = (upper && BAND_TONE[upper]) || FALLBACK_TONE;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center gap-3">
      <div
        className={`shrink-0 w-14 h-14 rounded-lg flex items-center justify-center font-bold text-2xl tracking-tight ${tone.bg} ${tone.text}`}
        aria-hidden="true"
      >
        {upper ?? "—"}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-sm text-navy font-semibold leading-tight">
          {upper ? `Band ${upper}` : "Not on file"}
        </p>
        {score != null && (
          <p className="text-xs text-slate-500 tabular-nums">Score {score}/100</p>
        )}
      </div>
    </div>
  );
}
