// Google Calendar integration for installer bookings.
//
// Two events per booking, both inserted onto the Propertoasty-owned
// "bookings" calendar:
//
//   1. Homeowner event — 1 hour, homeowner as the only attendee. The
//      installer is mentioned in the title so the homeowner sees who
//      they're meeting. Description carries prep tips.
//
//   2. Installer event — 2 hours (30 min travel + 1 hr meeting +
//      30 min travel), installer as the only attendee. Description
//      carries full homeowner contact details + property + selected
//      tech so the installer has everything they need to show up
//      prepared.
//
// Why two events: the homeowner doesn't need to see the travel
// buffers cluttering their calendar, and the installer needs the
// extended block on theirs. Two events keep both views clean.
//
// Auth: service-account JWT against the GOOGLE_CALENDAR_ID calendar
// (the SA must have "Make changes to events" share access on that
// calendar — set up manually in Google Calendar UI).
//
// Fail-soft: if any env var is missing, every public function returns
// { ok: false, skipped: true, reason } and the caller decides what to
// do. We never fail a user-facing booking because the calendar API
// is misconfigured.

import { calendar, type calendar_v3 } from "@googleapis/calendar";
import { JWT } from "google-auth-library";

const SCOPES = ["https://www.googleapis.com/auth/calendar.events"];
const TIMEZONE = "Europe/London";

export type CalendarResult =
  | { ok: true; eventId: string }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped: false; error: string };

// ─── Lazy auth + client ─────────────────────────────────────────────────

interface CalendarConfig {
  clientEmail: string;
  privateKey: string;
  calendarId: string;
}

let cachedClient: calendar_v3.Calendar | null = null;
let cachedConfig: CalendarConfig | null = null;

function readConfig(): CalendarConfig | null {
  const clientEmail = process.env.GOOGLE_CALENDAR_SA_CLIENT_EMAIL;
  const rawKey = process.env.GOOGLE_CALENDAR_SA_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!clientEmail || !rawKey || !calendarId) return null;
  // Vercel + .env.local both store the key with literal `\n` escape
  // sequences. Expand to real newlines so the JWT signer can parse
  // the PEM block. If the key already has real newlines this is a
  // no-op.
  const privateKey = rawKey.replace(/\\n/g, "\n");
  return { clientEmail, privateKey, calendarId };
}

function getClient(): { client: calendar_v3.Calendar; config: CalendarConfig } | null {
  const config = cachedConfig ?? readConfig();
  if (!config) return null;
  cachedConfig = config;
  if (!cachedClient) {
    const auth = new JWT({
      email: config.clientEmail,
      key: config.privateKey,
      scopes: SCOPES,
    });
    cachedClient = calendar({ version: "v3", auth });
  }
  return { client: cachedClient, config };
}

// ─── Public payloads ────────────────────────────────────────────────────

export interface HomeownerEventInput {
  meetingStartUtc: string; // ISO
  meetingDurationMin: number; // typically 60
  homeownerEmail: string;
  homeownerName: string;
  installerCompanyName: string;
  installerEmail: string | null;
  installerTelephone: string | null;
  propertyAddress: string | null;
  propertyPostcode: string | null;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}

export interface InstallerEventInput {
  meetingStartUtc: string; // ISO
  meetingDurationMin: number; // typically 60
  travelBufferMin: number; // typically 30 — extends both ends of the event
  installerEmail: string;
  installerCompanyName: string;
  homeownerName: string;
  homeownerEmail: string;
  homeownerPhone: string;
  propertyAddress: string | null;
  propertyPostcode: string | null;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
  // Will become a real installer-portal report link in PR C. Pass null
  // to omit the line in the description.
  reportLinkUrl?: string | null;
}

// ─── Event-payload builders (pure — exported for tests) ─────────────────

export function buildHomeownerEvent(
  input: HomeownerEventInput,
): calendar_v3.Schema$Event {
  const start = new Date(input.meetingStartUtc);
  const end = new Date(start.getTime() + input.meetingDurationMin * 60_000);

  const techs = listTechs(input);
  const summary = `Site survey with ${input.installerCompanyName}`;

  // Description — prep tips per the spec. Plain-text-ish HTML so it
  // renders nicely in both Gmail (which respects HTML) and clients that
  // strip it.
  const lines: string[] = [
    `${input.installerCompanyName} are coming round to survey your home for ${techs}.`,
    "",
    "How to get the best out of your installer:",
    "• Have your last energy bill handy — they'll want recent kWh figures.",
    "• Walk them through the rooms they'll work in, including loft / garage / cupboards.",
    "• Ask them to point out anything that surprised them about your property.",
    "",
    "Things to bring up with your installer:",
    "• MCS certification — get the number on the quote.",
    "• Warranty length on labour AND kit (5+ years labour, 7+ on kit).",
    "• Specific kit make and model — never accept a vague \"a 5 kW system\" line.",
    "• Whether they handle DNO notification + planning permission.",
    "",
    "What to ask an installer when they visit:",
    "• Can I see references from two or three local jobs similar to mine?",
    "• Who do I call if something breaks in year 3?",
    "• Are there any \"gotchas\" with my property — old wiring, unusual pipework?",
    "• How long, end to end, from signed quote to switch-on?",
    "",
    input.propertyAddress ? `Address: ${input.propertyAddress}` : "",
    "",
    `Need to change or cancel? Contact ${input.installerCompanyName} directly:`,
    input.installerEmail ? `  Email: ${input.installerEmail}` : "",
    input.installerTelephone ? `  Phone: ${input.installerTelephone}` : "",
    "",
    "— The Propertoasty team",
  ].filter((l) => l != null);

  return {
    summary,
    description: lines.join("\n"),
    location: input.propertyAddress ?? input.propertyPostcode ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    attendees: [{ email: input.homeownerEmail, displayName: input.homeownerName }],
    reminders: { useDefault: true },
  };
}

