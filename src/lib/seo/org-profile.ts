// Sitewide Organization + founder profile data.
//
// This is the single source of truth for everything that renders into
// the Organization JSON-LD block (sitewide) and the founder Person
// schema (referenced from Organization.founder and from /authors/jim-fell).
//
// All consumers should import from here rather than hard-coding the
// strings — when we add a press kit, change the registered address, or
// add a new social profile, exactly one file changes.
//
// FILL-IN GUIDANCE
// ────────────────────────────────────────────────────────────────────
//
//   The `TODO_FILL` markers below are values Jim should populate. The
//   schema component skips empty / undefined fields gracefully, so it's
//   safe to ship with placeholders — the JSON-LD just won't include
//   those properties until they're real. We DON'T want to ship fake
//   addresses or made-up social handles; partial-but-honest beats
//   plausible-but-wrong (Google flags inconsistencies between schema
//   and the live page).
//
//   Once filled in, these surface to:
//     - Google Knowledge Graph (Organization name, logo, sameAs)
//     - LinkedIn Company Page enrichment (sameAs cross-link)
//     - AI search citations ("according to Propertoasty, founded by …")

export const ORG_PROFILE = {
  // ── Core identity ─────────────────────────────────────────────────
  name: "Propertoasty",
  /** Trading / legal entity name. Used in legal-page schema + the
   *  press kit. Different from `name` only if you've registered a
   *  separate company. Leave === name when they're the same. */
  legalName: "Propertoasty",
  url: "https://www.propertoasty.com",
  /** Absolute URL. The schema component picks this up automatically;
   *  if you change the favicon path, change it here too. */
  logoPath: "/icon.svg",
  /** Short description — surfaces as Organization.description in
   *  Knowledge Graph cards. Keep under 200 chars. */
  description:
    "Free UK pre-survey for heat pumps, rooftop solar, battery storage and EV charging. Combines EPC data, Google Solar API roof analysis and floorplan vision into an installer-ready report.",
  /** ISO date — when the company / product started. Surfaces in
   *  Knowledge Graph as "founded". Update if wrong. */
  foundingDate: "2025", // TODO_FILL: replace with the actual founding year of Propertoasty

  // ── Address (optional) ────────────────────────────────────────────
  // Only emit a postal address when you've got a registered business
  // address you're happy to publish. UK home addresses should NOT go
  // here. Leave as null until there's a real registered address.
  address: null as null | {
    streetAddress?: string;
    addressLocality?: string;
    addressRegion?: string;
    postalCode?: string;
    addressCountry?: string; // ISO 3166 — "GB"
  },

  // ── Contact ───────────────────────────────────────────────────────
  contactPoint: null as null | {
    contactType: string; // e.g. "customer service"
    email?: string;
    telephone?: string;
    availableLanguage?: string;
  },

  // ── Cross-references (sameAs) ─────────────────────────────────────
  // Each `sameAs` entry is a public profile of the same organisation
  // on another platform. Google uses these to consolidate the entity
  // into a single Knowledge Graph node. Add what's real, leave
  // commented-out placeholders for what's coming.
  //
  // Common candidates:
  //   - LinkedIn company page
  //   - Crunchbase company page
  //   - Companies House profile (UK-specific signal of legitimacy)
  //   - X / Twitter
  //   - YouTube channel
  //   - Wikidata entry (once we get one)
  sameAs: [
    // TODO_FILL: add real URLs as they come online.
    // "https://www.linkedin.com/company/propertoasty",
    // "https://www.crunchbase.com/organization/propertoasty",
    // "https://find-and-update.company-information.service.gov.uk/company/<NUMBER>",
    // "https://x.com/propertoasty",
  ] as string[],

  // ── Founder profile ───────────────────────────────────────────────
  // Surfaces twice:
  //   1. As Organization.founder in the sitewide schema
  //   2. As the standalone Person schema on /authors/jim-fell
  // Keep this object aligned with what we'll show on the author bio
  // page when /authors lands (deliverable #6).
  founder: {
    /** Stable slug used in /authors/<slug> URLs. Don't change once
     *  pages are live (breaks backlinks). */
    slug: "jim-fell",
    name: "Jim Fell",
    /** Public-facing job title. */
    jobTitle: "Founder",
    /** One-paragraph bio shown on the author page + lifted into the
     *  Person schema's `description`. Keep factual, no marketing puff
     *  — LLMs read this verbatim. */
    bio: "Founder of Propertoasty. CEO of Credit Canary, a UK fintech. Building Propertoasty after spending 3 years watching homeowners get lost between energy-upgrade decisions and the MCS installer market.",
    /** Sitewide credentials / qualifications worth surfacing. Empty
     *  array is fine; Google won't penalise. Examples:
     *    - "BEng, Mechanical Engineering"
     *    - "MCS-certified, MCS #12345"
     *    - "Chartered Engineer (CEng)" */
    credentials: [] as string[],
    /** Topics this person is recognised as knowing about — Person
     *  schema field. Used by AI search to match author to query
     *  ("who is the expert on UK heat pump policy?"). */
    knowsAbout: [
      "UK heat pump policy",
      "Boiler Upgrade Scheme",
      "Solar PV in UK homes",
      "Energy Performance Certificates",
      "MCS-certified installers",
    ],
    /** sameAs for the founder — LinkedIn primarily, plus any other
     *  public identity that consolidates the entity. */
    sameAs: [
      // TODO_FILL: add Jim's LinkedIn URL once you're comfortable
      // surfacing it sitewide. Until then we ship with no sameAs;
      // the schema component drops the property entirely.
      // "https://www.linkedin.com/in/jim-fell",
    ] as string[],
    /** Public headshot URL — absolute or relative to `url`. Used in
     *  Person.image. Optional; leave null until we have a real photo. */
    image: null as string | null,
    /** Optional affiliation (Organization). */
    affiliation: {
      name: "Credit Canary",
      url: "https://www.creditcanary.com",
    } as null | { name: string; url?: string },
  },
} as const;

/** Convenience: absolute logo URL derived from ORG_PROFILE. */
export const ORG_LOGO_URL = `${ORG_PROFILE.url}${ORG_PROFILE.logoPath}`;

/** Convenience: absolute author page URL for the founder. */
export const FOUNDER_AUTHOR_URL = `${ORG_PROFILE.url}/authors/${ORG_PROFILE.founder.slug}`;
