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

// Shape returned to the client. Typed + pre-normalised so the wizard doesn't
// have to defend against weird Postcoder edge cases.
export const AddressLookupResponseSchema = z.object({
  addresses: z.array(
    z.object({
      uprn: z.string(),
      udprn: z.string().nullable(),
      summary: z.string(),
      addressLine1: z.string(),
      addressLine2: z.string().nullable(),
      postcode: z.string(),
      postTown: z.string(),
      latitude: z.number(),
      longitude: z.number(),
    })
  ),
  country: z.enum(["England", "Wales", "Scotland", "Northern Ireland"]).nullable(),
});

export type AddressLookupResponse = z.infer<typeof AddressLookupResponseSchema>;
