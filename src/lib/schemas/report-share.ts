import { z } from "zod";

// "Email me my report" + "Forward to a partner" — both flow through
// /api/reports/share. `kind` distinguishes the two.

export const ShareReportRequestSchema = z.object({
  kind: z.enum(["self", "forward"]),
  // Recipient — homeowner email for self, partner's email for forward.
  recipientEmail: z.string().email("Please enter a valid email"),
  // Forward-only: the homeowner's name (so the partner sees who shared
  // it). Optional but strongly recommended.
  forwardedByName: z.string().trim().max(120).optional().nullable(),
  // Forward-only: optional personal note from the sender.
  personalNote: z.string().trim().max(500).optional().nullable(),
  // Lead context — id of the homeowner_leads row this came from
  homeownerLeadId: z.string().uuid().optional().nullable(),
  // Property + analysis snapshot — frozen at share time
  propertyAddress: z.string().optional().nullable(),
  propertyPostcode: z.string().optional().nullable(),
  propertyUprn: z.string().optional().nullable(),
  propertyLatitude: z.number().optional().nullable(),
  propertyLongitude: z.number().optional().nullable(),
  analysisSnapshot: z.unknown(),
});
export type ShareReportRequest = z.infer<typeof ShareReportRequestSchema>;

export const ShareReportResponseSchema = z.object({
  ok: z.boolean(),
  // The URL-safe token (caller can build the link from it)
  token: z.string().optional(),
  expiresAt: z.string().optional(), // ISO
  error: z.string().optional(),
});
export type ShareReportResponse = z.infer<typeof ShareReportResponseSchema>;

// /api/reports/[token]/load — returns the snapshot the recipient page
// should render. 404 if missing, 410 if expired.
export const LoadReportResponseSchema = z.object({
  ok: z.boolean(),
  // Snapshot (same shape that wizard state holds for analysisSnapshot)
  snapshot: z.unknown().optional(),
  property: z
    .object({
      address: z.string().nullable(),
      postcode: z.string().nullable(),
      uprn: z.string().nullable(),
      latitude: z.number().nullable(),
      longitude: z.number().nullable(),
    })
    .optional(),
  // ISO timestamp the report was originally generated (= row created_at)
  createdAt: z.string().optional(),
  expiresAt: z.string().optional(),
  // For "this report has expired" UX
  expired: z.boolean().optional(),
  error: z.string().optional(),
});
export type LoadReportResponse = z.infer<typeof LoadReportResponseSchema>;
