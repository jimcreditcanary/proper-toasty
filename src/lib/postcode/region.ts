export type UkCountry = "England" | "Wales" | "Scotland" | "Northern Ireland";

const NI_PREFIX = /^BT/i;
const SCOTLAND_PREFIXES = [
  "AB", "DD", "DG", "EH", "FK", "G", "HS", "IV", "KA", "KW", "KY",
  "ML", "PA", "PH", "TD", "ZE",
];

/**
 * Rough country guess from postcode outward code alone. Used only for a
 * pre-API-call heuristic — the authoritative answer comes from Postcodes.io
 * (which reads the official boundary data).
 */
export function guessCountryFromPostcode(postcode: string): UkCountry | null {
  const p = postcode.trim().toUpperCase().replace(/\s+/g, "");
  if (!p) return null;
  if (NI_PREFIX.test(p)) return "Northern Ireland";
  for (const prefix of SCOTLAND_PREFIXES) {
    if (p.startsWith(prefix) && /^[0-9]/.test(p.slice(prefix.length, prefix.length + 1))) {
      return "Scotland";
    }
  }
  return null;
}

export function isV1SupportedCountry(country: UkCountry): boolean {
  return country === "England" || country === "Wales";
}
