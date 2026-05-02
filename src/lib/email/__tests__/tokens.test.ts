// Tests for the three HMAC token families (lead-ack, report-share,
// proposal, pre-survey). Coverage focus:
//   - Round-trip: build → parse returns the original UUID
//   - Tamper rejection: any byte change invalidates
//   - Distinct secrets: leakage in one family can't replay against
//     another
//   - Missing-secret error path: throws (not returns null) so a
//     misconfigured deploy fails loudly instead of silently signing
//     with empty bytes

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  signLeadAckToken,
  verifyLeadAckToken,
  buildReportToken,
  parseReportToken,
  buildProposalToken,
  parseProposalToken,
  buildPreSurveyToken,
  parsePreSurveyToken,
} from "../tokens";

const SAMPLE_UUID = "8f3c2f3a-1f4b-4c1d-8e5a-1234567890ab";

// Stash the existing env so we don't pollute the test runner's
// global state — restored after each block.
let originalEnv: NodeJS.ProcessEnv;
beforeEach(() => {
  originalEnv = { ...process.env };
  process.env.INSTALLER_LEAD_ACK_SECRET = "x".repeat(32);
  process.env.REPORT_TOKEN_SECRET = "y".repeat(32);
  process.env.PROPOSAL_TOKEN_SECRET = "z".repeat(32);
  process.env.PRE_SURVEY_TOKEN_SECRET = "w".repeat(32);
});
afterEach(() => {
  process.env = originalEnv;
});

// ─── Lead-ack token ────────────────────────────────────────────────

describe("signLeadAckToken / verifyLeadAckToken", () => {
  it("produces a stable signature for the same input", () => {
    const a = signLeadAckToken(SAMPLE_UUID);
    const b = signLeadAckToken(SAMPLE_UUID);
    expect(a).toBe(b);
  });

  it("verifies its own signature", () => {
    const sig = signLeadAckToken(SAMPLE_UUID);
    expect(verifyLeadAckToken(SAMPLE_UUID, sig)).toBe(true);
  });

  it("rejects a tampered signature (any byte flipped)", () => {
    const sig = signLeadAckToken(SAMPLE_UUID);
    const flipped = sig.slice(0, -1) + (sig.slice(-1) === "0" ? "1" : "0");
    expect(verifyLeadAckToken(SAMPLE_UUID, flipped)).toBe(false);
  });

  it("rejects a signature from a different lead id", () => {
    const sig = signLeadAckToken(SAMPLE_UUID);
    expect(verifyLeadAckToken("00000000-0000-0000-0000-000000000000", sig)).toBe(false);
  });

  it("rejects empty / non-string tokens", () => {
    expect(verifyLeadAckToken(SAMPLE_UUID, "")).toBe(false);
    // @ts-expect-error testing runtime safety
    expect(verifyLeadAckToken(SAMPLE_UUID, null)).toBe(false);
  });

  it("throws when INSTALLER_LEAD_ACK_SECRET is missing", () => {
    delete process.env.INSTALLER_LEAD_ACK_SECRET;
    expect(() => signLeadAckToken(SAMPLE_UUID)).toThrow(/INSTALLER_LEAD_ACK_SECRET/);
  });

  it("throws when secret is shorter than 16 chars", () => {
    process.env.INSTALLER_LEAD_ACK_SECRET = "tooshort";
    expect(() => signLeadAckToken(SAMPLE_UUID)).toThrow();
  });
});

// ─── Report token ──────────────────────────────────────────────────

describe("buildReportToken / parseReportToken", () => {
  it("round-trips a UUID through build → parse", () => {
    const tok = buildReportToken(SAMPLE_UUID);
    expect(parseReportToken(tok)).toBe(SAMPLE_UUID);
  });

  it("strips dashes from the compact prefix", () => {
    const tok = buildReportToken(SAMPLE_UUID);
    const [compact] = tok.split(".");
    expect(compact).toBe(SAMPLE_UUID.replace(/-/g, ""));
    expect(compact.length).toBe(32);
  });

  it("returns null on a malformed token", () => {
    expect(parseReportToken("")).toBeNull();
    expect(parseReportToken("nope")).toBeNull();
    expect(parseReportToken("a.b.c")).toBeNull();
    expect(parseReportToken("nothex.notvalidhex")).toBeNull();
  });

  it("returns null when the signature was forged", () => {
    const tok = buildReportToken(SAMPLE_UUID);
    const [compact] = tok.split(".");
    // Plausible-looking but bogus 64-char hex sig
    expect(parseReportToken(`${compact}.${"a".repeat(64)}`)).toBeNull();
  });

  it("returns null when the compact id is the wrong length", () => {
    expect(parseReportToken(`abc.${"a".repeat(64)}`)).toBeNull();
  });
});

