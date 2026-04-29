// GET /api/_debug/calendar-auth
//
// Diagnostic endpoint to introspect the Google Calendar service-account
// configuration without leaking the private key. Use to debug "decoder
// unsupported" / "invalid PEM" errors after deploying.
//
// Returns a structured shape report describing what's in the env var
// (length, markers, newline counts) and whether a JWT auth attempt
// succeeds. NEVER returns the key contents, only metadata.
//
// Auth: requires the caller to be a logged-in admin. We don't gate on
// the middleware's `/admin/*` check because this lives under `/api`
// where the middleware runs differently — manual role check inline.

import { NextResponse } from "next/server";
import { JWT } from "google-auth-library";
import { calendar } from "@googleapis/calendar";
import { createClient } from "@/lib/supabase/server";
import {
  describePrivateKeyShape,
  normalisePrivateKey,
} from "@/lib/google/calendar";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "auth required" }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();
  if (profile?.role !== "admin") {
    return NextResponse.json({ ok: false, error: "admin only" }, { status: 403 });
  }

  const clientEmail = process.env.GOOGLE_CALENDAR_SA_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_CALENDAR_SA_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  const env = {
    GOOGLE_CALENDAR_SA_CLIENT_EMAIL: {
      set: Boolean(clientEmail),
      length: clientEmail?.length ?? 0,
      // Domain part only — the local-part is the random SA ID.
      domain: clientEmail?.split("@")[1] ?? null,
    },
    GOOGLE_CALENDAR_ID: {
      set: Boolean(calendarId),
      length: calendarId?.length ?? 0,
      shape: calendarId?.endsWith("@group.calendar.google.com")
        ? "secondary-calendar"
        : calendarId?.includes("@")
          ? "primary-calendar"
          : "unrecognised",
    },
    GOOGLE_CALENDAR_SA_PRIVATE_KEY: rawKey
      ? describePrivateKeyShape(rawKey)
      : { set: false },
  };

  // If any of the three envs is missing, stop here — JWT attempt would
  // throw a less helpful error.
  if (!clientEmail || !rawKey || !calendarId) {
    return NextResponse.json({ ok: false, env, jwt: null, api: null });
  }

  // Try to construct a JWT and make a no-op API call (events.list with
  // maxResults=1 against the bookings calendar). This catches both
  // bad-key errors (during JWT auth) and bad-permission errors
  // (during the API call).
  let jwtError: string | null = null;
  let apiError: string | null = null;
  let apiOk = false;
  try {
    const auth = new JWT({
      email: clientEmail,
      key: normalisePrivateKey(rawKey),
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
    try {
      const cal = calendar({ version: "v3", auth });
      const res = await cal.events.list({
        calendarId,
        maxResults: 1,
      });
      apiOk = res.status === 200;
    } catch (e) {
      apiError = e instanceof Error ? e.message : "API call failed";
    }
  } catch (e) {
    jwtError = e instanceof Error ? e.message : "JWT init failed";
  }

  return NextResponse.json({
    ok: apiOk && !jwtError && !apiError,
    env,
    jwt: { ok: !jwtError, error: jwtError },
    api: { ok: apiOk, error: apiError },
  });
}
