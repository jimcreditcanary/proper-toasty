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

export const metadata: Metadata = {
  metadataBase: new URL("https://www.propertoasty.com"),
  title: {
    default: "Proper Toasty — Greener living starts at home",
    template: "%s | Proper Toasty",
  },
  description:
    "Check your UK home for a heat pump, rooftop solar, or a home battery — with room for EV charging when you're ready. Pre-survey report, installer-ready, grant-eligible.",
  keywords: [
    "heat pump eligibility",
    "Boiler Upgrade Scheme",
    "BUS grant",
    "solar PV suitability",
    "home battery",
    "battery storage UK",
    "EV charger home",
    "MCS installer",
    "UK home energy",
    "air source heat pump",
    "EPC check",
    "rooftop solar",
    "greener living",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.propertoasty.com",
    siteName: "Proper Toasty",
    title: "Proper Toasty — Greener living starts at home",
    description:
      "Pre-survey checks for UK heat pump, solar, battery, and EV-charger upgrades. Report-ready for your MCS installer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proper Toasty — Greener living starts at home",
    description:
      "Heat pump, solar, battery, and EV-ready checks for your UK home. Grant-eligible, installer-ready.",
  },
  alternates: {
    canonical: "https://www.propertoasty.com",
  },
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
      <head>
        <link rel="dns-prefetch" href="https://va.vercel-scripts.com" />
        <link rel="preconnect" href="https://va.vercel-scripts.com" crossOrigin="anonymous" />
      </head>
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
