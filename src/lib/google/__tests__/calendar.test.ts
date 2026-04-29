import { describe, expect, it } from "vitest";
import {
  buildHomeownerEvent,
  buildInstallerEvent,
  describePrivateKeyShape,
  normalisePrivateKey,
} from "../calendar";

const HOMEOWNER_BASE = {
  meetingStartUtc: "2026-05-04T09:00:00Z",
  meetingDurationMin: 60,
  homeownerEmail: "sarah@example.com",
  homeownerName: "Sarah Jones",
  installerCompanyName: "Eden Solar UK Ltd",
  installerEmail: "hello@edensolar.co.uk",
  installerTelephone: "01234567890",
  propertyAddress: "123 Main St, Ealing W5 4SE",
  propertyPostcode: "W5 4SE",
  wantsHeatPump: true,
  wantsSolar: true,
  wantsBattery: false,
};

describe("buildHomeownerEvent", () => {
  it("sets a 1-hour window from meetingDurationMin", () => {
    const ev = buildHomeownerEvent(HOMEOWNER_BASE);
    expect(ev.start?.dateTime).toBe("2026-05-04T09:00:00.000Z");
    expect(ev.end?.dateTime).toBe("2026-05-04T10:00:00.000Z");
    expect(ev.start?.timeZone).toBe("Europe/London");
  });

  it("only invites the homeowner — installer is mentioned in title only", () => {
    const ev = buildHomeownerEvent(HOMEOWNER_BASE);
    expect(ev.attendees).toEqual([
      { email: "sarah@example.com", displayName: "Sarah Jones" },
    ]);
    expect(ev.summary).toContain("Eden Solar UK Ltd");
  });

  it("description includes prep tips and installer contact info", () => {
    const ev = buildHomeownerEvent(HOMEOWNER_BASE);
    expect(ev.description).toContain("How to get the best out of your installer");
    expect(ev.description).toContain("Things to bring up with your installer");
    expect(ev.description).toContain("What to ask an installer when they visit");
    expect(ev.description).toContain("hello@edensolar.co.uk");
    expect(ev.description).toContain("01234567890");
  });

  it("location uses property address when present", () => {
    const ev = buildHomeownerEvent(HOMEOWNER_BASE);
    expect(ev.location).toBe("123 Main St, Ealing W5 4SE");
  });

  it("falls back to postcode when address is null", () => {
    const ev = buildHomeownerEvent({ ...HOMEOWNER_BASE, propertyAddress: null });
    expect(ev.location).toBe("W5 4SE");
  });
});

const INSTALLER_BASE = {
  meetingStartUtc: "2026-05-04T09:00:00Z",
  meetingDurationMin: 60,
  travelBufferMin: 30,
  installerEmail: "hello@edensolar.co.uk",
  installerCompanyName: "Eden Solar UK Ltd",
  homeownerName: "Sarah Jones",
  homeownerEmail: "sarah@example.com",
  homeownerPhone: "+447700900123",
  propertyAddress: "123 Main St, Ealing W5 4SE",
  propertyPostcode: "W5 4SE",
  wantsHeatPump: true,
  wantsSolar: true,
  wantsBattery: false,
};

describe("buildInstallerEvent", () => {
  it("extends the window by travelBufferMin either side", () => {
    const ev = buildInstallerEvent(INSTALLER_BASE);
    // Start: 09:00 UTC - 30 min = 08:30 UTC
    expect(ev.start?.dateTime).toBe("2026-05-04T08:30:00.000Z");
    // End: 09:00 + 60 + 30 = 10:30 UTC
    expect(ev.end?.dateTime).toBe("2026-05-04T10:30:00.000Z");
  });

  it("invites only the installer", () => {
    const ev = buildInstallerEvent(INSTALLER_BASE);
    expect(ev.attendees).toEqual([
      { email: "hello@edensolar.co.uk", displayName: "Eden Solar UK Ltd" },
    ]);
  });

  it("summary includes homeowner name + postcode", () => {
    const ev = buildInstallerEvent(INSTALLER_BASE);
    expect(ev.summary).toBe("Site survey: Sarah Jones (W5 4SE)");
  });

  it("description includes full homeowner contact details", () => {
    const ev = buildInstallerEvent(INSTALLER_BASE);
    expect(ev.description).toContain("Sarah Jones");
    expect(ev.description).toContain("sarah@example.com");
    expect(ev.description).toContain("+447700900123");
    expect(ev.description).toContain("123 Main St, Ealing W5 4SE");
  });

  it("description lists only the techs the homeowner asked for", () => {
    const ev = buildInstallerEvent({
      ...INSTALLER_BASE,
      wantsBattery: false,
      wantsHeatPump: false,
      wantsSolar: true,
    });
    expect(ev.description).toContain("Solar PV");
    expect(ev.description).not.toContain("Heat pump");
    expect(ev.description).not.toContain("Battery storage");
  });

  it("includes the report link when provided", () => {
    const ev = buildInstallerEvent({
      ...INSTALLER_BASE,
      reportLinkUrl: "https://propertoasty.com/installer/leads/abc123",
    });
    expect(ev.description).toContain(
      "https://propertoasty.com/installer/leads/abc123",
    );
  });

  it("falls back to a placeholder when no report link given", () => {
    const ev = buildInstallerEvent({ ...INSTALLER_BASE, reportLinkUrl: null });
    expect(ev.description).toContain("installer portal");
  });
});

