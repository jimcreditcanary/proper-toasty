import { cacheGet, cacheSet } from "@/lib/services/api-cache";
import {
  EpcCertificateSchema,
  EpcRecommendationSchema,
  type EpcByAddressResponse,
  type EpcCertificate,
  type EpcRecommendation,
} from "@/lib/schemas/epc";

const EPC_BASE = "https://epc.opendatacommunities.org/api/v1";
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days

function requireKey(): string {
  const key = process.env.EPC_API_KEY;
  if (!key) throw new Error("EPC_API_KEY not set");
  return key;
}

function authHeaders(): Record<string, string> {
  return {
    Authorization: `Basic ${requireKey()}`,
    Accept: "application/json",
  };
}

function normalisePostcode(p: string): string {
  return p.trim().toUpperCase().replace(/\s+/g, "");
}

function normaliseForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\b(flat|apartment|apt|unit|house|the)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchScore(a: string, b: string): number {
  const na = normaliseForMatch(a);
  const nb = normaliseForMatch(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (nb.startsWith(na) || na.startsWith(nb)) return 0.9;
  if (nb.includes(na) || na.includes(nb)) return 0.8;

  // Token-set overlap.
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  const shared = [...ta].filter((t) => tb.has(t)).length;
  const denom = Math.max(ta.size, tb.size);
  return denom === 0 ? 0 : shared / denom;
}

function yearsBetween(iso: string, now = new Date()): number | null {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  const ms = now.getTime() - d.getTime();
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

interface SearchByPostcodeResult {
  lmkKey: string;
  lodgementDate: string;
  address1: string;
}

async function searchByPostcode(postcode: string): Promise<SearchByPostcodeResult[]> {
  const url = new URL(`${EPC_BASE}/domestic/search`);
  url.searchParams.set("postcode", normalisePostcode(postcode));
  url.searchParams.set("size", "100");

  const res = await fetch(url.toString(), { headers: authHeaders() });
  if (res.status === 404 || res.status === 204) return [];
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`EPC search failed: ${res.status} ${body.slice(0, 200)}`);
  }

  // EPC returns JSON with a "rows" array. Each row is an object with hyphenated keys.
  const json = (await res.json()) as { rows?: Array<Record<string, string>> };
  const rows = json.rows ?? [];
  return rows
    .map((r) => ({
      lmkKey: r["lmk-key"] ?? "",
      lodgementDate: r["lodgement-date"] ?? "",
      address1: [r["address1"], r["address2"], r["address3"]].filter(Boolean).join(" ").trim(),
    }))
    .filter((r) => r.lmkKey);
}

async function getCertificate(lmkKey: string): Promise<EpcCertificate | null> {
  const cached = await cacheGet<EpcCertificate>("epc:cert", lmkKey);
  if (cached) return cached;

  const res = await fetch(`${EPC_BASE}/domestic/certificate/${encodeURIComponent(lmkKey)}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`EPC cert failed: ${res.status}`);

  const json = (await res.json()) as { rows?: Array<Record<string, string>> };
  const row = json.rows?.[0];
  if (!row) return null;
  const parsed = EpcCertificateSchema.safeParse(row);
  if (!parsed.success) throw new Error("EPC cert returned unexpected shape");

  await cacheSet("epc:cert", lmkKey, parsed.data, TTL_SECONDS);
  return parsed.data;
}

async function getRecommendations(lmkKey: string): Promise<EpcRecommendation[]> {
  const cached = await cacheGet<EpcRecommendation[]>("epc:recs", lmkKey);
  if (cached) return cached;

  const res = await fetch(
    `${EPC_BASE}/domestic/recommendations/${encodeURIComponent(lmkKey)}`,
    { headers: authHeaders() }
  );
  if (res.status === 404 || res.status === 204) return [];
  if (!res.ok) throw new Error(`EPC recs failed: ${res.status}`);

  const json = (await res.json()) as { rows?: Array<Record<string, string>> };
  const rows = json.rows ?? [];
  const out = rows
    .map((r) => EpcRecommendationSchema.safeParse(r))
    .filter((p) => p.success)
    .map((p) => p.data);

  await cacheSet("epc:recs", lmkKey, out, TTL_SECONDS);
  return out;
}

export async function getEpcByAddress(
  postcode: string,
  addressLine1: string
): Promise<EpcByAddressResponse> {
  const candidates = await searchByPostcode(postcode);
  if (candidates.length === 0) {
    return { found: false, reason: "No EPC lodged at this postcode." };
  }

  // Pick best address match. Tie-break by most recent lodgement date.
  const scored = candidates
    .map((c) => ({ ...c, score: matchScore(addressLine1, c.address1) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (b.lodgementDate || "").localeCompare(a.lodgementDate || "");
    });

  const best = scored[0];
  // Demand a reasonable match — below 0.5 we'd rather say "not found" than
  // confidently attach the wrong EPC.
  if (!best || best.score < 0.5) {
    return { found: false, reason: "No EPC matches this address closely enough." };
  }

  const [certificate, recommendations] = await Promise.all([
    getCertificate(best.lmkKey),
    getRecommendations(best.lmkKey),
  ]);

  if (!certificate) {
    return { found: false, reason: "EPC certificate could not be fetched." };
  }

  return {
    found: true,
    certificate,
    recommendations,
    lodgementDate: certificate["lodgement-date"] || best.lodgementDate,
    ageYears: yearsBetween(certificate["lodgement-date"] || best.lodgementDate),
  };
}
