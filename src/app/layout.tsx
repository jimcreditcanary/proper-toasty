import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { OrganizationSchema, WebSiteSchema } from "@/components/seo/schema";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["SOFT", "WONK"],
});

// Sitewide default OG / Twitter image. 1200×630 is Facebook/Twitter's
// preferred aspect. hero-uk-home.jpg is the brand-neutral house shot
// we use as the homepage lead; pages with their own hero can override
// by setting `openGraph.images` in their metadata block.
const OG_IMAGE = {
  url: "/hero-uk-home.jpg",
  width: 1200,
  height: 630,
  alt: "Propertoasty — UK home pre-survey report",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://www.propertoasty.com"),
  title: {
    // Brand standardised to "Propertoasty" (single word, no space).
    // Was "Proper Toasty" — the split form fragmented the entity
    // across brand mentions ("Proper Toasty", "Propertoasty",
    // "propertoasty.com"), which weakens the Knowledge Graph node
    // AI search engines resolve to.
    default: "Propertoasty — Greener living starts at home",
    // Passthrough template: child pages' explicit string titles are
    // used verbatim. Was "%s | Propertoasty" — the 15-char suffix
    // pushed 3,368 programmatic titles over Google's ~60-char SERP
    // truncation (Ahrefs, 23 Jul 2026). Pages that want a brand
    // suffix now bake it into their own title. Sitewide brand is
    // still emitted via Organization + WebSite JSON-LD.
    template: "%s",
  },
  description:
    "Check your UK home for a heat pump, rooftop solar or a home battery. Free 5-min pre-survey, installer-ready, BUS-grant aware.",
  // No `keywords` array — meta keywords has been unused by every
  // major search engine since 2009. Removed to reduce noise.
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.propertoasty.com",
    siteName: "Propertoasty",
    title: "Propertoasty — Greener living starts at home",
    description:
      "Pre-survey checks for UK heat pump, solar, battery, and EV-charger upgrades. Report-ready for your MCS installer.",
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: "Propertoasty — Greener living starts at home",
    description:
      "Heat pump, solar, battery, and EV-ready checks for your UK home. Grant-eligible, installer-ready.",
    images: [OG_IMAGE.url],
  },
  // NO layout-level `alternates.canonical`. Next.js metadata merges child
  // into parent — a default canonical here silently leaks to every page
  // that doesn't override, causing Google to canonicalise entire routes
  // onto the homepage. Each page sets its OWN self-referencing canonical
  // in its `export const metadata`. Missing = no <link rel="canonical">
  // (fine — the URL infers itself); the failure mode of wrong is worse.
  // Icons — explicit + deterministic. Lesson learnt the hard way:
  //   - DO NOT put `favicon.ico` or `icon.*` files inside `src/app/`.
  //     The App Router file convention turns them into dynamic Route
  //     Handlers (with hash query strings, RSC processing, build
  //     caching). When a `src/app/favicon.ico` exists alongside
  //     `public/favicon.ico`, both want to own the `/favicon.ico`
  //     URL — and the dynamic one wins, so cache hiccups produce
  //     intermittent 404s. Bitten us repeatedly (commits 656b649,
  //     deff1a0, 813ed3e, 93bcd08).
  //   - Single source of truth: `public/favicon.ico` + `public/icon.svg`.
  //     Both served as static CDN assets with the `immutable` 1yr
  //     cache headers from next.config.ts. Zero dynamic pipeline,
  //     zero collisions, can't break.
  //   - The metadata block below explicitly wires the <link> tags
  //     so we don't depend on file-convention auto-injection.
  icons: {
    // Cache-bust suffix on every icon URL. Some users had a stale
    // 404 cached under the 1-year immutable header from
    // next.config.ts (the bug ran from before deff1a0). Server now
    // returns 200 across every nested path, but a browser that
    // cached the original miss keeps showing 404 until 2027.
    // Bumping ?v= mints a fresh URL so the stale entry is no
    // longer referenced. Bump again if we ever reintroduce a 404.
    icon: [
      { url: "/favicon.ico?v=2", type: "image/x-icon", sizes: "any" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
    shortcut: ["/favicon.ico?v=2"],
    // iOS Safari + several other browsers speculatively request
    // /apple-touch-icon.png for home-screen bookmarking even when
    // it isn't referenced in the head. Without this file the
    // request 404s noisily in network logs. Generated from
    // public/icon.svg via scripts/render-apple-touch-icon.js.
    apple: [
      { url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" },
    ],
  },
};

// Next 14+ requires viewport / themeColor to be exported separately from
// metadata. Lighthouse's meta-viewport audit needs the device-width
// initial-scale=1 declaration; theme-color helps the OS render the
// browser chrome with our brand cream.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FAF7F2",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en-GB"
      dir="ltr"
      className={`${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} h-full`}
    >
      {/* No explicit <head>: we previously rendered a preconnect to
          va.vercel-scripts.com here, but PSI flagged it as "Unused
          preconnect" (LCP penalty) — Vercel Analytics defers its
          tracker until after first paint, so the early connection
          buys nothing and costs LCP. Removed. Next.js injects all
          metadata + font links into <head> automatically. */}
      <body className="min-h-full flex flex-col">
        {/* Sitewide JSON-LD — Organization + WebSite. Renders into
            every page's HTML (server-component, no client cost).
            Google reads JSON-LD wherever it sits in the document,
            so emitting in <body> is fine + keeps <head> uncluttered. */}
        <OrganizationSchema />
        <WebSiteSchema />
        {children}
        <Analytics />
      </body>
    </html>
  );
}
