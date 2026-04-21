import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.propertoasty.com"),
  title: {
    default: "Propertoasty — Is your home ready for a heat pump or solar?",
    template: "%s | Propertoasty",
  },
  description:
    "Check your UK home's eligibility for the Boiler Upgrade Scheme and solar PV in minutes. Get a pre-survey report an MCS installer can quote from — no site visit needed.",
  keywords: [
    "heat pump eligibility",
    "Boiler Upgrade Scheme",
    "BUS grant",
    "solar PV suitability",
    "MCS installer",
    "UK home energy",
    "air source heat pump",
    "EPC check",
    "rooftop solar",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.propertoasty.com",
    siteName: "Propertoasty",
    title: "Propertoasty — Is your home ready for a heat pump or solar?",
    description:
      "Pre-survey eligibility and suitability checks for UK heat pump and solar PV upgrades. Report-ready for your MCS installer.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Propertoasty — Is your home ready for a heat pump or solar?",
    description:
      "Check heat pump grant eligibility and solar suitability for your UK home in minutes.",
  },
  alternates: {
    canonical: "https://www.propertoasty.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} h-full`}
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