// ─── Proposal token ────────────────────────────────────────────────

describe("buildProposalToken / parseProposalToken", () => {
  it("round-trips a UUID through build → parse", () => {
    const tok = buildProposalToken(SAMPLE_UUID);
    expect(parseProposalToken(tok)).toBe(SAMPLE_UUID);
  });

  it("uses a distinct secret from the report token (cross-replay rejected)", () => {
    // Build a report token with the report secret. Pass it to the
    // proposal parser — must fail because the secrets differ.
    const reportTok = buildReportToken(SAMPLE_UUID);
    expect(parseProposalToken(reportTok)).toBeNull();
  });

  it("falls back to REPORT_TOKEN_SECRET when PROPOSAL_TOKEN_SECRET is missing", () => {
    delete process.env.PROPOSAL_TOKEN_SECRET;
    // With only REPORT_TOKEN_SECRET set, both build + parse use it
    // and round-trip should still work (dev-convenience fallback).
    const tok = buildProposalToken(SAMPLE_UUID);
    expect(parseProposalToken(tok)).toBe(SAMPLE_UUID);
  });

  it("throws when neither PROPOSAL_TOKEN_SECRET nor REPORT_TOKEN_SECRET is set", () => {
    delete process.env.PROPOSAL_TOKEN_SECRET;
    delete process.env.REPORT_TOKEN_SECRET;
    expect(() => buildProposalToken(SAMPLE_UUID)).toThrow(/PROPOSAL_TOKEN_SECRET/);
  });
});

// ─── Pre-survey token ──────────────────────────────────────────────

describe("buildPreSurveyToken / parsePreSurveyToken", () => {
  it("round-trips a UUID through build → parse", () => {
    const tok = buildPreSurveyToken(SAMPLE_UUID);
    expect(parsePreSurveyToken(tok)).toBe(SAMPLE_UUID);
  });

  it("uses a distinct secret from the report + proposal tokens", () => {
    const reportTok = buildReportToken(SAMPLE_UUID);
    const propTok = buildProposalToken(SAMPLE_UUID);
    expect(parsePreSurveyToken(reportTok)).toBeNull();
    expect(parsePreSurveyToken(propTok)).toBeNull();
  });

  it("falls back to REPORT_TOKEN_SECRET when PRE_SURVEY_TOKEN_SECRET missing", () => {
    delete process.env.PRE_SURVEY_TOKEN_SECRET;
    const tok = buildPreSurveyToken(SAMPLE_UUID);
    expect(parsePreSurveyToken(tok)).toBe(SAMPLE_UUID);
  });
});

// ─── Cross-family non-replay ────────────────────────────────────────
//
// One last belt-and-braces: a token from any family can't be used
// to access data in another family even if the underlying UUID
// happens to coincide.

describe("token families are mutually non-replayable", () => {
  it("report token doesn't parse as proposal or pre-survey", () => {
    const t = buildReportToken(SAMPLE_UUID);
    expect(parseProposalToken(t)).toBeNull();
    expect(parsePreSurveyToken(t)).toBeNull();
  });

  it("proposal token doesn't parse as report or pre-survey", () => {
    const t = buildProposalToken(SAMPLE_UUID);
    expect(parseReportToken(t)).toBeNull();
    expect(parsePreSurveyToken(t)).toBeNull();
  });

  it("pre-survey token doesn't parse as report or proposal", () => {
    const t = buildPreSurveyToken(SAMPLE_UUID);
    expect(parseReportToken(t)).toBeNull();
    expect(parseProposalToken(t)).toBeNull();
  });
});
