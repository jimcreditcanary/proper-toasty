// Shared validation + constants for installer-initiated pre-survey
// requests. Single source of truth for the form contract + cost.

import { z } from "zod";

// 1 credit per send (initial + each resend). Matches the price the
// installer-portal landing tile advertises.
export const PRE_SURVEY_REQUEST_COST_CREDITS = 1;

// Resend cooling-off — installer can't fire a duplicate within this
// window. Stops accidental double-billing when a button gets
// double-clicked, and nudges them to wait long enough that a re-send
// is actually meaningful.
export const PRE_SURVEY_RESEND_COOLOFF_HOURS = 72;

// Token + row hard expiry. After this the link 404s and the row
// status flips to "expired" lazily on the next list render.
export const PRE_SURVEY_TOKEN_TTL_DAYS = 30;

// UK postcode regex — matches the same shape used elsewhere in the
// codebase (postcode/region.ts). Permissive on whitespace; we
// uppercase + collapse before storing.
const POSTCODE_RE = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i;

export const createPreSurveyRequestSchema = z.object({
  contact_name: z.string().min(1, "Name needed").max(120),
  contact_email: z.string().email("Valid email needed").max(254),
  contact_postcode: z
    .string()
    .max(10)
    .optional()
    .transform((v) => (v ? v.trim().toUpperCase() : null))
    .refine(
      (v) => v == null || v === "" || POSTCODE_RE.test(v),
      "Postcode doesn't look right",
    )
    .transform((v) => (v == null || v === "" ? null : normalisePostcode(v))),
});
export type CreatePreSurveyRequestInput = z.infer<typeof createPreSurveyRequestSchema>;

function normalisePostcode(v: string): string {
  // "SW1A1AA" → "SW1A 1AA"; "sw1a 1aa" → "SW1A 1AA". Idempotent.
  const m = v.match(POSTCODE_RE);
  if (!m) return v;
  return `${m[1]} ${m[2]}`.toUpperCase();
}
