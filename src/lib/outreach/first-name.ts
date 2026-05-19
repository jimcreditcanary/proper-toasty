// First-name enrichment helpers.
//
// Two layers:
//
//   1. Pure heuristics over an email local-part. Splits on
//      `.`, `_`, `-` and accepts the first token if it looks like a
//      plain alphabetic name. Skips role-account addresses entirely
//      (info@, sales@, careers@, etc).
//
//   2. Officer-list parsing for Companies House `/officers`
//      responses — picks the most-recently-appointed active
//      director and pulls the first name out of "SURNAME, Forename"
//      style strings.
//
// Both layers are pure and side-effect-free so they're trivial to
// unit-test. The orchestrating script
// `scripts/outreach/enrich-installer-names.ts` glues them together
// with a Claude fallback for ambiguous local-parts.
//
// Sanity rules (applied by `sanitiseFirstName`): reject numerics,
// single letters, > 30 chars, and all-caps tokens > 3 chars. The
// successful output is always title-cased so persisted values are
// consistent regardless of source casing.

/** Role-account local-parts we never extract a name from. Case-
 *  insensitive. The `info\d*` / `contact\d*` patterns catch
 *  `info1`, `contact-eu`, etc. */
const ROLE_ACCOUNT_RE =
  /^(info|contact|hello|hi|admin|sales|support|enquiries?|enquiry|office|team|ask|help|service|services|reception|accounts?|finance|billing|noreply|no-reply|donotreply|do-not-reply|mail|email|news|marketing|customers?|customerservice|jobs|careers|hr|talent|press|media|web|webmaster|postmaster|abuse|security|notifications|alert|alerts|do_not_reply|info\d*|contact\d*)$/i;

/** Plain-name regex — letters (incl. apostrophe + hyphen for names
 *  like O'Brien, Mary-Jane), 2 to 30 chars. */
const NAME_RE = /^[A-Za-z][A-Za-z'\-]{1,29}$/;

export interface LocalPartExtraction {
  /** The plain first-name candidate, lowercased — caller is expected
   *  to title-case via `sanitiseFirstName`. Null when no candidate. */
  candidate: string | null;
  /** When true, the local-part needs an LLM disambiguation pass
   *  (e.g. "jamesfell"). The caller decides whether to invoke
   *  Claude or bail. */
  needsLlm: boolean;
  /** When true, the local-part is a role account and should bypass
   *  step (a) entirely — caller falls through to step (b). */
  isRoleAccount: boolean;
}

/** Pull the local-part out of an email. Returns null if not a
 *  parseable email. Lower-cases the local-part. */
export function extractLocalPart(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at <= 0 || at === email.length - 1) return null;
  return email.slice(0, at).trim().toLowerCase();
}

/** Decide what to do with the local-part of an installer email.
 *
 *  Order:
 *    1. Reject role accounts (info@, sales@, etc) → isRoleAccount.
 *    2. Split on `.`, `_`, `-`; if the first token looks like a
 *       name → return it. ("james.fell" → "james";
 *       "mary-jane.smith" → "mary"? — see note below.)
 *    3. If the local-part is a single un-delimited token of 4+
 *       chars (e.g. "jamesfell"), flag for LLM disambiguation.
 *    4. Otherwise → null candidate, no LLM (e.g. "j", "ab12cd").
 *
 *  Note on hyphen splitting: we split on `-` for the dotted-form
 *  case ("james-fell" → "james") at the cost of "mary-jane" → "mary".
 *  In practice MCS-installer emails are rarely hyphenated personal
 *  names; if this becomes a problem we tighten the rule later.
 */
export function classifyLocalPart(localPart: string): LocalPartExtraction {
  const lp = localPart.trim().toLowerCase();
  if (!lp) {
    return { candidate: null, needsLlm: false, isRoleAccount: false };
  }
  if (ROLE_ACCOUNT_RE.test(lp)) {
    return { candidate: null, needsLlm: false, isRoleAccount: true };
  }

  // Split on `.`, `_`, `-`. Take the first non-empty segment.
  const parts = lp.split(/[._-]+/).filter(Boolean);
  const first = parts[0] ?? "";

  if (parts.length >= 2 && NAME_RE.test(first)) {
    // Confident delimited extraction — "james.fell" → "james".
    return { candidate: first, needsLlm: false, isRoleAccount: false };
  }

  if (parts.length === 1 && NAME_RE.test(first) && first.length >= 4) {
    // Single un-delimited token — could be "james" (clear) or
    // "jamesfell" (compound). Defer the decision to the caller; if
    // the token is itself a recognised first name the LLM will
    // confirm it.
    return { candidate: first, needsLlm: true, isRoleAccount: false };
  }

  // Single very-short token, or weird shapes ("j", "user1", "...")
  return { candidate: null, needsLlm: false, isRoleAccount: false };
}

// ─── Companies House officers ─────────────────────────────────────

export interface OfficerLite {
  /** Raw `name` field from the CH officers API — usually
   *  "SMITH, John Q" style for natural persons. */
  name: string;
  officer_role?: string;
  appointed_on?: string | null;
  resigned_on?: string | null;
}

