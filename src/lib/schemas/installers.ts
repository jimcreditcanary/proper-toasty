import { z } from "zod";

// Public-facing schemas for the installer directory.
//
// What we expose to the client is a subset of the full DB row — no
// internal company-house match audit fields, no raw scrape strings.

export const InstallerCardSchema = z.object({
  id: z.number().int().positive(),
  companyName: z.string(),
  certificationBody: z.string(),
  certificationNumber: z.string(),

  // Contact (optional — phone/website not always present)
  email: z.string().nullable(),
  telephone: z.string().nullable(),
  website: z.string().nullable(),

  // Address — surface postcode + town/county for the tile
  postcode: z.string().nullable(),
  county: z.string().nullable(),
  addressSummary: z.string().nullable(),

  // Capabilities — only the four we actually filter on
  busRegistered: z.boolean(),
  capHeatPump: z.boolean(),         // any flavour of HP
  capSolarPv: z.boolean(),
  capBatteryStorage: z.boolean(),

  // Distance back from the API (km, rounded to 1dp)
  distanceKm: z.number().nullable(),

  // Reviews — placeholder for the future build
  reviewsScore: z.number().min(0).max(5),
  reviewsCount: z.number().int().min(0),

  // Migration 031 enrichments
  yearsInBusiness: z.number().int().nullable(),
  incorporationYear: z.number().int().nullable(),
  // Checkatrade — null = no review data (yet, or never matched)
  checkatradeScore: z.number().min(0).max(5).nullable(),
  checkatradeReviewCount: z.number().int().min(0).nullable(),
  checkatradeUrl: z.string().nullable(),

  // Whether the current homeowner has already booked a meeting with
  // this installer (used to move the tile into the "contacted" section
  // above the main grid).
  contactedByMe: z.boolean(),
});
export type InstallerCard = z.infer<typeof InstallerCardSchema>;

// Request body for /api/installers/nearby
export const NearbyInstallersRequestSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
  // Capability filters — at least one must be true. The UI passes the
  // user's report selection through (hasHeatPump / hasSolar / hasBattery).
  wantsHeatPump: z.boolean().default(false),
  wantsSolar: z.boolean().default(false),
  wantsBattery: z.boolean().default(false),
  // Pagination
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(50).default(10),
  // Search radius cap in km — defaults to 80 (covers most of England
  // from anywhere). Set higher if the user has no installers nearby.
  maxDistanceKm: z.number().positive().max(500).default(80),
  // Optional homeowner_lead_id so the response can flag installers
  // the user has already booked a meeting with (contactedByMe=true).
  homeownerLeadId: z.string().uuid().optional().nullable(),
});
export type NearbyInstallersRequest = z.infer<typeof NearbyInstallersRequestSchema>;

export const NearbyInstallersResponseSchema = z.object({
  ok: z.boolean(),
  installers: z.array(InstallerCardSchema),
  totalCount: z.number().int().min(0),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  error: z.string().optional(),
});
export type NearbyInstallersResponse = z.infer<typeof NearbyInstallersResponseSchema>;

// ─── Booking form ───────────────────────────────────────────────────────────

export const CreateInstallerLeadRequestSchema = z.object({
  installerId: z.number().int().positive(),
  // Contact
  contactEmail: z.string().email("Please enter a valid email"),
  contactName: z.string().trim().min(1, "Please tell us your name").max(120),
  contactPhone: z.string().trim().max(40).optional().nullable(),
  preferredContactMethod: z
    .enum(["email", "phone", "whatsapp", "any"])
    .optional()
    .nullable(),
  preferredContactWindow: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
  // What they want
  wantsHeatPump: z.boolean().default(false),
  wantsSolar: z.boolean().default(false),
  wantsBattery: z.boolean().default(false),
  // Property snapshot — passed through from wizard state
  homeownerLeadId: z.string().uuid().optional().nullable(),
  propertyAddress: z.string().optional().nullable(),
  propertyPostcode: z.string().optional().nullable(),
  propertyUprn: z.string().optional().nullable(),
  propertyLatitude: z.number().optional().nullable(),
  propertyLongitude: z.number().optional().nullable(),
  analysisSnapshot: z.unknown().optional().nullable(),
});
export type CreateInstallerLeadRequest = z.infer<
  typeof CreateInstallerLeadRequestSchema
>;

export const CreateInstallerLeadResponseSchema = z.object({
  ok: z.boolean(),
  id: z.string().uuid().optional(),
  error: z.string().optional(),
});
export type CreateInstallerLeadResponse = z.infer<
  typeof CreateInstallerLeadResponseSchema
>;
