// Pure ranking helpers for the installer claim search.
//
// The `/installer-signup` page lets a user find their MCS-listed
// company by name (or jump straight to it via Companies House number).
// We want a forgiving search so typos and "Acme" vs "Acme Heating Ltd"
// both turn up the right row, but a clear preference order so the
// likely match floats to the top.
//
// Ranking is `starts-with > contains`. Inside each bucket, shorter
// names win — they're closer to the query in length, less likely to
// be a long company name where the query happens to appear.
//
// Kept here as a pure function so it can be unit-tested without
// hitting the database, and reused if we ever expose this search
// elsewhere (admin tooling, F3 review queue).

export interface RankableInstaller {
  id: number;
  companyName: string;
  // Allow extra fields without forcing the test fixtures to invent
  // them — only `companyName` matters for ranking.
  [k: string]: unknown;
}

// Detect Companies House numbers (8 digits, optionally with leading
// letters like "SC123456" for Scottish companies, "NI" for NI). The
// search box accepts these and short-circuits to an exact lookup
// against `installers.company_number`.
const CH_NUMBER_REGEX = /^[A-Z]{0,2}\d{6,8}$/;

export function isCompanyNumber(query: string): boolean {
  const cleaned = query.trim().toUpperCase().replace(/\s+/g, "");
  return CH_NUMBER_REGEX.test(cleaned);
}

export function normaliseCompanyNumber(query: string): string {
  return query.trim().toUpperCase().replace(/\s+/g, "");
}

// Normalise both sides for matching: lowercase, collapse whitespace,
// strip the common trailing suffixes that users often skip
// ("Ltd", "Limited", "Inc", "PLC").
function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\b(ltd|limited|plc|inc|llp|llc)\.?$/i, "")
    .trim();
}

export interface RankedMatch<T extends RankableInstaller> {
  installer: T;
  matchKind: "starts-with" | "contains";
}

// Take an unsorted batch of candidates (pulled by `ILIKE %q%` from
// the DB) and rank them by how well they match the query. Returns
// at most `limit` results. Stable sort within each bucket — the DB
// passes us results in a deterministic order and we preserve it.
export function rankByName<T extends RankableInstaller>(
  query: string,
  candidates: T[],
  limit = 5,
): RankedMatch<T>[] {
  const q = normaliseName(query);
  if (q.length === 0) return [];

  const startsWith: RankedMatch<T>[] = [];
  const contains: RankedMatch<T>[] = [];

  for (const c of candidates) {
    const name = normaliseName(c.companyName);
    if (name.startsWith(q)) {
      startsWith.push({ installer: c, matchKind: "starts-with" });
    } else if (name.includes(q)) {
      contains.push({ installer: c, matchKind: "contains" });
    }
  }

  // Inside each bucket, shorter names win — closer to the query.
  const byLength = (a: RankedMatch<T>, b: RankedMatch<T>) =>
    a.installer.companyName.length - b.installer.companyName.length;
  startsWith.sort(byLength);
  contains.sort(byLength);

  return [...startsWith, ...contains].slice(0, limit);
}
