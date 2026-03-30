import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.whoamipaying.co.uk"),
  title: {
    default: "whoamipaying.co.uk — Know exactly who you're paying",
    template: "%s | whoamipaying.co.uk",
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
    siteName: "whoamipaying.co.uk",
    title: "whoamipaying.co.uk — Know exactly who you're paying",
    description:
      "Over £629m was stolen by fraudsters in H1 2025. Verify who you're paying against 6 official UK data sources before you send money.",
  },
  twitter: {
    card: "summary_large_image",
    title: "whoamipaying.co.uk — Know exactly who you're paying",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
