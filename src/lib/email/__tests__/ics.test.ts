import { describe, expect, it } from "vitest";
import { buildIcs, icsToBase64 } from "../ics";

const BASE = {
  uid: "lead-abc-homeowner@propertoasty.com",
  startUtc: new Date("2026-05-04T09:00:00Z"),
  endUtc: new Date("2026-05-04T10:00:00Z"),
  summary: "Site survey with Eden Solar UK Ltd",
  description: "1-hour visit",
  location: "123 Main St, Ealing",
  organiserEmail: "bookings@propertoasty.com",
  organiserName: "Propertoasty",
  attendeeEmail: "sarah@example.com",
  attendeeName: "Sarah Jones",
};

describe("buildIcs", () => {
  it("emits a well-formed VCALENDAR document", () => {
    const ics = buildIcs(BASE);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("METHOD:REQUEST");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VEVENT");
  });

  it("formats UTC times in YYYYMMDDTHHMMSSZ form", () => {
    const ics = buildIcs(BASE);
    expect(ics).toContain("DTSTART:20260504T090000Z");
    expect(ics).toContain("DTEND:20260504T100000Z");
  });

  it("escapes commas and semicolons in TEXT values", () => {
    const ics = buildIcs({
      ...BASE,
      summary: "Survey, with semicolons; and commas",
      description: "line one\nline two",
    });
    expect(ics).toContain("SUMMARY:Survey\\, with semicolons\\; and commas");
    expect(ics).toContain("DESCRIPTION:line one\\nline two");
  });

  it("includes ORGANIZER + ATTENDEE with names + RSVP", () => {
    const ics = buildIcs(BASE);
    // ORGANIZER line fits in 75 chars so isn't folded.
    expect(ics).toContain(
      "ORGANIZER;CN=Propertoasty:mailto:bookings@propertoasty.com",
    );
    // ATTENDEE line is >75 chars so it gets folded — check for the
    // logical line content (with possible continuation-line spaces).
    // Strip CRLF + space sequences to get back to the unfolded form.
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain(
      "ATTENDEE;CN=Sarah Jones;RSVP=TRUE;PARTSTAT=NEEDS-ACTION;ROLE=REQ-PARTICIPANT:mailto:sarah@example.com",
    );
  });

  it("includes LOCATION when given", () => {
    const ics = buildIcs(BASE);
    expect(ics).toContain("LOCATION:123 Main St\\, Ealing");
  });

  it("omits LOCATION line when null", () => {
    const ics = buildIcs({ ...BASE, location: null });
    expect(ics).not.toContain("LOCATION:");
  });

  it("uses a stable UID we can use for updates / cancellations", () => {
    const ics = buildIcs(BASE);
    expect(ics).toContain("UID:lead-abc-homeowner@propertoasty.com");
    expect(ics).toContain("SEQUENCE:0");
  });

  it("folds long lines at 75 octets per RFC 5545", () => {
    const longSummary = "a".repeat(200);
    const ics = buildIcs({ ...BASE, summary: longSummary });
    // Continuation lines start with a space.
    expect(ics).toMatch(/\r\n /);
    // No single line should exceed 75 chars (we measure logical lines
    // before the CRLF + leading space).
    const lines = ics.split("\r\n");
    for (const line of lines) {
      // Lines that aren't continuations themselves
      if (!line.startsWith(" ")) {
        expect(line.length).toBeLessThanOrEqual(75);
      }
    }
  });
});

describe("icsToBase64", () => {
  it("round-trips a UTF-8 string", () => {
    const ics = "BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n";
    const encoded = icsToBase64(ics);
    expect(Buffer.from(encoded, "base64").toString("utf8")).toBe(ics);
  });
});
