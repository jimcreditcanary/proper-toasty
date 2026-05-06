// Address case normalisation.
//
// OS Places returns addresses in ALL CAPS ("19, HEREFORD ROAD, LONDON,
// W5 4SE") because that's how Royal Mail PAF stores them. Beautiful for
// envelope printers, ugly for a homeowner-facing report. Convert to
// title case for display only — the persisted address still goes in
// verbatim so we don't have to round-trip case decisions through the DB.
//
// Rules in order:
//   1. Postcode segment ("W5 4SE") stays UPPER.
//   2. Numeric house numbers stay numeric ("19", "19a", "19A").
//   3. Each comma-separated part gets title cased word by word, except
//      a small set of preserved acronyms ("UK", "PO", etc.) that stay
//      uppercase, and connectives ("of", "the", "and") that stay
//      lowercase mid-string.
//   4. Empty parts and stray double-spaces are squashed.

const PRESERVED_UPPER = new Set([
  "UK",
  "PO",
  "BFPO",
  "GB",
  "EU",
  "USA",
  // Compass abbreviations occasionally appear in PAF for street names.
  "N",
  "S",
  "E",
  "W",
  "NE",
  "NW",
  "SE",
  "SW",
]);

const PRESERVED_LOWER = new Set([
  "of",
  "the",
  "and",
  "at",
  "in",
  "on",
  "by",
  "de",
  "la",
  "le",
]);

// UK postcode regex — matches the trailing "W5 4SE" / "SW1A 1AA" /
// "GIR 0AA" segment without grabbing house numbers that happen to
// look like outward codes.
const POSTCODE_RE =
  /^(GIR ?0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

function titleCaseWord(word: string, isFirst: boolean): string {
  if (word === "") return word;
  // Numeric house numbers — keep digits, uppercase any trailing letter.
  // "19a" → "19A" so it matches what you'd write on an envelope.
  if (/^\d+[a-z]?$/i.test(word)) return word.toUpperCase();
  const upper = word.toUpperCase();
  if (PRESERVED_UPPER.has(upper)) return upper;
  const lower = word.toLowerCase();
  if (!isFirst && PRESERVED_LOWER.has(lower)) return lower;
  // Hyphenated / apostrophe'd words ("Stoke-on-Trent", "St John's") —
  // title-case each segment so the casing reads naturally.
  return lower
    .split(/([-'])/)
    .map((seg, i) => {
      if (seg === "-" || seg === "'") return seg;
      // After a hyphen we capitalise; after an apostrophe we keep
      // lowercase ("St John's", not "St John'S").
      const segIsFirst = i === 0;
      return segIsFirst || /[-]/.test(lower[i - 1] ?? "")
        ? seg.charAt(0).toUpperCase() + seg.slice(1)
        : seg;
    })
    .join("");
}

function titleCasePart(part: string): string {
  const trimmed = part.trim();
  if (trimmed === "") return "";
  // Postcode in this part? Keep it upper, run title case on the rest.
  if (POSTCODE_RE.test(trimmed)) return trimmed.toUpperCase();
  return trimmed
    .split(/\s+/)
    .map((w, i) => titleCaseWord(w, i === 0))
    .join(" ");
}

/**
 * Convert an all-caps PAF/AddressBase address into a homeowner-friendly
 * title-cased form. Preserves the postcode in upper, keeps house numbers
 * intact, and lowercases connectives mid-line.
 *
 *   "19, HEREFORD ROAD, LONDON, W5 4SE"
 *   → "19, Hereford Road, London, W5 4SE"
 */
export function titleCaseAddress(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .split(",")
    .map(titleCasePart)
    .filter(Boolean)
    .join(", ");
}
