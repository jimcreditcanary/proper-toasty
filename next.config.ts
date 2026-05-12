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
    // Next 16 tightened the default: without an explicit `qualities`
    // list, the optimiser only accepts q=75 and 400s everything else
    // with INVALID_IMAGE_OPTIMIZE_REQUEST. Blog covers + report
    // imagery use 80; some larger imagery uses 90 for crisper
    // rendering on retina screens. List every value any Image
    // component requests across the codebase — silent 400s otherwise.
    qualities: [60, 70, 75, 80, 85, 90, 100],
  },
  // Nested favicon paths bug: browsers + crawlers occasionally
  // request /favicon.ico (and friends) under whatever URL they're
  // currently on (e.g. /installer/favicon.ico, /r/<token>/favicon.ico).
  // Without these rewrites they 404 — and because the headers rule
  // below applied `immutable, max-age=1yr` to anything matching an
  // asset extension at any depth, the 404 was getting cached for a
  // YEAR. Users who hit it once saw a permanently broken favicon
  // until the browser cache expired.
  //
  // beforeFiles runs before filesystem routing, so these rewrites
  // resolve BEFORE Next tries to serve the actual file path.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/:path*/favicon.ico", destination: "/favicon.ico" },
        { source: "/:path*/icon.svg", destination: "/icon.svg" },
        {
          source: "/:path*/apple-touch-icon.png",
          destination: "/apple-touch-icon.png",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      // Long-cache static assets — root-level files only. The
      // earlier `/(.*)\\.ico` pattern matched at every depth, so a
      // 404 at /installer/favicon.ico was getting the 1-year
      // immutable cache. The `[^/]+` segment caps the match at
      // root-level paths; the rewrites above handle anything at
      // a nested depth by mapping it back to the root file.
      {
        source:
          "/:file([^/]+)\\.(js|css|woff2?|ttf|otf|ico|svg|png|jpg|jpeg|gif|webp)",
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
//
// Source-map UPLOAD is gated to production deploys only. On a
// Pro-tier Vercel build the server-side upload + processing of
// ~1200 source-map files dominates wall time (~60s of a ~120s
// build). Preview deploys (every PR branch push) don't benefit
// from symbolicated stack traces — they exist for visual
// verification — so skipping the upload there roughly halves
// the preview build duration without affecting production
// error-monitoring quality.
//
// The Sentry SDK runtime instrumentation still runs on previews;
// errors still report to Sentry. The only thing skipped is the
// build-time UPLOAD of source maps to Sentry's storage.
const isProdDeploy = process.env.VERCEL_ENV === "production";

export default withSentryConfig(nextConfig, {
  // Org + project come from env vars so different deploy
  // environments can point at different Sentry projects.
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Suppresses log output when SENTRY_AUTH_TOKEN missing — keeps
  // local builds quiet. Also silent on previews now that we don't
  // upload anything from them.
  silent: !process.env.SENTRY_AUTH_TOKEN || !isProdDeploy,
  // Widen the upload to include every served file (helps with
  // server-side rendered chunks). Only matters when we're actually
  // uploading, so gate on isProdDeploy.
  widenClientFileUpload: isProdDeploy,
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
  // Source map handling — `disable: true` skips the upload
  // entirely. On previews this saves the ~60s upload+processing
  // round-trip. On production we still upload so runtime errors
  // get symbolicated stack traces in Sentry.
  sourcemaps: {
    disable: !isProdDeploy,
  },
});
