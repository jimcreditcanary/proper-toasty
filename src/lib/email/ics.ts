// RFC 5545 ICS file builder for calendar invites attached to
// transactional emails.
//
// Why ICS instead of Google Calendar API attendees:
//   The service-account auth we set up can't `events.insert` with
//   attendees without Domain-Wide Delegation, which requires a paid
//   Google Workspace seat for the calendar's owner. ICS attachments
//   work universally — Gmail / Outlook / Apple Calendar all parse the
//   text/calendar MIME part and render an "Add to calendar" UI, no
//   server-side calendar service needed.
//
// We still create events on the bookings calendar via the API as a
// Propertoasty-side audit trail (just without attendees so the API
// doesn't error out). The ICS attached here is what the user
// actually sees in their inbox.
//
// Method=REQUEST is what triggers the "Add to calendar" UI in most
// clients. The ATTENDEE line with RSVP=TRUE asks for an RSVP — clients
// like Outlook show Yes/Maybe/No buttons.

export interface IcsEvent {
  /** Stable globally-unique identifier. Same UID + bumped SEQUENCE for updates. */
  uid: string;
  /** UTC start instant */
  startUtc: Date;
  /** UTC end instant */
  endUtc: Date;
  /** Short title shown in the user's calendar */
  summary: string;
  /** Free-text body shown in the event details */
  description: string;
  /** Optional address / location field */
  location?: string | null;
  /** Email address of the calendar's "owner" — the from line on the invite */
  organiserEmail: string;
  /** Display name of the organiser */
  organiserName: string;
  /** Single attendee for the event (we send separate ICS files per recipient) */
  attendeeEmail: string;
  /** Display name of the attendee */
  attendeeName?: string | null;
}

const PRODID = "-//Propertoasty//Booking//EN";

/** Format a Date in `YYYYMMDDTHHMMSSZ` UTC form. */
function formatUtc(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Escape special characters in TEXT-typed ICS values.
 *   - Backslash, semicolon, comma must be backslash-escaped (RFC 5545 §3.3.11)
 *   - Newlines become literal `\n`
 */
function escapeText(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\\n");
}

/**
 * Fold a content line at 75 octets per RFC 5545 §3.1. Continuation
 * lines start with a single space. Most clients are lenient but
 * strict folding keeps Outlook happy.
 */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let remaining = line;
  let first = true;
  while (remaining.length > 0) {
    const cut = first ? 75 : 74; // continuation lines have 1 leading space
    const chunk = remaining.slice(0, cut);
    out.push(first ? chunk : ` ${chunk}`);
    remaining = remaining.slice(cut);
    first = false;
  }
  return out.join("\r\n");
}

/**
 * Build an RFC 5545 VCALENDAR document for a single event.
 *
 * Returns a string ready to be base64-encoded and attached to a
 * Postmark email with `Content-Type: text/calendar; method=REQUEST`.
 */
export function buildIcs(event: IcsEvent): string {
  const now = new Date();
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PRODID}`,
    "METHOD:REQUEST",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `DTSTAMP:${formatUtc(now)}`,
    `DTSTART:${formatUtc(event.startUtc)}`,
    `DTEND:${formatUtc(event.endUtc)}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    ...(event.location
      ? [`LOCATION:${escapeText(event.location)}`]
      : []),
    `ORGANIZER;CN=${escapeText(event.organiserName)}:mailto:${event.organiserEmail}`,
    `ATTENDEE;CN=${escapeText(event.attendeeName ?? event.attendeeEmail)};RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:${event.attendeeEmail}`,
    "STATUS:CONFIRMED",
    "SEQUENCE:0",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/**
 * Encode an ICS string as base64 — Postmark's attachment API expects
 * the content base64-encoded.
 */
export function icsToBase64(ics: string): string {
  return Buffer.from(ics, "utf8").toString("base64");
}
