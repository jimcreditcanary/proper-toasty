// POST /api/telemetry/check-step
//
// Beacon endpoint the check-wizard client fires on every step change.
// Small + fast — validates the shape, calls track(), returns 204.
// The client is fire-and-forget (never awaits), so we never block a
// step transition on the analytics call.
//
// Why beacon-through-server-side track() rather than posthog-js in
// the browser: keeps the event taxonomy centralised on EventMap +
// avoids shipping the posthog-js bundle + avoids exposing another
// NEXT_PUBLIC_* env var. Trade-off is we can't autocapture rage-
// clicks or session replays — for wizard funnel drop-off, don't
// need them.
//
// Anti-abuse: the endpoint is unauthenticated (the wizard runs pre-
// auth). Rate-limiting is left to Vercel's default WAF for now;
// worst case we get a few thousand fake step-viewed events, easy to
// filter downstream in PostHog if it becomes an issue.

import { NextResponse } from "next/server";
import { z } from "zod";
import { track } from "@/lib/analytics";

export const runtime = "nodejs";
export const maxDuration = 5;

const BodySchema = z.object({
  step: z.enum([
    "address",
    "preview",
    "questions",
    "floorplan",
    "analysis",
    "lead_capture",
    "report",
  ]),
  /** Anonymous UUID from localStorage (`pt_anon_id`). Client
   *  generates it on first wizard entry; stitches consecutive
   *  steps into a single PostHog user. */
  anon_id: z.string().min(8).max(64),
  from_presurvey_link: z.boolean().default(false),
  from_installer_prebind: z.boolean().default(false),
  referrer_path: z.string().max(2048).nullable().default(null),
});

export async function POST(req: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    // Bad body — 204 anyway so the fire-and-forget client never
    // logs a network error. Bad shapes are the client's problem to
    // fix, not the user's UX to disrupt.
    return new NextResponse(null, { status: 204 });
  }

  // Pass the anon_id as userId so track()'s resolveDistinctId picks
  // it up verbatim — same visitor's step-viewed events land under
  // the same PostHog distinct_id for funnel stitching.
  track("check_step_viewed", {
    userId: body.anon_id,
    props: {
      step: body.step,
      from_presurvey_link: body.from_presurvey_link,
      from_installer_prebind: body.from_installer_prebind,
      referrer_path: body.referrer_path,
    },
  });

  return new NextResponse(null, { status: 204 });
}
