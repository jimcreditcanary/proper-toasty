import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendDueReminders,
  releaseStaleLeads,
} from "@/lib/booking/auto-release";

// GET /api/cron/release-stale-leads
//
// Scheduled by vercel.json. Vercel cron sends a Bearer token
// (CRON_SECRET) on every invocation; the endpoint rejects anything
// without it so the URL itself isn't a back-door.
//
// Two passes per call:
//   1. Reminder pass — installers with leads still pending after 12h
//      get a "12 hours left" email.
//   2. Release pass — installers with leads still pending after 24h
//      get the lead cancelled, both parties emailed.
//
// Both passes are idempotent — re-running mid-cycle never double-
// emails or double-cancels.
//
// We respond with the count summary so the cron logs in Vercel
// give us a quick "did anything happen?" signal.

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function appBaseUrl(req: Request): string {
  const url = new URL(req.url);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? url.origin;
  return base.replace(/\/+$/, "");
}

async function run(req: Request) {
  // Auth — Vercel cron + manual triggers (e.g. `curl` from a worker)
  // both pass a Bearer token. CRON_SECRET must be set in env.
  const expected = process.env.CRON_SECRET;
  if (!expected || expected.length < 16) {
    console.error("[cron/release-stale-leads] CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json(
      { error: "Unauthorised" },
      { status: 401 },
    );
  }

  const admin = createAdminClient();
  const baseUrl = appBaseUrl(req);
  console.log("[cron/release-stale-leads] starting", { baseUrl });

  // Reminders first — gets the email out before we cancel anything.
  const reminders = await sendDueReminders({
    admin,
    appBaseUrl: baseUrl,
  });
  const releases = await releaseStaleLeads({
    admin,
    appBaseUrl: baseUrl,
  });

  console.log("[cron/release-stale-leads] done", { reminders, releases });

  return NextResponse.json({
    ok: true,
    reminders,
    releases,
  });
}

export async function GET(req: Request): Promise<NextResponse> {
  return run(req);
}

// Allow POST too — some manual cron services (cron-job.org, EasyCron)
// only support POST. Same auth + behaviour.
export async function POST(req: Request): Promise<NextResponse> {
  return run(req);
}
