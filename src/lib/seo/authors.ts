// Author registry — typed source of truth for everyone whose name
// appears on an article byline. Used by:
//
//   - AuthorByline component (visible byline on every guide)
//   - Person JSON-LD on /authors/[slug] pages
//   - Article JSON-LD's `author` and `reviewedBy` fields
//   - llms.txt's "authored by" lines when those land
//
// The founder (Jim) lives in org-profile.ts because his record powers
// the sitewide Organization.founder block too. Everyone else — MCS
// installers acting as reviewers, future contributors — lives here.
//
// CONVENTIONS
// ────────────────────────────────────────────────────────────────────
//
//   slug:          stable, kebab-case. NEVER changes once live (it's
//                  in the URL). Use first-name-last-name.
//   role:          "founder" | "reviewer" | "contributor". Drives how
//                  the byline renders (primary author vs "reviewed by").
//   credentials:   "MCS #12345" / "Chartered Engineer" / "BEng" etc.
//                  Surfaces verbatim next to the name — accuracy matters,
//                  Google's E-E-A-T weighting reads this.
//   mcsCertificateNumber: separate from `credentials` because we
//                  cross-link to mcscertified.com/find-an-installer to
//                  let LLMs verify the credential is real.

import { ORG_PROFILE } from "./org-profile";

export type AuthorRole = "founder" | "reviewer" | "contributor";

export interface AuthorProfile {
  slug: string;
  name: string;
  role: AuthorRole;
  /** One-line title shown under the name, e.g. "Founder, Propertoasty". */
  jobTitle: string;
  /** Free-text bio shown on /authors/[slug] and lifted into
   *  Person.description in the schema. 60–200 words ideal. */
  bio: string;
  /** Credentials shown after the name, e.g. ["MCS #12345", "MEng"]. */
  credentials: string[];
  /** When present, we cross-link to the MCS public register so the
   *  credential is verifiable. Drives a "View MCS verification" link
   *  on the author page + a schema.org `identifier` field. */
  mcsCertificateNumber: string | null;
  /** Org the author primarily represents (their installer company,
   *  consultancy, etc.). Optional. */
  affiliation: { name: string; url?: string } | null;
  /** Topics this person is recognised as expert on. Used by AI search
   *  to match author to query. */
  knowsAbout: string[];
  /** External profile URLs that consolidate the identity (LinkedIn,
   *  company website, etc.). */
  sameAs: string[];
  /** Headshot — absolute URL or path relative to site root. */
  image: string | null;
}

/**
 * The founder (Jim) is mirrored from ORG_PROFILE so we don't maintain
 * the same person in two places. Other authors get their own entry.
 */
export const AUTHORS: Record<string, AuthorProfile> = {
  [ORG_PROFILE.founder.slug]: {
    slug: ORG_PROFILE.founder.slug,
    name: ORG_PROFILE.founder.name,
    role: "founder",
    jobTitle: `${ORG_PROFILE.founder.jobTitle}, ${ORG_PROFILE.name}`,
    bio: ORG_PROFILE.founder.bio,
    credentials: [...ORG_PROFILE.founder.credentials],
    mcsCertificateNumber: null,
    affiliation: ORG_PROFILE.founder.affiliation
      ? { ...ORG_PROFILE.founder.affiliation }
      : null,
    knowsAbout: [...ORG_PROFILE.founder.knowsAbout],
    sameAs: [...ORG_PROFILE.founder.sameAs],
    image: ORG_PROFILE.founder.image,
  },
  // MCS installer reviewers slot in here once the engagement campaign
  // delivers sign-ups (per the strategy laid out in the plan). Until
  // then the founder is the only author; the AEOPage template will
  // gracefully render a single-author byline.
  //
  // Template:
  //
  // "joe-bloggs": {
  //   slug: "joe-bloggs",
  //   name: "Joe Bloggs",
  //   role: "reviewer",
  //   jobTitle: "Heat-pump engineer",
  //   bio: "...",
  //   credentials: ["MCS #12345", "CIPHE registered"],
  //   mcsCertificateNumber: "12345",
  //   affiliation: { name: "Bloggs Heating Ltd", url: "https://..." },
  //   knowsAbout: ["air-source heat pumps", "BUS grant", "heat-loss
  //                calculations"],
  //   sameAs: ["https://www.linkedin.com/in/joe-bloggs", "https://bloggs-heating.co.uk"],
  //   image: "/authors/joe-bloggs.jpg",
  // },
};

/**
 * Look up an author by slug. Returns null when not found so callers
 * can render a graceful fallback rather than 500.
 */
export function getAuthor(slug: string): AuthorProfile | null {
  return AUTHORS[slug] ?? null;
}

/** Absolute URL of an author's bio page on the site. */
export function authorUrl(slug: string): string {
  return `${ORG_PROFILE.url}/authors/${slug}`;
}

/**
 * The default author for any guide that doesn't specify one — used
 * during the founder-as-sole-author phase before MCS reviewers come
 * online. Once we have multiple authors this should be reviewed.
 */
export const DEFAULT_AUTHOR_SLUG = ORG_PROFILE.founder.slug;
