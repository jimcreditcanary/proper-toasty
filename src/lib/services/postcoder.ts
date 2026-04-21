import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import { z } from "zod";
import { PostcoderAddressSchema, type PostcoderAddress } from "@/lib/schemas/postcoder";

const POSTCODER_BASE = "https://ws.postcoder.com/pcw";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days — postcode→addresses is stable

function requireKey(): string {
  const key = process.env.POSTCODER_API_KEY;
  if (!key) throw new Error("POSTCODER_API_KEY not set");
  return key;
}

function normalisePostcode(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, "");
}

const PostcoderResponseSchema = z.array(PostcoderAddressSchema);

export async function lookupAddressesByPostcode(
  postcode: string
): Promise<PostcoderAddress[]> {
  const key = normalisePostcode(postcode);

  const cached = await cacheGet<PostcoderAddress[]>("postcoder", key);
  if (cached) return cached;

  const url = `${POSTCODER_BASE}/${encodeURIComponent(requireKey())}/address/UK/${encodeURIComponent(
    key
  )}?format=json&lines=2&addtags=uprn,udprn,latitude,longitude`;

  const res = await fetch(url);
  if (res.status === 404) return [];
  if (res.status === 429) throw new Error("Postcoder rate limit (429)");
  if (res.status === 401 || res.status === 403) {
    throw new Error("Postcoder rejected our request (auth)");
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Postcoder failed: ${res.status} ${body.slice(0, 200)}`);
  }

  const parsed = PostcoderResponseSchema.safeParse(await res.json());
  if (!parsed.success) throw new Error("Postcoder returned unexpected shape");

  await cacheSet("postcoder", key, parsed.data, TTL_SECONDS);
  return parsed.data;
}
