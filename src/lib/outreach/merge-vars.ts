// Builds the TemplateModel passed to Postmark for each outreach
// send. Single source of truth for which merge variables exist —
// keeps the template-writing (Phase 6) and the send-time
// computation aligned.
//
// Variable contract (the Phase 6 templates can use any of these):
//
//   {{first_name}}              — enriched personal first name when
//                                 we have one (see m071 +
//                                 scripts/outreach/enrich-installer-names.ts),
//                                 otherwise null. Wrap usages in
//                                 {{#first_name}}…{{/first_name}}
//                                 so missing names drop cleanly via
//                                 renderSubjectVars.
//   {{company_name}}            — installers.company_name as-is
//   {{town}}                    — best fallback chain: county →
//                                 postcode area. We don't have a
//                                 dedicated town column.
//   {{region}}                  — human-readable region name
//                                 ("London", "the West Midlands")
//   {{tech_bucket_display}}     — "heat pump" / "solar PV" / etc
//   {{checkatrade_score}}       — numeric, blank when not on file
//   {{checkatrade_review_count}}— numeric, blank when not on file
//   {{google_rating}}           — numeric, blank when not on file
//   {{google_review_count}}     — numeric, blank when not on file
//   {{tier_label}}              — "Founder" / "Early Access" / "Standard"
//   {{tier_credits}}            — 300 / 100 / 30
//   {{founder_spots_remaining}} — int — for the spot-counter email
//   {{claim_url}}               — full HTTPS URL to /installer-signup
//   {{unsubscribe_url}}         — full HTTPS URL to /api/unsubscribe

import type { Database } from "@/types/database";
import {
  primaryRegion,
  primaryTechBucket,
  regionDisplayName,
  techBucketDisplayName,
  tierLabel,
  tierCredits,
  type Tier,
} from "@/lib/outreach/tier-preview";

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

export interface MergeVarInput {
  installer: InstallerRow;
  tier: Tier;
  /** Live count of remaining tier-2 (early-access) spots for this
   *  installer's (region, tech_bucket). Pre-computed by the caller. */
  founderSpotsRemaining: number;
  claimUrl: string;
  unsubscribeUrl: string;
}

/** Best-effort first name.
 *
 *  Prefers the enriched `installers.first_name` (populated by
 *  scripts/outreach/enrich-installer-names.ts via email local-part
 *  + Companies House director lookup; see migration 071).
 *
 *  Falls back to extracting the first word of the company name —
 *  the same heuristic this function has always used. This often
 *  produces awkward results ("Ealing" for "Ealing Solar Co.") but
 *  the {{#first_name}}…{{/first_name}} conditional in
 *  subject_variants protects subjects; body templates that want
 *  protection should follow the same pattern.
 *
 *  Returns `null` (NOT the string "there") when even the company-
 *  name extraction comes up empty — so the conditional can drop
 *  personalisation cleanly.
 *
 *  Accepts either a full installer-ish object or, for backwards
 *  compatibility, just the company name as a string.
 */
export function bestEffortFirstName(
  installer:
    | { first_name?: string | null; company_name: string }
    | string
    | null
    | undefined,
): string | null {
  if (installer == null) return null;
  // Legacy positional-string call signature.
  if (typeof installer === "string") {
    return companyNameFallback(installer);
  }
  if (installer.first_name && installer.first_name.trim()) {
    return installer.first_name.trim();
  }
  return companyNameFallback(installer.company_name);
}

/** Strip UK company suffixes and take the first remaining word.
 *  Returns null when nothing's left — the {{#first_name}}
 *  conditional then drops the personalisation. */
function companyNameFallback(companyName: string | null | undefined): string | null {
  if (!companyName) return null;
  const first = companyName
    .replace(/\b(limited|ltd\.?|llp|plc|co\.?|company)\b/gi, "")
    .trim()
    .split(/\s+/)[0];
  return first || null;
}

/** Town fallback chain: county → postcode area → "your area". */
function townFallback(installer: InstallerRow): string {
  if (installer.county && installer.county.trim()) {
    return installer.county.trim();
  }
  if (installer.postcode) {
    // Postcode area = letters before the digits, e.g. "SW1A 1AA" → "SW1A"
    const match = /^([A-Z]{1,2}\d[A-Z\d]?)/i.exec(installer.postcode.trim());
    if (match) return `${match[1]} area`;
  }
  return "your area";
}

export function buildMergeVars(
  input: MergeVarInput,
): Record<string, string | number | null> {
  const { installer, tier } = input;
  const region = primaryRegion(installer);
  const bucket = primaryTechBucket(installer);

  return {
    // `first_name` is intentionally nullable — the renderer drops
    // the {{#first_name}}…{{/first_name}} conditional cleanly when
    // null. Postmark TemplateModel accepts null values.
    first_name: bestEffortFirstName(installer),
    company_name: installer.company_name,
    town: townFallback(installer),
    region: region ? regionDisplayName(region) : "your area",
    tech_bucket_display: bucket ? techBucketDisplayName(bucket) : "renewables",

    // Numeric scores — emit empty string when missing so templates
    // don't render literal "null". Postmark's Mustachio renderer
    // treats empty string as truthy-empty in {{#var}} blocks.
    checkatrade_score:
      installer.checkatrade_score != null
        ? installer.checkatrade_score.toFixed(1)
        : "",
    checkatrade_review_count: installer.checkatrade_review_count ?? "",
    google_rating:
      installer.google_rating != null
        ? installer.google_rating.toFixed(1)
        : "",
    google_review_count: installer.google_review_count ?? "",

    tier_label: tierLabel(tier),
    tier_credits: tierCredits(tier),
    founder_spots_remaining: Math.max(0, input.founderSpotsRemaining),

    claim_url: input.claimUrl,
    unsubscribe_url: input.unsubscribeUrl,
  };
}
