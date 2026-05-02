// Sentry browser-side config. Loaded by @sentry/nextjs in client
// bundles. No-op when NEXT_PUBLIC_SENTRY_DSN isn't set so dev /
// preview / test environments don't emit anything.
//
// Free tier limits (5K errors/mo, 10K performance events/mo) easily
// covered by sampleRate 0.1 on the perf side. Errors all reported.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? "development",
    // 100% of errors. Free tier headroom is plenty.
    sampleRate: 1.0,
    // 10% of transactions for perf monitoring — keeps us well under
    // the free monthly quota even with traffic spikes.
    tracesSampleRate: 0.1,
    // Strip PII from errors before they leave the browser.
    sendDefaultPii: false,
    // Filter noise: known browser-extension errors, third-party scripts.
    ignoreErrors: [
      // Browser extensions / safari quirks
      /ResizeObserver loop/,
      "Non-Error promise rejection captured",
      // Stripe.js loader sometimes throws a benign abort during
      // hot-reload in dev; production unaffected.
      "Network request failed",
    ],
  });
}
