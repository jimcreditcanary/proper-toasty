import { z } from "zod";

// Lead capture schema — what the client sends to /api/leads/capture when
// the user submits the email form between analysis and report.
//
// analysisSnapshot is intentionally permissive (z.unknown) because the
// AnalyseResponse shape evolves; we store it verbatim for later replay
// without re-running the pipeline.

export const LeadCaptureRequestSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  name: z.string().trim().max(120).optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  address: z.string().optional().nullable(),
  postcode: z.string().optional().nullable(),
  uprn: z.string().optional().nullable(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  consentMarketing: z.boolean().default(false),
  consentInstallerMatching: z.boolean().default(false),
  analysisSnapshot: z.unknown().optional().nullable(),
});
export type LeadCaptureRequest = z.infer<typeof LeadCaptureRequestSchema>;

export const LeadCaptureResponseSchema = z.object({
  ok: z.boolean(),
  id: z.string().uuid().optional(),
  error: z.string().optional(),
});
export type LeadCaptureResponse = z.infer<typeof LeadCaptureResponseSchema>;
