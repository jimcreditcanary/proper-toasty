import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
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
        {children}
        <Analytics />
      </body>
    </html>
  );
}
