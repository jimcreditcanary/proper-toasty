import { z } from "zod";

/**
 * Schemas for the GOV.UK Energy Performance Certificate API
 * (https://get-energy-performance-data.communities.gov.uk).
 *
 * Search endpoint returns camelCase rows; the single-certificate fetch returns
 * snake_case fields. We normalise to a single `EpcCertificate` shape before
 * surfacing to the rest of the app.
 */

// Raw search-row shape (camelCase, from /api/domestic/search)
export const EpcSearchRowSchema = z.object({
  certificateNumber: z.string(),
  uprn: z.number().nullable().optional(),
  addressLine1: z.string().optional().default(""),
  addressLine2: z.string().nullable().optional().default(""),
  addressLine3: z.string().nullable().optional().default(""),
  addressLine4: z.string().nullable().optional().default(""),
  postcode: z.string().optional().default(""),
  postTown: z.string().optional().default(""),
  council: z.string().optional().default(""),
  constituency: z.string().optional().default(""),
  currentEnergyEfficiencyBand: z.string().optional().default(""),
  registrationDate: z.string().optional().default(""),
});
export type EpcSearchRow = z.infer<typeof EpcSearchRowSchema>;

export const EpcSearchResponseSchema = z.object({
  data: z.array(EpcSearchRowSchema).default([]),
  pagination: z
    .object({
      totalRecords: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional(),
      pageSize: z.number().optional(),
    })
    .optional(),
});

// Raw certificate fetch shape (snake_case, from /api/certificate).
// The API note says "structure varies by certificate type and schema version"
// — we take a lenient shape and let zod drop unknown fields.
export const EpcCertificateRawSchema = z
  .object({
    certificate_number: z.string().optional(),
    uprn: z.union([z.number(), z.string()]).nullable().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().nullable().optional(),
    address_line_3: z.string().nullable().optional(),
    address_line_4: z.string().nullable().optional(),
    post_town: z.string().optional(),
    postcode: z.string().optional(),
    assessment_type: z.string().optional(),
    council: z.string().optional(),
    constituency: z.string().optional(),
    current_energy_efficiency_band: z.string().optional(),
    potential_energy_efficiency_band: z.string().optional(),
    current_energy_efficiency_rating: z.number().optional(),
    property_type: z.string().optional(),
    built_form: z.string().optional(),
    construction_age_band: z.string().optional(),
    total_floor_area: z.union([z.number(), z.string()]).optional(),
    main_fuel: z.string().optional(),
    main_heating_description: z.string().optional(),
    mains_gas_flag: z.string().optional(),
    transaction_type: z.string().optional(),
    registration_date: z.string().optional(),
  })
  .passthrough();

export const EpcCertificateResponseSchema = z.object({
  data: EpcCertificateRawSchema,
});

/**
 * Normalised cert we expose to the rest of the app. Kept similar to the
 * shape the old Basic-auth API returned so the eligibility engine didn't need
 * a full rewrite — but most detail fields are now optional because the new
 * API returns a narrower set by default.
 */
export const EpcCertificateSchema = z.object({
  certificateNumber: z.string(),
  uprn: z.string().nullable(),
  address: z.string(),
  postcode: z.string().nullable(),
  registrationDate: z.string().nullable(),
  currentEnergyBand: z.string().nullable(),
  potentialEnergyBand: z.string().nullable(),
  currentEnergyRating: z.number().nullable(),
  propertyType: z.string().nullable(),
  builtForm: z.string().nullable(),
  constructionAgeBand: z.string().nullable(),
  totalFloorAreaM2: z.number().nullable(),
  mainFuel: z.string().nullable(),
  mainHeatingDescription: z.string().nullable(),
  mainsGasFlag: z.string().nullable(),
  transactionType: z.string().nullable(),
  council: z.string().nullable(),
});
export type EpcCertificate = z.infer<typeof EpcCertificateSchema>;

// Shape returned by /api/epc/by-address
export const EpcByAddressResponseSchema = z.union([
  z.object({
    found: z.literal(true),
    matchMethod: z.enum(["uprn", "postcode+address"]),
    certificate: EpcCertificateSchema,
    registrationDate: z.string(),
    ageYears: z.number().nullable(),
  }),
  z.object({ found: z.literal(false), reason: z.string() }),
]);

export type EpcByAddressResponse = z.infer<typeof EpcByAddressResponseSchema>;