export function buildInstallerEvent(
  input: InstallerEventInput,
): calendar_v3.Schema$Event {
  const meetingStart = new Date(input.meetingStartUtc);
  const start = new Date(
    meetingStart.getTime() - input.travelBufferMin * 60_000,
  );
  const end = new Date(
    meetingStart.getTime() +
      (input.meetingDurationMin + input.travelBufferMin) * 60_000,
  );

  const techs = listTechs(input);
  const summary = `Site survey: ${input.homeownerName}${
    input.propertyPostcode ? ` (${input.propertyPostcode})` : ""
  }`;

  const lines: string[] = [
    `Site survey for ${techs} via Propertoasty.`,
    "",
    `1-hour visit with ${input.travelBufferMin}-min travel buffer either side (this event is the full block).`,
    "",
    "Homeowner contact:",
    `  Name: ${input.homeownerName}`,
    `  Email: ${input.homeownerEmail}`,
    `  Phone: ${input.homeownerPhone}`,
    "",
    input.propertyAddress ? `Address: ${input.propertyAddress}` : "",
    input.propertyPostcode && !input.propertyAddress
      ? `Postcode: ${input.propertyPostcode}`
      : "",
    "",
    "What they're interested in:",
    input.wantsHeatPump ? "  • Heat pump" : "",
    input.wantsSolar ? "  • Solar PV" : "",
    input.wantsBattery ? "  • Battery storage" : "",
    "",
    input.reportLinkUrl
      ? `Full pre-survey report: ${input.reportLinkUrl}`
      : "Full pre-survey report will be linked from your installer portal once it ships.",
    "",
    "If you need to reschedule, contact the homeowner directly using the details above.",
    "",
    "— The Propertoasty team",
  ].filter((l) => l != null && l !== "");

  return {
    summary,
    description: lines.join("\n"),
    location: input.propertyAddress ?? input.propertyPostcode ?? undefined,
    start: { dateTime: start.toISOString(), timeZone: TIMEZONE },
    end: { dateTime: end.toISOString(), timeZone: TIMEZONE },
    attendees: [
      {
        email: input.installerEmail,
        displayName: input.installerCompanyName,
      },
    ],
    reminders: { useDefault: true },
  };
}

function listTechs(input: {
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}): string {
  const parts: string[] = [];
  if (input.wantsHeatPump) parts.push("a heat pump");
  if (input.wantsSolar) parts.push("solar PV");
  if (input.wantsBattery) parts.push("a battery");
  if (parts.length === 0) return "energy upgrades";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

// ─── Insert helpers ─────────────────────────────────────────────────────

async function insertEvent(
  event: calendar_v3.Schema$Event,
): Promise<CalendarResult> {
  const handle = getClient();
  if (!handle) {
    return {
      ok: false,
      skipped: true,
      reason: "Google Calendar env vars not configured",
    };
  }
  try {
    const res = await handle.client.events.insert({
      calendarId: handle.config.calendarId,
      // 'all' = email all attendees with the standard Google invite.
      // 'externalOnly' / 'none' wouldn't actually deliver to the user.
      sendUpdates: "all",
      requestBody: event,
    });
    const id = res.data.id;
    if (!id) {
      return {
        ok: false,
        skipped: false,
        error: "Calendar API returned no event ID",
      };
    }
    return { ok: true, eventId: id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Calendar API call failed";
    console.error("[calendar] insert failed:", msg);
    return { ok: false, skipped: false, error: msg };
  }
}

export async function insertHomeownerEvent(
  input: HomeownerEventInput,
): Promise<CalendarResult> {
  return insertEvent(buildHomeownerEvent(input));
}

export async function insertInstallerEvent(
  input: InstallerEventInput,
): Promise<CalendarResult> {
  return insertEvent(buildInstallerEvent(input));
}
