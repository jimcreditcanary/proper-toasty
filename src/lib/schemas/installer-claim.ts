import { z } from "zod";

// Public schemas for the F2 installer claim flow.
//
// Two endpoints — search (fuzzy + by-id) and "did anyone already claim
// this one?" — feed the /installer-signup page so it can pre-fill the
// signup form against a real `installers.id`.

// ─── Lookup ────────────────────────────────────────────────────────────

// What we surface back to the client per match. Email is masked
// (info@a***.com) so the search isn't a free email-harvesting tool —
// the email gets pre-filled in the signup form server-side once the
// user actually picks an installer.
export const ClaimLookupHitSchema = z.object({
  id: z.number().int().positive(),
  companyName: z.string(),
  companyNumber: z.string().nullable(),
  postcode: z.string().nullable(),
  county: z.string().nullable(),
  certificationBody: z.string().nullable(),
  certificationNumber: z.string().nullable(),
  // Whether someone has already claimed this profile. The UI
  // disables the "select" CTA + shows a "this has been claimed"
  // message when true.
  alreadyClaimed: z.boolean(),
  // Masked hint so the user knows roughly which email this lead will
  // use. Null when no email on file.
  emailHint: z.string().nullable(),
  // True iff this match looked like an exact company-number match
  // (so the UI can render a slightly different layout).
  exactByNumber: z.boolean(),
});
export type ClaimLookupHit = z.infer<typeof ClaimLookupHitSchema>;

export const ClaimLookupRequestSchema = z.object({
  q: z.string().trim().min(2, "Type at least 2 characters").max(120),
});
export type ClaimLookupRequest = z.infer<typeof ClaimLookupRequestSchema>;

export const ClaimLookupResponseSchema = z.object({
  ok: z.boolean(),
  matches: z.array(ClaimLookupHitSchema),
  // True when the query looked like a Companies House number — used
  // by the UI to render "we couldn't find that company number" copy
  // when matches is empty.
  byNumber: z.boolean(),
  error: z.string().optional(),
});
export type ClaimLookupResponse = z.infer<typeof ClaimLookupResponseSchema>;

// ─── Get-by-id (used when ?id= prefills the signup form) ───────────────

export const ClaimGetRequestSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// Same shape as a hit, plus the unmasked email when present so the
// signup page can pre-fill it. Server-only — exposed via GET to the
// signup page render, not in JSON.
export const ClaimGetResponseSchema = z.object({
  ok: z.boolean(),
  match: ClaimLookupHitSchema.extend({
    email: z.string().nullable(),
  }).optional(),
  error: z.string().optional(),
});
export type ClaimGetResponse = z.infer<typeof ClaimGetResponseSchema>;