// ─── PEM normalisation ──────────────────────────────────────────────────
//
// These tests cover every shape we've actually seen in the wild on
// Vercel + .env.local. The OpenSSL "decoder unsupported" error
// (1E08010C) is the symptom — these pin down the inputs we accept.

describe("normalisePrivateKey", () => {
  const PEM_BODY =
    "MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ";

  it("expands literal \\n escape sequences to real newlines", () => {
    const raw = `-----BEGIN PRIVATE KEY-----\\n${PEM_BODY}\\n-----END PRIVATE KEY-----\\n`;
    const out = normalisePrivateKey(raw);
    expect(out).toContain("\n"); // real newline now present
    expect(out).not.toContain("\\n"); // literal escape sequence gone
    expect(out.startsWith("-----BEGIN PRIVATE KEY-----\n")).toBe(true);
    expect(out.endsWith("-----END PRIVATE KEY-----\n")).toBe(true);
  });

  it("leaves real-newline keys alone (no double-escaping)", () => {
    const raw = `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----\n`;
    expect(normalisePrivateKey(raw)).toBe(raw);
  });

  it("strips a single pair of surrounding double quotes", () => {
    const raw = `"-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----\n"`;
    const out = normalisePrivateKey(raw);
    expect(out.startsWith("-----BEGIN")).toBe(true);
    expect(out.endsWith("-----\n")).toBe(true);
  });

  it("strips a single pair of surrounding single quotes", () => {
    const raw = `'-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----\n'`;
    expect(normalisePrivateKey(raw).startsWith("-----BEGIN")).toBe(true);
  });

  it("normalises CRLF to LF", () => {
    const raw = `-----BEGIN PRIVATE KEY-----\r\n${PEM_BODY}\r\n-----END PRIVATE KEY-----\r\n`;
    const out = normalisePrivateKey(raw);
    expect(out).not.toContain("\r");
    expect(out.split("\n").length).toBe(4);
  });

  it("appends a trailing newline if missing", () => {
    const raw = `-----BEGIN PRIVATE KEY-----\n${PEM_BODY}\n-----END PRIVATE KEY-----`;
    const out = normalisePrivateKey(raw);
    expect(out.endsWith("\n")).toBe(true);
  });
});

describe("describePrivateKeyShape", () => {
  it("flags well-formed keys correctly", () => {
    const raw = `-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n`;
    const shape = describePrivateKeyShape(raw);
    expect(shape.hasBeginMarker).toBe(true);
    expect(shape.hasEndMarker).toBe(true);
    expect(shape.literalBackslashN).toBe(3);
    expect(shape.realNewlines).toBeGreaterThan(0);
    expect(shape.surroundedByQuotes).toBe(false);
  });

  it("flags surrounding quotes as a problem indicator", () => {
    const raw = `"-----BEGIN PRIVATE KEY-----\\nABC\\n-----END PRIVATE KEY-----\\n"`;
    expect(describePrivateKeyShape(raw).surroundedByQuotes).toBe(true);
  });

  it("flags missing BEGIN marker", () => {
    const raw = `not-a-pem-block`;
    const shape = describePrivateKeyShape(raw);
    expect(shape.hasBeginMarker).toBe(false);
    expect(shape.hasEndMarker).toBe(false);
  });
});
