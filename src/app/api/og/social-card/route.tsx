// Branded social card — PNG rendered on demand.
//
// Design goals (post Jim's Aug 2026 review):
//   - Real photo backgrounds, not typography-heavy quote cards.
//     Uses the existing site hero photography per pillar (all
//     licence-cleared) so posts don't look identical to each other
//     while staying on-brand.
//   - EXACT site logo (3-flame leaf mark + "Proper Toasty" wordmark
//     with warm gradient on "Toasty") — lifted from
//     src/components/logo.tsx so brand consistency is guaranteed.
//   - Minimal text: no blog headline. Pillar chip + URL is enough.
//     The caption on the post itself carries the message.
//
// Two formats:
//   - landscape 1200×630 (LinkedIn / X / Facebook)
//   - square    1080×1080 (Instagram)
//
// Constraints (next/og + Satori):
//   - Flexbox only, no CSS grid.
//   - Images referenced by absolute URL (Satori fetches them at
//     render time) — we build a same-origin URL from the request.
//
// Params:
//   ?title=<blog title>       (kept for cache-key uniqueness; no
//                              longer rendered on the card. Ensures
//                              a per-post cached PNG so each blog
//                              gets a distinct edge-cached asset.)
//   ?pillar=<pillar slug>     heat_pump|solar|plug_in_solar|blog
//   ?format=<landscape|square> defaults to landscape
//
// Runtime: edge.

import { ImageResponse } from "next/og";
import { pickPhotoDeterministic } from "@/lib/services/pexels";

export const runtime = "edge";
export const revalidate = 2592000;

const BRAND = {
  cream: "#FAF7F2",
  navy: "#2A2922",
  coral: "#2C5E4A", // brand "coral" is a forest green post-rebrand
  terracotta: "#D9813C",
  sage: "#A8BCA1",
  muted: "#6B7266",
  // Warm gradient stops used for "Toasty" + the flame-leaf mark.
  toastyDark: "#A43B2E",
  toastyMid: "#D9813C",
  toastyLight: "#E8B647",
  toastyPale: "#F8D97A",
} as const;

type Pillar = "heat_pump" | "solar" | "plug_in_solar" | "blog";

interface PillarMeta {
  label: string;
  accent: string;
  /** Pexels search query for this pillar. Curated for UK-relevance
   *  where possible. */
  pexelsQuery: string;
  /** Fallback local hero photo if Pexels API is unavailable or the
   *  key isn't configured. All licence-cleared. */
  fallbackPhoto: string;
}

// Pillar → chip + Pexels query + local fallback. The fetchPhotoUrl
// helper below tries Pexels first (with a deterministic per-title
// pick so same post = same photo), falls back to the local hero
// image on any failure.
function pillarMeta(p: string): PillarMeta {
  switch (p as Pillar) {
    case "heat_pump":
      return {
        label: "Heat pump savings",
        accent: BRAND.coral,
        pexelsQuery: "air source heat pump",
        fallbackPhoto: "/hero-heatpump.jpg",
      };
    case "solar":
      return {
        label: "Solar + battery",
        accent: BRAND.terracotta,
        pexelsQuery: "solar panels house roof",
        fallbackPhoto: "/hero-solar.jpg",
      };
    case "plug_in_solar":
      return {
        label: "Plug-in solar",
        accent: BRAND.sage,
        pexelsQuery: "balcony apartment",
        fallbackPhoto: "/hero-uk-home.jpg",
      };
    default:
      return {
        label: "Propertoasty",
        accent: BRAND.coral,
        pexelsQuery: "british house",
        fallbackPhoto: "/hero-uk-home.jpg",
      };
  }
}

// ─── Building blocks ──────────────────────────────────────────────

// The exact 3-flame leaf mark from src/components/logo.tsx.
// SVG paths + gradient copied verbatim so the card matches the
// site chrome byte-for-byte.
function LogoMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "flex" }}
    >
      <defs>
        <linearGradient
          id="toasty-flame"
          x1="50%"
          y1="100%"
          x2="50%"
          y2="0%"
        >
          <stop offset="0%" stopColor={BRAND.toastyDark} />
          <stop offset="35%" stopColor={BRAND.toastyMid} />
          <stop offset="70%" stopColor={BRAND.toastyLight} />
          <stop offset="100%" stopColor={BRAND.toastyPale} />
        </linearGradient>
      </defs>
      <path
        d="M12 42 C 8 34, 9 25, 14 18 C 17 22, 18 28, 17 35 C 16 39, 14 41, 12 42 Z"
        fill="url(#toasty-flame)"
      />
      <path
        d="M36 42 C 40 33, 38 24, 33 16 C 31 21, 30 28, 31 34 C 32 38, 34 41, 36 42 Z"
        fill="url(#toasty-flame)"
      />
      <path
        d="M24 44 C 18 35, 18 22, 23 8 C 25 11, 28 20, 29 28 C 30 35, 28 40, 24 44 Z"
        fill="url(#toasty-flame)"
      />
    </svg>
  );
}