export interface OfficersResponse {
  items?: OfficerLite[];
}

/** Parse a CH officer `name` field into a best-effort first name.
 *  Returns null if the shape isn't "SURNAME, Forename …". */
export function parseOfficerFirstName(name: string | undefined | null): string | null {
  if (!name) return null;
  const comma = name.indexOf(",");
  if (comma <= 0) return null;
  // After the comma: forenames + middle names, space-delimited. Take
  // the first whitespace-separated chunk. Strip honorifics that
  // sometimes prefix the name ("Dr ", "Mr ", "Mrs " etc).
  const forenames = name.slice(comma + 1).trim();
  if (!forenames) return null;
  const tokens = forenames.split(/\s+/);
  // Skip a leading honorific token if present.
  const HONORIFICS = new Set([
    "mr",
    "mrs",
    "ms",
    "miss",
    "mx",
    "dr",
    "prof",
    "sir",
    "dame",
    "rev",
    "the",
  ]);
  let i = 0;
  while (i < tokens.length && HONORIFICS.has(tokens[i].toLowerCase().replace(/\.$/, ""))) {
    i += 1;
  }
  const first = tokens[i] ?? "";
  if (!first) return null;
  // Strip trailing punctuation, accept the same name-shape rules as
  // the local-part extractor.
  const cleaned = first.replace(/[^A-Za-z'\-]/g, "");
  if (!NAME_RE.test(cleaned)) return null;
  return cleaned.toLowerCase();
}

/** Officer roles that represent decision-making principals at a UK
 *  company. Per the Companies House public-data API, every active
 *  company/LLP must have at least one of these on file — so a CH
 *  response with no match here is the canary that our filter is
 *  too narrow.
 *
 *  Included:
 *    - director / corporate-director — Ltd company principals
 *    - llp-member / llp-designated-member — LLP equivalents
 *    - corporate-llp-member /
 *      corporate-llp-designated-member — corporate LLP members
 *
 *  Deliberately excluded:
 *    - secretary / corporate-secretary — administrative, not the
 *      "who runs this" answer we want for outreach copy
 *    - nominee-director / nominee-secretary — placeholders for
 *      another entity; a real director should exist on the same
 *      filing, so falling through to a nominee would hide a bug
 *      in the upstream data rather than help with personalisation
 *    - judicial-factor, receiver, etc. — administrative roles
 *      that don't represent the business
 */
const PRINCIPAL_OFFICER_ROLES = new Set<string>([
  "director",
  "corporate-director",
  "llp-member",
  "llp-designated-member",
  "corporate-llp-member",
  "corporate-llp-designated-member",
]);

/** From a CH `/officers` payload, pick the active principal whose
 *  first name we use:
 *
 *    - filter to PRINCIPAL_OFFICER_ROLES (above) AND resigned_on is null
 *    - sole survivor → return them
 *    - multiple → return the one with the latest appointed_on
 *    - none → null
 *
 *  Earlier (over-narrow) version only accepted `officer_role === "director"`,
 *  which rejected every LLP filing and forced ~58% of installers to
 *  fall through to NULL — caught in the first dry-run of the
 *  enrichment script. PRINCIPAL_OFFICER_ROLES widens the net to the
 *  canonical list of decision-making roles.
 */
export function pickPrimaryDirector(officers: OfficerLite[] | undefined): OfficerLite | null {
  if (!officers || officers.length === 0) return null;
  const active = officers.filter(
    (o) =>
      typeof o.officer_role === "string" &&
      PRINCIPAL_OFFICER_ROLES.has(o.officer_role.toLowerCase()) &&
      !o.resigned_on,
  );
  if (active.length === 0) return null;
  if (active.length === 1) return active[0];
  // Sort by appointed_on desc — undefined dates sort last.
  const sorted = [...active].sort((a, b) => {
    const ad = a.appointed_on ? Date.parse(a.appointed_on) : 0;
    const bd = b.appointed_on ? Date.parse(b.appointed_on) : 0;
    return bd - ad;
  });
  return sorted[0];
}

// ─── Sanity + normalisation ───────────────────────────────────────

/** Reject obviously-bad candidates and title-case the rest.
 *
 *  Rejection rules (any one fails → null):
 *    - empty or null
 *    - contains a digit anywhere
 *    - length < 2 or > 30
 *    - all-caps and longer than 3 chars (treats acronyms like
 *      "ABCD" as garbage; preserves "JO" / "AL" since some short
 *      forenames are uppercase-styled)
 */
export function sanitiseFirstName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/\d/.test(trimmed)) return null;
  if (trimmed.length < 2 || trimmed.length > 30) return null;
  // All-caps + > 3 chars → reject (probably an acronym, not a name).
  if (trimmed.length > 3 && trimmed === trimmed.toUpperCase()) return null;
  // Title-case (handles "james" → "James", "MARY-JANE" → "Mary-Jane",
  // "o'brien" → "O'Brien").
  const titled = trimmed
    .toLowerCase()
    .replace(/(^|[-'\s])([a-z])/g, (_m, sep, ch) => `${sep}${ch.toUpperCase()}`);
  return titled;
}
