import { z } from "zod";

/**
 * Postcoder /address/UK/{postcode} response row. All fields are optional because
 * Postcoder omits empty keys; we normalise to an empty string / null at the
 * service layer.
 */
export const PostcoderAddressSchema = z.object({
  summaryline: z.string().optional().default(""),
  addressline1: z.string().optional().default(""),
  addressline2: z.string().optional().default(""),
  organisation: z.string().optional().default(""),
  buildingname: z.string().optional().default(""),
  subbuildingname: z.string().optional().default(""),
  premise: z.string().optional().default(""),
  street: z.string().optional().default(""),
  dependentlocality: z.string().optional().default(""),
  posttown: z.string().optional().default(""),
  county: z.string().optional().default(""),
  postcode: z.string().optional().default(""),
  uprn: z.string().optional().default(""),
  udprn: z.string().optional().default(""),
  latitude: z.string().optional().default(""),
  longitude: z.string().optional().default(""),
});

export type PostcoderAddress = z.infer<typeof PostcoderAddressSchema>;

// Rich metadata captured at address-pick time. Populated from the
// underlying provider (OS Places when configured, Postcoder otherwise).
// All fields are optional because the Postcoder fallback path can't fill
// most of them — null is a legitimate signal of "we don't know" and the
// rest of the app must handle it gracefully.
//
// Persisted to public.checks.address_metadata as a JSONB blob — see
// supabase/migrations/057_checks_address_metadata.sql for the column.
export const AddressMetadataSchema = z.object({
  source: z.enum(["os-places", "postcoder"]),

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

// Shape returned to the client. Typed + pre-normalised so the wizard doesn't
// have to defend against weird Postcoder edge cases.
//
// `uprn` is nullable — Postcoder only returns UPRNs on plans that include
// the OS AddressBase addtag. PAF-only plans return `null` for every row.
// Downstream services (EPC, OS) MUST treat null as "no UPRN, fall back
// to postcode + address matching" rather than synthesising a placeholder.
export const AddressLookupResponseSchema = z.object({
  addresses: z.array(
    z.object({
      uprn: z.string().nullable(),
      udprn: z.string().nullable(),
      summary: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string().nullable(),
      postcode: z.string(),
      postTown: z.string(),
      latitude: z.number(),
      longitude: z.number(),
      // Per-row rich metadata from OS Places (or null when on the
      // Postcoder fallback path with no equivalent fields).
      metadata: AddressMetadataSchema.nullable().optional(),
    })
  ),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable(),
});

export type AddressLookupResponse = z.infer<typeof AddressLookupResponseSchema>;
