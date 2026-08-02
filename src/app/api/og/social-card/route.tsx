// Branded social card — 1200×630 PNG rendered on demand.
//
// The daily social agent (/api/cron/social-agent) generates a
// card URL per post and passes it to Buffer as an image asset,
// so every LinkedIn / X / Facebook / Instagram post gets a unique
// on-brand visual instead of the same OG image scraped from
// propertoasty.com every day.
//
// Design:
//   - Cream background with a subtle terracotta corner accent
//   - Wordmark top-left (typographic, no image dependency)
//   - Big Fraunces headline centred
//   - Pillar chip + URL bottom
//
// Constraints (next/og + Satori):
//   - Layout is flexbox-only; no CSS grid, no floats
//   - Fonts loaded as inline data URLs OR fetched via a URL
//   - Colours must be full literals (no CSS vars)
//   - No images from URLs unless embedded — the wordmark is text
//
// Params:
//   ?title=<blog title>       (required, ≤ 140 chars)
//   ?pillar=<pillar slug>     one of heat_pump|solar|plug_in_solar|blog
//
// Runtime: edge (fast, cheap, cached at the edge).

import { ImageResponse } from "next/og";

export const runtime = "edge";
// Cache these aggressively — same title+pillar = same image byte-for-byte.
// s-maxage 30 days at the Vercel edge; the URL is deterministic so
// Buffer will fetch it once and re-use.
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

// Pillar → chip label + accent colour. Never trust the query
// string blindly; default to the neutral blog case.
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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rawTitle = searchParams.get("title") ?? "Your home savings check";
  // Guard rails on inputs — keep them cheap to fail loudly.
  const title = rawTitle.slice(0, 140);
  const pillar = pillarChip(searchParams.get("pillar") ?? "blog");

  return new ImageResponse(
    (
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
        {/* Corner accent — soft terracotta arc bottom-right */}
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

        {/* Top row: wordmark */}
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

        {/* Middle: headline — flex-grows so it centres visually
             regardless of title length */}
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
              fontSize: title.length > 80 ? 58 : title.length > 55 ? 72 : 86,
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

        {/* Bottom row: pillar chip + URL */}
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
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
