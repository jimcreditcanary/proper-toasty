// Validation tests for the pre-survey-request input schema.
// Postcode handling has the most edge cases — keeping the test
// list explicit so a regex tweak surfaces any regression.

import { describe, expect, it } from "vitest";
import {
  createPreSurveyRequestSchema,
  PRE_SURVEY_REQUEST_COST_CREDITS,
  PRE_SURVEY_RESEND_COOLOFF_HOURS,
  PRE_SURVEY_TOKEN_TTL_DAYS,
} from "../schema";

const baseValid = {
  contact_name: "Sam Patel",
  contact_email: "sam@example.com",
};

// ─── Constants ─────────────────────────────────────────────────────

describe("constants", () => {
  it("cost is exactly 1 credit per send", () => {
    expect(PRE_SURVEY_REQUEST_COST_CREDITS).toBe(1);
  });

  it("cooling-off is 72 hours", () => {
    expect(PRE_SURVEY_RESEND_COOLOFF_HOURS).toBe(72);
  });

  it("token TTL is 30 days", () => {
    expect(PRE_SURVEY_TOKEN_TTL_DAYS).toBe(30);
  });
});

// ─── Required fields ──────────────────────────────────────────────

describe("createPreSurveyRequestSchema — required fields", () => {
  it("accepts a minimal valid input", () => {
    const r = createPreSurveyRequestSchema.parse(baseValid);
    expect(r.contact_name).toBe("Sam Patel");
    expect(r.contact_email).toBe("sam@example.com");
    expect(r.contact_postcode).toBeNull();
  });

  it("rejects an empty name", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({ ...baseValid, contact_name: "" }),
    ).toThrow(/Name needed/);
  });

  it("rejects malformed email", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({
        ...baseValid,
        contact_email: "not-an-email",
      }),
    ).toThrow(/Valid email needed/);
  });

  it("caps name at 120 chars", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({
        ...baseValid,
        contact_name: "a".repeat(121),
      }),
    ).toThrow();
  });
});

// ─── Postcode normalisation ────────────────────────────────────────

describe("createPreSurveyRequestSchema — postcode", () => {
  it("normalises to uppercase + space-separated", () => {
    const r = createPreSurveyRequestSchema.parse({
      ...baseValid,
      contact_postcode: "sw1a1aa",
    });
    expect(r.contact_postcode).toBe("SW1A 1AA");
  });

  it("preserves existing space + uppercases", () => {
    const r = createPreSurveyRequestSchema.parse({
      ...baseValid,
      contact_postcode: "w5 4se",
    });
    expect(r.contact_postcode).toBe("W5 4SE");
  });

  it("trims trailing whitespace", () => {
    const r = createPreSurveyRequestSchema.parse({
      ...baseValid,
      contact_postcode: "  E1 6AN  ",
    });
    expect(r.contact_postcode).toBe("E1 6AN");
  });

  it("nulls out empty string after trim", () => {
    const r = createPreSurveyRequestSchema.parse({
      ...baseValid,
      contact_postcode: "   ",
    });
    expect(r.contact_postcode).toBeNull();
  });

  it("nulls out missing field entirely", () => {
    const r = createPreSurveyRequestSchema.parse(baseValid);
    expect(r.contact_postcode).toBeNull();
  });

  it("accepts a variety of valid UK postcode formats", () => {
    const valid = [
      "M1 1AE",      // Manchester
      "B33 8TH",     // Birmingham
      "CR2 6XH",     // Croydon
      "DN55 1PT",    // Doncaster (5-char outward)
      "EC1A 1BB",    // London EC1A
      "W1A 0AX",     // London W1A
    ];
    for (const pc of valid) {
      const r = createPreSurveyRequestSchema.parse({
        ...baseValid,
        contact_postcode: pc,
      });
      expect(r.contact_postcode).toBe(pc.toUpperCase());
    }
  });

  it("rejects malformed postcodes", () => {
    const invalid = [
      "12345",       // numbers only
      "ABCDEF",      // letters only
      "SW1",         // outward only
      "INVALID PC",  // too long
    ];
    for (const pc of invalid) {
      expect(() =>
        createPreSurveyRequestSchema.parse({
          ...baseValid,
          contact_postcode: pc,
        }),
      ).toThrow();
    }
  });
});

// ─── Meeting capture (I5 follow-up) ────────────────────────────────

describe("meeting capture", () => {
  it("defaults to not_booked when omitted", () => {
    const parsed = createPreSurveyRequestSchema.parse(baseValid);
    expect(parsed.meeting_status).toBe("not_booked");
    expect(parsed.meeting_at).toBeFalsy();
  });

  it("accepts booked + an ISO datetime", () => {
    const parsed = createPreSurveyRequestSchema.parse({
      ...baseValid,
      meeting_status: "booked",
      meeting_at: "2026-06-15T14:30:00.000Z",
    });
    expect(parsed.meeting_status).toBe("booked");
    expect(parsed.meeting_at).toBe("2026-06-15T14:30:00.000Z");
  });

  it("rejects booked without a meeting_at", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({
        ...baseValid,
        meeting_status: "booked",
      }),
    ).toThrow();
  });

  it("rejects not_booked WITH a meeting_at (consistency check)", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({
        ...baseValid,
        meeting_status: "not_booked",
        meeting_at: "2026-06-15T14:30:00.000Z",
      }),
    ).toThrow();
  });

  it("rejects a non-ISO meeting_at string", () => {
    expect(() =>
      createPreSurveyRequestSchema.parse({
        ...baseValid,
        meeting_status: "booked",
        meeting_at: "not a date",
      }),
    ).toThrow();
  });
});