function LockupBar({
  scale = 1,
}: {
  /** 1 = base LinkedIn size; scale up for square/IG. */
  scale?: number;
}) {
  const iconSize = 56 * scale;
  const wordSize = 40 * scale;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14 * scale,
        padding: `${14 * scale}px ${22 * scale}px`,
        background: "rgba(250, 247, 242, 0.94)",
        borderRadius: 999,
        // Subtle shadow so the lockup sits proud of the photo.
        boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
      }}
    >
      <LogoMark size={iconSize} />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "baseline",
          gap: 6 * scale,
        }}
      >
        <span
          style={{
            fontSize: wordSize,
            fontWeight: 700,
            color: BRAND.navy,
            letterSpacing: -1,
            fontFamily: "Georgia, serif",
          }}
        >
          Proper
        </span>
        {/* Satori doesn't reliably render background-clip:text, so
            "Toasty" gets the terracotta mid-tone from the flame
            gradient as a solid — visually consistent with the
            warm palette without depending on unsupported CSS. */}
        <span
          style={{
            fontSize: wordSize,
            fontWeight: 800,
            color: BRAND.toastyMid,
            letterSpacing: -1,
            fontFamily: "Georgia, serif",
          }}
        >
          Toasty
        </span>
      </div>
    </div>
  );
}

function PillarChip({
  meta,
  scale = 1,
}: {
  meta: PillarMeta;
  scale?: number;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14 * scale,
        padding: `${14 * scale}px ${26 * scale}px`,
        borderRadius: 999,
        background: meta.accent,
        color: BRAND.cream,
        fontSize: 28 * scale,
        fontWeight: 600,
        letterSpacing: -0.3,
        fontFamily: "Georgia, serif",
        boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
      }}
    >
      {meta.label}
    </div>
  );
}

function UrlLabel({ scale = 1 }: { scale?: number }) {
  return (
    <div
      style={{
        display: "flex",
        fontSize: 26 * scale,
        color: BRAND.cream,
        fontWeight: 600,
        letterSpacing: -0.3,
        textShadow: "0 2px 8px rgba(0,0,0,0.5)",
        fontFamily: "Georgia, serif",
      }}
    >
      propertoasty.com
    </div>
  );
}

// ─── Card composition ─────────────────────────────────────────────
//
// Same composition in landscape and square: full-bleed photo +
// dark gradient overlay + top-left logo lockup + bottom-left
// pillar chip + bottom-right URL. No blog title.
function Card({
  meta,
  photoUrl,
  scale = 1,
}: {
  meta: PillarMeta;
  photoUrl: string;
  scale?: number;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        background: BRAND.navy,
      }}
    >
      {/* Photo — full-bleed. next/og supports <img> with absolute URLs
          (Satori fetches at render time). next/image doesn't work
          inside Satori — the ESLint warning is a false positive here.
          Object-fit:cover fills the canvas regardless of aspect. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt=""
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      {/* Dark gradient overlay — top fades in for logo legibility,
          bottom is heavier for chip + URL. */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.75) 100%)",
          display: "flex",
        }}
      />

      {/* Content layer */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: `${56 * scale}px ${64 * scale}px`,
        }}
      >
        {/* Top row: lockup — flex-start so it sits at the top-left */}
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <LockupBar scale={scale} />
        </div>

        {/* Bottom row: pillar chip left, URL right */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
          }}
        >
          <PillarChip meta={meta} scale={scale} />
          <UrlLabel scale={scale} />
        </div>
      </div>
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const url = new URL(req.url);
  const { searchParams } = url;
  const pillar = pillarMeta(searchParams.get("pillar") ?? "blog");
  const format =
    searchParams.get("format") === "square" ? "square" : "landscape";

  // Seed the Pexels picker with the blog title so each post gets a
  // stable photo (a re-render for the same blog picks the same
  // photo — no visual jitter) but different posts land on different
  // photos in the same result set.
  const seed = searchParams.get("title") ?? "propertoasty";

  const pexelsPhoto = await pickPhotoDeterministic({
    query: pillar.pexelsQuery,
    orientation: format === "square" ? "square" : "landscape",
    seed,
  });

  // Absolute URL either way — Satori needs a fetchable URL.
  const photoUrl =
    pexelsPhoto?.url ??
    new URL(pillar.fallbackPhoto, url.origin).toString();

  if (format === "square") {
    return new ImageResponse(
      <Card meta={pillar} photoUrl={photoUrl} scale={1.3} />,
      { width: 1080, height: 1080 },
    );
  }

  return new ImageResponse(
    <Card meta={pillar} photoUrl={photoUrl} scale={1} />,
    { width: 1200, height: 630 },
  );
}
