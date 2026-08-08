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

  // "No slots" side-channel funnel — homeowner opened the booking
  // modal for an installer with zero bookable slots in the next 28
  // days. Three events stitch together send → click → contact:
  //   1. _email_sent      — the API route emailed the installer
  //   2. _email_clicked   — the installer hit the claim CTA
  //   3. _lead_contacted  — the installer pressed "Reach out to
  //                         homeowner" on the lead detail page
  installer_no_slots_email_sent: {
    installer_id: number;
    /** True when the installer has user_id set (vs an unclaimed
     *  directory row). Splits the funnel by template variant. */
    is_registered: boolean;
  };
  installer_no_slots_email_clicked: {
    installer_id: number;
    is_registered: boolean;
  };
  installer_no_slots_lead_contacted: {
    installer_id: number;
    contact_method: "email" | "phone";
  };

  // Homeowner lifecycle
  homeowner_check_completed: {
    /** Pre-survey-attributed completions vs organic */
    via_pre_survey: boolean;
  };
  //
  // NOTE: `check_step_viewed` used to live here as a PostHog event
  // fired via a beacon endpoint. Migrated to Vercel Analytics
  // custom events in wizard-shell.tsx — simpler, no beacon route,
  // no anon-id in localStorage, and the dashboard is already in
  // Jim's Vercel project. Server-side events below stay in PostHog.
  //
  // ─── Vercel Analytics events (client-side) ───────────────────
  // Eight distinct top-level events cover Jim's Aug 2026 conversion
  // taxonomy — one row per conversion moment in the Vercel dash so
  // he doesn't have to drill into event properties to see the
  // funnel. Vercel's `track()` API is untyped by design; this block
  // is the canonical taxonomy.
  //
  //   journey_cta — [Jim: JourneyCTA]
  //     Any "Calculate my savings" button click across marketing
  //     pages + the hero mini-wizard's primary submit.
  //     Props: { journey, source }
  //     source values include: "homepage_hero", "hero_wizard",
  //       "homepage_picker_primary", "homepage_footer_cta",
  //       "heatpump_landing_hero", "solar_landing_hero",
  //       "boiler_landing_hero", "plug_in_solar_landing_hero", etc.
  //     Where: src/components/analytics/journey-cta.tsx
  //            src/components/hero-mini-wizard.tsx
  //
  //   journey_start — [Jim: JourneyStart]
  //     User has landed on /check/* AND a postcode is committed —
  //     either typed on step 1 or arrived via the hero prefill.
  //     Props: { journey, source }
  //     source values: "postcode" | "hero_wizard"
  //     Where: src/components/check-wizard/step-1-address.tsx
  //            src/components/check-wizard/context.tsx
  //
  //   address_confirm — [Jim: AddressConfirm]
  //     "Yes that is my home" clicked on the aerial preview step.
  //     Props: { journey_type, from_presurvey_link,
  //              from_installer_prebind }
  //     Where: src/components/check-wizard/wizard-shell.tsx
  //
  //   details_confirm — [Jim: DetailsConfirm]
  //     Questions answered + Continue clicked.
  //     Props: same as address_confirm
  //     Where: src/components/check-wizard/wizard-shell.tsx
  //
  //   email_confirm — [Jim: EmailConfirm]
  //     Email entered + "Show me my report" clicked.
  //     Props: same as address_confirm
  //     Where: src/components/check-wizard/wizard-shell.tsx
  //
  //   journey_complete — [Jim: JourneyComplete]
  //     User reached the final report OR (plug-in solar) the
  //     calculator mounted.
  //     Props: { journey, via_pre_survey }
  //     Where: src/components/check-wizard/report/report-shell.tsx
  //            src/components/plug-in-solar/calculator.tsx
  //
  //   book_site_visit — [Jim: BookSiteVisit]
  //     Book tab opened on the report.
  //     Props: { journey_type }
  //     Where: src/components/check-wizard/report/report-shell.tsx
  //
  //   book_meeting — [Jim: BookaMeeting]
  //     Any "Book a meeting" button clicked in the book-visit tab.
  //     Props: { installer_id }
  //     Where: src/components/check-wizard/report/tabs/
  //              book-visit-tab.tsx
  //
  // Funnel: journey_cta → journey_start → address_confirm →
  //   details_confirm → email_confirm → journey_complete →
  //   book_site_visit → book_meeting. Vercel dashboard →
  //   Analytics → Custom events.
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
