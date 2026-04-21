import { z } from "zod";

export const EpcSearchRowSchema = z.object({
  "lmk-key": z.string(),
  "address1": z.string().optional().default(""),
  "address2": z.string().optional().default(""),
  "address3": z.string().optional().default(""),
  "postcode": z.string().optional().default(""),
  "lodgement-date": z.string().optional().default(""),
  "current-energy-rating": z.string().optional().default(""),
  "potential-energy-rating": z.string().optional().default(""),
  "property-type": z.string().optional().default(""),
  "built-form": z.string().optional().default(""),
  "total-floor-area": z.string().optional().default(""),
});

export const EpcSearchResponseSchema = z.object({
  rows: z.array(EpcSearchRowSchema).default([]),
}).or(z.object({ rows: z.array(z.any()) })); // lenient fallback

export const EpcCertificateSchema = z.object({
  "lmk-key": z.string(),
  "address": z.string().optional().default(""),
  "postcode": z.string().optional().default(""),
  "lodgement-date": z.string().optional().default(""),
  "inspection-date": z.string().optional().default(""),
  "current-energy-rating": z.string().optional().default(""),
  "potential-energy-rating": z.string().optional().default(""),
  "current-energy-efficiency": z.string().optional().default(""),
  "property-type": z.string().optional().default(""),
  "built-form": z.string().optional().default(""),
  "construction-age-band": z.string().optional().default(""),
  "total-floor-area": z.string().optional().default(""),
  "main-fuel": z.string().optional().default(""),
  "main-heating-description": z.string().optional().default(""),
  "mains-gas-flag": z.string().optional().default(""),
  "roof-description": z.string().optional().default(""),
  "walls-description": z.string().optional().default(""),
  "windows-description": z.string().optional().default(""),
  "transaction-type": z.string().optional().default(""),
  "tenure": z.string().optional().default(""),
});

export type EpcCertificate = z.infer<typeof EpcCertificateSchema>;

export const EpcRecommendationSchema = z.object({
  "lmk-key": z.string().optional(),
  "improvement-summary-text": z.string().optional().default(""),
  "improvement-descr-text": z.string().optional().default(""),
  "indicative-cost": z.string().optional().default(""),
  "typical-saving": z.string().optional().default(""),
  "energy-performance-rating-improvement": z.string().optional().default(""),
  "improvement-id": z.string().optional().default(""),
  "improvement-id-text": z.string().optional().default(""),
});

export type EpcRecommendation = z.infer<typeof EpcRecommendationSchema>;

// Shape returned by /api/epc/by-address
export const EpcByAddressResponseSchema = z.union([
  z.object({
    found: z.literal(true),
    certificate: EpcCertificateSchema,
    recommendations: z.array(EpcRecommendationSchema),
    lodgementDate: z.string(),
    ageYears: z.number().nullable(),
  }),
  z.object({ found: z.literal(false), reason: z.string() }),
]);

export type EpcByAddressResponse = z.infer<typeof EpcByAddressResponseSchema>;
