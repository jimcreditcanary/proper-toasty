import { z } from "zod";

/**
 * OS Places API — postcode lookup response.
 *
 * Endpoint: GET https://api.os.uk/search/places/v1/postcode
 *
 * Returns a `SearchResult` envelope with a `header` (metadata) and `results`
 * (array of address rows). Each row is wrapped in a key indicating which
 * dataset it came from — DPA (Royal Mail PAF / Delivery Point Address) or
 * LPI (every UPRN incl. non-postal). We default to DPA for the homeowner
 * picker since it matches what people see on their post.
 *
 * The DPA row carries 50+ fields. We `.passthrough()` so the validator
 * doesn't drop fields we don't yet model — useful if we later want to
 * surface CLASSIFICATION_CODE (residential vs non-residential) or PARENT_UPRN
 * for flat-in-block lookups.
 */
export const OsPlacesDpaRowSchema = z
  .object({
    UPRN: z.number(),
    UDPRN: z.number().optional(),
    ADDRESS: z.string(), // Full one-liner — e.g. "FLAT 12, OLD MILL, MILL ROAD, HALIFAX, HX3 7DG"
    ORGANISATION_NAME: z.string().optional(),
    DEPARTMENT_NAME: z.string().optional(),
    SUB_BUILDING_NAME: z.string().optional(),
    BUILDING_NAME: z.string().optional(),
    BUILDING_NUMBER: z.union([z.string(), z.number()]).optional(),
    DEPENDENT_THOROUGHFARE_NAME: z.string().optional(),
    THOROUGHFARE_NAME: z.string().optional(),
    DOUBLE_DEPENDENT_LOCALITY: z.string().optional(),
    DEPENDENT_LOCALITY: z.string().optional(),
    POST_TOWN: z.string(),
    POSTCODE: z.string(),
    // WGS84 — what we want. (X_COORDINATE / Y_COORDINATE carry OSGB easting/northing.)
    LAT: z.number(),
    LNG: z.number(),
    CLASSIFICATION_CODE: z.string().optional(),
    CLASSIFICATION_CODE_DESCRIPTION: z.string().optional(),
    LOGICAL_STATUS_CODE: z.union([z.string(), z.number()]).optional(),
    PARENT_UPRN: z.number().optional(),
  })
  .passthrough();

export type OsPlacesDpaRow = z.infer<typeof OsPlacesDpaRowSchema>;

// Each result is wrapped: `{ DPA: { ...fields } }` or `{ LPI: { ...fields } }`.
// We only request DPA, but accept either shape defensively.
export const OsPlacesResultSchema = z.object({
  DPA: OsPlacesDpaRowSchema.optional(),
  LPI: OsPlacesDpaRowSchema.optional(),
});

export const OsPlacesPostcodeResponseSchema = z.object({
  header: z
    .object({
      totalresults: z.number().optional(),
      query: z.string().optional(),
      dataset: z.string().optional(),
    })
    .passthrough()
    .optional(),
  results: z.array(OsPlacesResultSchema).optional(),
});

export type OsPlacesPostcodeResponse = z.infer<typeof OsPlacesPostcodeResponseSchema>;
