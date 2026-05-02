// One-shot diagnostic for Sentry + PostHog wiring. Imports the
// helpers exactly as the app does, fires a test capture + event,
// and reports what happened. Run with:
//
//   npx tsx scripts/test-observability.ts
//
// Honors the same env vars the running app does — pulls from
// .env.local automatically (via dotenv loader). Exits non-zero on
// SDK errors so it can be wired into a deploy gate later.

import { config } from "dotenv";
import { resolve } from "node:path";

// Load .env.local before importing anything that reads env vars at
// module-load time (Sentry + PostHog SDKs both do).
config({ path: resolve(process.cwd(), ".env.local") });

import * as Sentry from "@sentry/nextjs";
import { track, identify, flush } from "../src/lib/analytics";

interface Result {
  name: string;
  ok: boolean;
  detail: string;
}

async function main(): Promise<void> {
  const results: Result[] = [];

  // ─── Sentry ────────────────────────────────────────────────────

  const sentryDsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!sentryDsn) {
    results.push({
      name: "Sentry",
      ok: true,
      detail:
        "No SENTRY_DSN set — captures will silently no-op in production. " +
        "If you want production error reporting, set SENTRY_DSN in Vercel.",
    });
  } else {
    try {
      Sentry.init({
        dsn: sentryDsn,
        environment: "diagnostic-script",
        sampleRate: 1.0,
        tracesSampleRate: 0,
      });
      const eventId = Sentry.captureMessage(
        "Propertoasty observability diagnostic — Sentry wiring OK",
        "info",
      );
      // Flush so we know the request actually went out before exit.
      const flushed = await Sentry.flush(5000);
      results.push({
        name: "Sentry",
        ok: !!eventId && flushed,
        detail: flushed
          ? `Event sent — ID ${eventId}. Look in your Sentry dashboard ` +
            `(may take ~30s to appear).`
          : `captureMessage returned an ID but flush timed out — check ` +
            `your DSN is reachable + correct.`,
      });
    } catch (err) {
      results.push({
        name: "Sentry",
        ok: false,
        detail: `Threw: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  // ─── PostHog ──────────────────────────────────────────────────

  const posthogKey = process.env.POSTHOG_API_KEY;
  if (!posthogKey) {
    results.push({
      name: "PostHog",
      ok: true,
      detail:
        "No POSTHOG_API_KEY set — analytics events will silently no-op. " +
        "Set POSTHOG_API_KEY in Vercel to enable.",
    });
  } else {
    try {
      // identify() + track() use the same lazy-init client as the app.
      identify({
        userId: "diagnostic-test-user",
        email: "diagnostic@propertoasty.com",
        properties: { test_run: new Date().toISOString() },
      });
      track("installer_claim_completed", {
        userId: "diagnostic-test-user",
        props: {
          installer_id: -1,
          company_name: "Diagnostic Test",
        },
      });
      // flush() shuts down the client + waits for the queue to drain.
      // If this hangs/throws the network path is broken.
      await flush();
      results.push({
        name: "PostHog",
        ok: true,
        detail:
          `Event sent for distinct_id 'diagnostic-test-user'. ` +
          `Look in PostHog → Activity (may take a few seconds). The user ` +
          `+ company will show under that distinct_id.`,
      });
    } catch (err) {
      results.push({
        name: "PostHog",
        ok: false,
        detail: `Threw: ${err instanceof Error ? err.message : err}`,
      });
    }
  }

  // ─── Report ────────────────────────────────────────────────────

  console.log();
  console.log("─── Observability diagnostic ─────────────────────────");
  for (const r of results) {
    const icon = r.ok ? "✓" : "✗";
    console.log(`${icon} ${r.name}: ${r.detail}`);
  }
  console.log("──────────────────────────────────────────────────────");
  console.log();

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error(`${failed.length} check(s) failed.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Diagnostic threw:", err);
  process.exit(1);
});
