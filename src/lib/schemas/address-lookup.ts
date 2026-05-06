import { z } from "zod";

/**
 * Rich metadata captured at address-pick time, sourced from OS Places
 * (the only address provider we use; see src/lib/services/os-places.ts).
 *
 * All fields are optional because OS Places omits empties and we'd
 * rather store `null` than fail validation. Persisted verbatim to
 * public.checks.address_metadata as a JSONB blob — migration 057.
 *
 * The `source` discriminator stays for forward compatibility: if we
 * ever add a second provider it'll go here.
 */
export const AddressMetadataSchema = z.object({
  // Always "os-places" on new writes. Kept as a free-form string so
  // legacy rows persisted by a previous Postcoder-fallback build still
  // load (we don't gate-validate stored JSONB on read).
  source: z.string(),

  // OS classification — RD* = residential, CR* = commercial, etc.
  // RD06 is "Self-Contained Flat" which is BUS-relevant.
  classificationCode: z.string().nullable().optional(),
  classificationDescription: z.string().nullable().optional(),

  // Country code — E92000001 = England, W92000004 = Wales, etc.
  // Authoritative per-property; supersedes the postcode-centroid lookup.
  countryCode: z.string().nullable().optional(),

  // Local Authority codes — `localCustodianCode` matches the LA's GSS
  // code so we can pivot into council-level planning data later.
  localCustodianCode: z.number().nullable().optional(),
  wardCode: z.string().nullable().optional(),
  parishCode: z.string().nullable().optional(),

  // Property hierarchy — when the picked address is a flat in a block,
  // parentUprn is the block's UPRN. Useful when the EPC API doesn't
  // hold a cert for the flat but does for the block.
  parentUprn: z.string().nullable().optional(),

  // OS MasterMap topography handle — pivot point for footprint / roof
  // shape / outbuilding lookups in OS Features API.
  topographyLayerToid: z.string().nullable().optional(),

  // Logical status — 1 = approved, 8 = historical. We filter to 1
  // before display so closed/demolished addresses don't surface.
  logicalStatusCode: z.number().nullable().optional(),

  // Royal Mail PAF distinguishers + dataset vintage.
  deliveryPointSuffix: z.string().nullable().optional(),
  blpuStateCode: z.number().nullable().optional(),
  lastUpdateDate: z.string().nullable().optional(),

  // OS DataHub epoch this row came from (e.g. "112"). Lets us spot
  // stale-cache issues if OS push a major release.
  epoch: z.string().nullable().optional(),

  // Full upstream payload. Lets us pivot into fields we haven't typed
  // yet without a schema migration. Keep last so JSON viewers show
  // typed fields first.
  raw: z.record(z.string(), z.unknown()).nullable().optional(),
});

export type AddressMetadata = z.infer<typeof AddressMetadataSchema>;

/**
 * Shape returned by /api/address/lookup to the client. Typed +
 * pre-normalised so the wizard doesn't need to know about OS Places
 * field naming conventions.
 *
 * Every row carries a real OS UPRN (12-digit integer) and per-property
 * WGS84 lat/lng — there is no synthetic-key path any more.
 */
export const AddressLookupResponseSchema = z.object({
  addresses: z.array(
    z.object({
      // OS Places returns a real UPRN for every row, but the type stays
      // nullable to keep downstream code (SelectedAddress, /api/checks/upsert,
      // EPC service) which already handles null defensively.
      uprn: z.string().nullable(),
      udprn: z.string().nullable(),
      summary: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string().nullable(),
      postcode: z.string(),
      postTown: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      metadata: AddressMetadataSchema.nullable().optional(),
    })
  ),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable(),
});

export type AddressLookupResponse = z.infer<typeof AddressLookupResponseSchema>;
