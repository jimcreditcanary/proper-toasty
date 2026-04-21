import { z } from "zod";
import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import type { PostcodeValidateResponse } from "@/lib/schemas/postcodes";
import type { UkCountry } from "@/lib/postcode/region";

const POSTCODES_BASE = "https://api.postcodes.io";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

const PostcodesIoRawSchema = z.object({
  status: z.number(),
  result: z
    .object({
      postcode: z.string(),
      country: z.string(),
      admin_district: z.string().nullable().optional(),
      region: z.string().nullable().optional(),
      latitude: z.number().nullable().optional(),
      longitude: z.number().nullable().optional(),
    })
    .nullable(),
});

function normaliseCountry(raw: string): UkCountry {
  if (raw === "England") return "England";
  if (raw === "Wales") return "Wales";
  if (raw === "Scotland") return "Scotland";
  if (raw === "Northern Ireland") return "Northern Ireland";
  throw new Error(`Unexpected country from Postcodes.io: ${raw}`);
}

function cacheKey(postcode: string): string {
  return postcode.trim().toUpperCase().replace(/\s+/g, "");
}

export async function validatePostcode(
  postcode: string
): Promise<PostcodeValidateResponse | null> {
  const key = cacheKey(postcode);

  const cached = await cacheGet<PostcodeValidateResponse>("postcodes", key);
  if (cached) return cached;

  const res = await fetch(`${POSTCODES_BASE}/postcodes/${encodeURIComponent(key)}`);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Postcodes.io failed: ${res.status}`);
  }

  const parsed = PostcodesIoRawSchema.safeParse(await res.json());
  if (!parsed.success || !parsed.data.result) return null;

  const r = parsed.data.result;
  const out: PostcodeValidateResponse = {
    postcode: r.postcode,
    country: normaliseCountry(r.country),
    adminDistrict: r.admin_district ?? null,
    region: r.region ?? null,
    latitude: r.latitude ?? null,
    longitude: r.longitude ?? null,
  };

  await cacheSet("postcodes", key, out, TTL_SECONDS);
  return out;
}
