import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/(.*)\\.(js|css|woff2?|ttf|otf|ico|svg|png|jpg|jpeg|gif|webp)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// Sentry wraps the build to upload source maps + auto-instrument
// API routes. Skipped silently when SENTRY_AUTH_TOKEN isn't set
// (i.e. local dev / CI without secrets) — withSentryConfig
// degrades to a no-op in that case.
export default withSentryConfig(nextConfig, {
  // Org + project come from env vars so different deploy
  // environments can point at different Sentry projects.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppresses log output when SENTRY_AUTH_TOKEN missing — keeps
  // local builds quiet.
  silent: !process.env.SENTRY_AUTH_TOKEN,
  // Upload source maps only in CI / production builds.
  widenClientFileUpload: true,
  // Tunnel Sentry SDK requests through our own /monitoring path
  // to avoid ad-blockers killing error reports in the browser.
  tunnelRoute: "/monitoring",
  // Webpack-build-time options. Top-level `disableLogger` is
  // deprecated in @sentry/nextjs v10 — moved into the webpack
  // treeshake bag.
  webpack: {
    treeshake: {
      // Tree-shake Sentry SDK debug-logger statements out of the
      // bundle — noisy + we don't need them.
      removeDebugLogging: true,
    },
  },
  // Source map handling — `disable: true` skips public-URL upload
  // (we still upload to Sentry via the auth token + use them
  // server-side for stack-trace symbolication).
  sourcemaps: {
    disable: false,
  },
});
