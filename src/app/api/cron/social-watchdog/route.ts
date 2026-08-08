import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/cron/social-watchdog
//
// Fires 1 hour after the daily social-agent cron (vercel.json).
// Sanity-checks that the run actually produced rows in
// social_posts. Catches two silent failure modes the in-run
// alert can't:
//
//   1. Vercel cron didn't fire the daily social-agent at all
//      (missed executions — this was the Aug 4 + Aug 5 pattern
//      that surfaced only when Jim noticed "no new posts").
//   2. social-agent fired but crashed BEFORE it could write any
//      row (e.g. Sonnet 5 outage, Anthropic quota exhausted,
//      Supabase connectivity issue).
//
// Query window is 25 hours (1h buffer past the 24h cadence) so
// a slow run + this watchdog running the same minute don't race.
// If ANY row landed in the window we're healthy — even
// rejected/errored rows prove the code ran end-to-end.
//
// Sentry level is "error" here (vs "warning" on the in-run
// alert) because a total no-op is a bigger deal than partial
// rejections.

export const runtime = "nodejs";
export const maxDuration = 30;
export const dynamic = "force-dynamic";

const WINDOW_HOURS = 25;

async function run(): Promise<{
  status: "ok" | "no_rows" | "all_failed";
  rows: number;
  posted: number;
  window_hours: number;
}> {
  const admin = createAdminClient();
  const cutoff = new Date(
    Date.now() - WINDOW_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("social_posts")
    .select("platform, buffer_update_id, factual_check_passed, error")
    .gte("posted_at", cutoff);
  if (error) {
    throw new Error(`social_posts query failed: ${error.message}`);
  }
  const rows = (data ?? []) as Array<{
    platform: string;
    buffer_update_id: string | null;
    factual_check_passed: boolean;
    error: string | null;
  }>;
  const posted = rows.filter((r) => !!r.buffer_update_id).length;

  if (rows.length === 0) {
    Sentry.captureMessage(
      `Social watchdog: NO social_posts rows in the last ${WINDOW_HOURS}h — cron likely missed a run`,
      {
        level: "error",
        extra: { window_hours: WINDOW_HOURS, cutoff },
      },
    );
    return { status: "no_rows", rows: 0, posted: 0, window_hours: WINDOW_HOURS };
  }

  if (posted === 0) {
    Sentry.captureMessage(
      `Social watchdog: ${rows.length} rows in ${WINDOW_HOURS}h but zero posted (all rejected/errored)`,
      {
        level: "error",
        extra: {
          window_hours: WINDOW_HOURS,
          rows: rows.length,
          sample_errors: rows
            .filter((r) => r.error)
            .slice(0, 4)
            .map((r) => `${r.platform}: ${r.error}`),
        },
      },
    );
    return {
      status: "all_failed",
      rows: rows.length,
      posted: 0,
      window_hours: WINDOW_HOURS,
    };
  }

  return {
    status: "ok",
    rows: rows.length,
    posted,
    window_hours: WINDOW_HOURS,
  };
}

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  try {
    const result = await run();
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    Sentry.captureException(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
