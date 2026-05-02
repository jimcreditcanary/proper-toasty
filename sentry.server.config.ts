// Sentry server-side config. Loaded by @sentry/nextjs from the
// Node.js bundle (api routes, server components). No-op when
// SENTRY_DSN isn't set.
//
// Server-side runs unsampled — server errors are rare + valuable
// signal, easily under the free tier even at 100%.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    sampleRate: 1.0,
    // 5% transactions on server side — most server work is short
    // request handlers, no need for a high sample.
    tracesSampleRate: 0.05,
    // Strip PII; we don't want homeowner emails / addresses landing
    // in Sentry (privacy + compliance + breach surface area).
    sendDefaultPii: false,
  });
}
