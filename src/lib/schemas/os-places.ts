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
 * The DPA row carries 50+ fields. Most are typed below; everything else
 * survives via `.passthrough()` so we can pivot into new fields later
 * (e.g. CLASSIFICATION_CODE_DESCRIPTION sub-codes) without a schema bump.
 */
export const OsPlacesDpaRowSchema = z
  .object({
    // ── Identifiers ─────────────────────────────────────────────────
    UPRN: z.number(),
    UDPRN: z.number().optional(),
    PARENT_UPRN: z.number().optional(),
    USRN: z.number().optional(), // Unique Street Reference Number
    TOPOGRAPHY_LAYER_TOID: z.string().optional(),

    // ── Address ─────────────────────────────────────────────────────
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
    // POST_TOWN and POSTCODE are present on every well-formed DPA row,
    // but loosened to optional so a single oddball row (occasionally
    // seen on brand-new builds before postal-routing gets registered)
    // doesn't fail the whole postcode batch via zod validation. The
    // address-lookup route fills with sensible defaults.
    POST_TOWN: z.string().optional(),
    POSTCODE: z.string().optional(),
    POSTAL_ADDRESS_CODE: z.string().optional(),
    POSTAL_ADDRESS_CODE_DESCRIPTION: z.string().optional(),
    DELIVERY_POINT_SUFFIX: z.string().optional(),

    // ── Coordinates ─────────────────────────────────────────────────
    // WGS84 — what we want. Optional defensively (see POST_TOWN above);
    // address-lookup falls back to the postcode centroid if missing.
    LAT: z.number().optional(),
    LNG: z.number().optional(),
    // OSGB easting/northing — useful for OS MasterMap pivot, kept verbatim.
    X_COORDINATE: z.number().optional(),
    Y_COORDINATE: z.number().optional(),

    // ── Classification ──────────────────────────────────────────────
    // RD = Residential Dwelling, CR = Commercial / Retail, etc.
    // RD06 specifically is "Self-Contained Flat" which is what the BUS
    // scheme excludes from the £7,500 grant unless the homeowner owns
    // the whole building.
    CLASSIFICATION_CODE: z.string().optional(),
    CLASSIFICATION_CODE_DESCRIPTION: z.string().optional(),

    // ── Status ──────────────────────────────────────────────────────
    LOGICAL_STATUS_CODE: z.union([z.string(), z.number()]).optional(),
    BLPU_STATE_CODE: z.union([z.string(), z.number()]).optional(),
    BLPU_STATE_CODE_DESCRIPTION: z.string().optional(),
    BLPU_STATE_DATE: z.string().optional(),
    LAST_UPDATE_DATE: z.string().optional(),
    ENTRY_DATE: z.string().optional(),
    STATUS: z.string().optional(),
    MATCH: z.union([z.string(), z.number()]).optional(),
    MATCH_DESCRIPTION: z.string().optional(),

    // ── Administrative geography ────────────────────────────────────
    LOCAL_CUSTODIAN_CODE: z.number().optional(),
    LOCAL_CUSTODIAN_CODE_DESCRIPTION: z.string().optional(),
    COUNTRY_CODE: z.string().optional(), // E92000001 = England, W92000004 = Wales
    COUNTRY_CODE_DESCRIPTION: z.string().optional(),
    WARD_CODE: z.string().optional(),
    PARISH_CODE: z.string().optional(),
    RPC: z.union([z.string(), z.number()]).optional(),
    LANGUAGE: z.string().optional(),
    LEGAL_NAME: z.string().optional(),
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
      epoch: z.string().optional(), // AddressBase epoch (vintage)
      lastupdate: z.string().optional(),
    })
    .passthrough()
    .optional(),
  results: z.array(OsPlacesResultSchema).optional(),
});

export type OsPlacesPostcodeResponse = z.infer<typeof OsPlacesPostcodeResponseSchema>;

/** Map an OS COUNTRY_CODE to our internal UkCountry enum. */
export function osCountryCodeToUkCountry(
  code: string | undefined
): "England" | "Wales" | "Scotland" | "Northern Ireland" | null {
  if (!code) return null;
  if (code.startsWith("E")) return "England";
  if (code.startsWith("W")) return "Wales";
  if (code.startsWith("S")) return "Scotland";
  if (code.startsWith("N")) return "Northern Ireland";
  return null;
}
