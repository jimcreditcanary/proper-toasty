// Server-side product analytics, backed by PostHog.
//
// Goals:
//   - Single typed entrypoint: `track(event, props)` so event
//     names + property shapes can't drift between callers.
//   - Fail-soft: if POSTHOG_API_KEY isn't set, captures are no-ops.
//     Never throw in a hot request path.
//   - Fire-and-forget from API routes: PostHog SDK queues events
//     in-memory + flushes on its own schedule, but we explicitly
//     don't await — even a queued capture takes <1ms.
//   - Privacy: distinct_id is the user's id (auth.users.id) when
//     authenticated, otherwise an opaque hash of the email so
//     we don't ship raw PII into PostHog. Never send homeowner
//     emails / addresses as event properties.
//
// Event taxonomy is the typed `EventMap` below — adding a new
// event = adding a new key. Misspellings caught at compile time.
//
// Required env vars:
//   POSTHOG_API_KEY   project API key (starts with `phc_`)
//   POSTHOG_HOST      defaults to https://eu.i.posthog.com (EU
//                     residency by default for UK customers)

import { PostHog } from "posthog-node";
import { createHash } from "node:crypto";

// ─── Event taxonomy ────────────────────────────────────────────────
//
// Add new events here. Property shape goes alongside so callers get
// type-checked on every property they pass.

export interface EventMap {
  // Installer lifecycle
  installer_claim_completed: {
    installer_id: number;
    company_name: string;
  };
  installer_credits_purchased: {
    pack_credits: number;
    price_pence: number;
    method: "checkout" | "auto_topup";
  };
  installer_lead_accepted: {
    installer_id: number;
    /** "directory" or "pre_survey" */
    source: "directory" | "pre_survey";
    /** 5 today; will become installer-configurable later */
    cost_credits: number;
  };
  installer_quote_sent: {
    installer_id: number;
    total_pence: number;
    item_count: number;
    has_bus_grant: boolean;
    vat_rate_bps: number;
  };
  installer_pre_survey_sent: {
    installer_id: number;
    /** True for resends so the funnel can split first-send vs nudges. */
    is_resend: boolean;
    /** "ui" = dashboard form, "api" = /api/v1 */
    source: "ui" | "api";
  };

  // Homeowner lifecycle
  homeowner_check_completed: {
    /** Pre-survey-attributed completions vs organic */
    via_pre_survey: boolean;
  };
  homeowner_quote_accepted: {
    installer_id: number;
    total_pence: number;
  };
  homeowner_quote_declined: {
    installer_id: number;
    /** Reason categorisation comes later — we don't ship the free
     *  text to PostHog (privacy + signal-to-noise). */
    has_reason: boolean;
  };
  homeowner_quote_message_sent: {
    installer_id: number;
    channel: "message" | "callback";
  };
}

export type EventName = keyof EventMap;

// ─── Client lifecycle ──────────────────────────────────────────────

let cached: PostHog | null = null;

function getClient(): PostHog | null {
  if (cached) return cached;
  const key = process.env.POSTHOG_API_KEY;
  if (!key) return null;
  cached = new PostHog(key, {
    host: process.env.POSTHOG_HOST ?? "https://eu.i.posthog.com",
    // Serverless-friendly settings. The previous config batched 10
    // events / 10s, which on Vercel meant the function frequently
    // ended before the queued flush completed → the in-flight fetch
    // got aborted and the SDK logged a (benign but noisy)
    // PostHogFetchNetworkError.
    //
    //   flushAt: 1         → every capture triggers an immediate
    //                        fetch; no batching means no dangling
    //                        queue at function exit.
    //   flushInterval: 0   → disable the background interval timer
    //                        entirely (the timer's fetch was the
    //                        most common abort source).
    //   fetchRetryCount: 1 → one retry is plenty; we don't want a
    //                        slow-failing endpoint to keep the
    //                        function alive past its useful work.
    //   requestTimeout:
    //     3000 ms          → fail fast. Worst case we drop a single
    //                        event; better than a 10s hang.
    flushAt: 1,
    flushInterval: 0,
    fetchRetryCount: 1,
    requestTimeout: 3000,
  });
  return cached;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Fire a typed analytics event. No-op when POSTHOG_API_KEY isn't
 * set. Pass either an authenticated user-id, an email (we hash),
 * or omit both for anonymous events.
 */
export function track<E extends EventName>(
  event: E,
  args: {
    props: EventMap[E];
    /** auth.users.id if signed in. */
    userId?: string | null;
    /** Falls back to a SHA-256 prefix of the email when userId
     *  isn't available — keeps anonymous events tied to a stable
     *  identity without leaking the actual address. */
    email?: string | null;
    /** Optional shared properties merged into PostHog's
     *  `$set` so you can update user-level attributes during a
     *  capture (e.g. installer_id). */
    setOnce?: Record<string, unknown>;
  },
): void {
  const client = getClient();
  if (!client) return;

  const distinctId = resolveDistinctId(args.userId, args.email);
  if (!distinctId) return; // Truly anonymous + no email: skip.

  try {
    client.capture({
      distinctId,
      event,
      properties: {
        ...args.props,
        // Useful default property — lets us segment by deploy.
        environment: process.env.VERCEL_ENV ?? "development",
      },
      ...(args.setOnce
        ? { properties: { ...args.props, $set_once: args.setOnce } }
        : {}),
    });
  } catch (err) {
    // Never let analytics break a user-facing request. Log + carry on.
    console.warn("[analytics] capture failed", {
      event,
      err: err instanceof Error ? err.message : err,
    });
  }
}

/**
 * Identify a user with persistent properties (one-time + always-set).
 * Use sparingly — call on signup / claim, not on every request.
 */
export function identify(args: {
  userId: string;
  email?: string | null;
  properties?: Record<string, unknown>;
}): void {
  const client = getClient();
  if (!client) return;
  try {
    client.identify({
      distinctId: args.userId,
      properties: {
        ...(args.email ? { email_hash: hashEmail(args.email) } : {}),
        ...(args.properties ?? {}),
      },
    });
  } catch (err) {
    console.warn("[analytics] identify failed", err);
  }
}

/**
 * Force-flush queued events. Used at the end of long-running cron
 * jobs / scripts where the process exits before the natural flush.
 * Don't call from request handlers — adds latency.
 */
export async function flush(): Promise<void> {
  if (!cached) return;
  try {
    await cached.shutdown();
    cached = null;
  } catch (err) {
    console.warn("[analytics] flush failed", err);
  }
}

// ─── Identity helpers ──────────────────────────────────────────────

function resolveDistinctId(
  userId: string | null | undefined,
  email: string | null | undefined,
): string | null {
  if (userId) return userId;
  if (email) return `email_hash:${hashEmail(email)}`;
  return null;
}

function hashEmail(email: string): string {
  // 12 hex chars is enough for a stable identifier without being
  // reversible to the underlying email. Lowercased to dedupe on
  // sign-in vs sign-up case.
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 12);
}
