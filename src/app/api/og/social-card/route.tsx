// Branded social card — PNG rendered on demand.
//
// The daily social agent (/api/cron/social-agent) generates a
// card URL per post and passes it to Buffer as an image asset,
// so every LinkedIn / X / Facebook / Instagram post gets a unique
// on-brand visual instead of the same OG image scraped from
// propertoasty.com every day.
//
// Two formats:
//   - landscape (default) — 1200×630, correct for LinkedIn / X /
//     Facebook link cards + Open Graph previews.
//   - square              — 1080×1080, correct for Instagram feed.
//     Same brand system, redesigned proportions so the headline
//     dominates and doesn't get letterboxed inside IG's frame.
//
// Constraints (next/og + Satori):
//   - Layout is flexbox-only; no CSS grid, no floats
//   - Colours must be full literals (no CSS vars)
//   - No images from URLs unless embedded — the wordmark is text
//
// Params:
//   ?title=<blog title>       (required, ≤ 140 chars)
//   ?pillar=<pillar slug>     one of heat_pump|solar|plug_in_solar|blog
//   ?format=<landscape|square> defaults to landscape
//
// Runtime: edge (fast, cheap, cached at the edge).

import { ImageResponse } from "next/og";

export const runtime = "edge";
// Cache aggressively — deterministic query = same PNG bytes.
export const revalidate = 2592000;

const BRAND = {
  cream: "#FAF7F2",
  navy: "#2A2922",
  coral: "#2C5E4A", // brand "coral" is a forest green post-rebrand
  terracotta: "#D9813C",
  sage: "#A8BCA1",
  muted: "#6B7266",
  border: "#E8E2D6",
} as const;

type Pillar = "heat_pump" | "solar" | "plug_in_solar" | "blog";

function pillarChip(p: string): { label: string; accent: string } {
  switch (p as Pillar) {
    case "heat_pump":
      return { label: "Heat pump savings", accent: BRAND.coral };
    case "solar":
      return { label: "Solar + battery", accent: BRAND.terracotta };
    case "plug_in_solar":
      return { label: "Plug-in solar", accent: BRAND.sage };
    default:
      return { label: "Propertoasty", accent: BRAND.coral };
  }
}

// ─── Landscape (1200×630) — for LinkedIn / X / Facebook link cards ─
function LandscapeCard({
  title,
  pillar,
}: {
  title: string;
  pillar: { label: string; accent: string };
}) {
  const fontSize =
    title.length > 80 ? 58 : title.length > 55 ? 72 : 86;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BRAND.cream,
        fontFamily: "Georgia, serif",
        padding: "72px",
        position: "relative",
      }}
    >
      <CornerAccents />
      <Wordmark />
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize,
            lineHeight: 1.08,
            color: BRAND.navy,
            fontWeight: 700,
            letterSpacing: -1.5,
            fontFamily: "Georgia, serif",
            maxWidth: 1000,
          }}
        >
          {title}
        </div>
      </div>
      <BottomRow pillar={pillar} />
    </div>
  );
}

// ─── Square (1080×1080) — for Instagram feed ──────────────────────
// Designed square-first, not resized. Headline occupies the visual
// centre; wordmark + chip flank vertically. Larger corner accents
// balance the square canvas. Font-size ramp is tuned for the
// narrower usable width.
function SquareCard({
  title,
  pillar,
}: {
  title: string;
  pillar: { label: string; accent: string };
}) {
  // Square has less horizontal room but more vertical — bigger
  // baseline font, tighter length breakpoints.
  const fontSize =
    title.length > 80 ? 66 : title.length > 55 ? 82 : 104;
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: BRAND.cream,
        fontFamily: "Georgia, serif",
        padding: "80px",
        position: "relative",
      }}
    >
      {/* Corner accents — larger + repositioned for the square canvas */}
      <div
        style={{
          position: "absolute",
          right: -220,
          bottom: -220,
          width: 620,
          height: 620,
          borderRadius: 620,
          background: BRAND.terracotta,
          opacity: 0.14,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -160,
          top: -160,
          width: 380,
          height: 380,
          borderRadius: 380,
          background: BRAND.sage,
          opacity: 0.18,
          display: "flex",
        }}
      />

      <Wordmark />

      {/* Middle: headline dominates. flex:1 with center alignment
          so short + long titles both look balanced. */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          paddingTop: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize,
            lineHeight: 1.05,
            color: BRAND.navy,
            fontWeight: 700,
            letterSpacing: -1.8,
            fontFamily: "Georgia, serif",
            maxWidth: 920,
          }}
        >
          {title}
        </div>
      </div>

      <BottomRow pillar={pillar} />
    </div>
  );
}

// ─── Shared building blocks ───────────────────────────────────────

function CornerAccents() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          right: -180,
          bottom: -180,
          width: 500,
          height: 500,
          borderRadius: 500,
          background: BRAND.terracotta,
          opacity: 0.14,
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: -120,
          top: -120,
          width: 300,
          height: 300,
          borderRadius: 300,
          background: BRAND.sage,
          opacity: 0.18,
          display: "flex",
        }}
      />
    </>
  );
}

function Wordmark() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 44,
          height: 44,
          borderRadius: 12,
          background: BRAND.coral,
          color: BRAND.cream,
          fontSize: 26,
          fontFamily: "Georgia, serif",
          fontWeight: 700,
        }}
      >
        P
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: BRAND.navy,
            letterSpacing: -0.4,
          }}
        >
          Proper
        </span>
        <span
          style={{
            fontSize: 30,
            fontWeight: 700,
            color: BRAND.terracotta,
            letterSpacing: -0.4,
          }}
        >
          Toasty
        </span>
      </div>
    </div>
  );
}

function BottomRow({
  pillar,
}: {
  pillar: { label: string; accent: string };
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "12px 22px",
          borderRadius: 999,
          background: pillar.accent,
          color: BRAND.cream,
          fontSize: 24,
          fontWeight: 600,
          letterSpacing: -0.2,
          fontFamily: "Georgia, serif",
        }}
      >
        {pillar.label}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 26,
          color: BRAND.muted,
          fontWeight: 600,
          letterSpacing: -0.3,
        }}
      >
        propertoasty.com
      </div>
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTitle = searchParams.get("title") ?? "Your home savings check";
  const title = rawTitle.slice(0, 140);
  const pillar = pillarChip(searchParams.get("pillar") ?? "blog");
  const format = searchParams.get("format") === "square" ? "square" : "landscape";

  if (format === "square") {
    return new ImageResponse(<SquareCard title={title} pillar={pillar} />, {
      width: 1080,
      height: 1080,
    });
  }

  return new ImageResponse(<LandscapeCard title={title} pillar={pillar} />, {
    width: 1200,
    height: 630,
  });
}
