// Sentry config for the Edge runtime (middleware + edge routes).
// We don't currently use the Edge runtime — `runtime = "nodejs"` is
// pinned on every API route — but @sentry/nextjs requires this
// file to exist when the integration is active.

import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? "development",
    sampleRate: 1.0,
    tracesSampleRate: 0.05,
  });
}
