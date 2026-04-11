import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.whoamipaying.co.uk"),
  title: {
    default: "whoamipaying? — Know exactly who you're paying",
    template: "%s | whoamipaying?",
  },
  description:
    "Verify invoices before you pay. Check company details against Companies House, HMRC VAT, bank records, and online reviews — in seconds.",
  keywords: [
    "invoice verification",
    "payment fraud",
    "APP fraud",
    "Companies House check",
    "VAT validation",
    "confirmation of payee",
    "UK payment safety",
    "Facebook Marketplace scam check",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: "https://www.whoamipaying.co.uk",
    siteName: "whoamipaying?",
    title: "whoamipaying? — Know exactly who you're paying",
    description:
      "Over £1.2bn was stolen by fraudsters in 2025. Verify who you're paying against 6 official UK data sources before you send money.",
  },
  twitter: {
    card: "summary_large_image",
    title: "whoamipaying? — Know exactly who you're paying",
    description:
      "Verify invoices and payments against Companies House, HMRC, bank records, and more.",
  },
  alternates: {
    canonical: "https://www.whoamipaying.co.uk",
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
