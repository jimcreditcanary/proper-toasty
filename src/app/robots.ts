// /robots.txt — Next.js App Router robots convention.
//
// Mirrors the sitemap exclusions: marketing pages crawlable, every
// auth-gated / private / API route disallowed. Sitemap reference at
// the bottom so crawlers find the public surface efficiently.
//
// Path scoping notes:
//   - "/check" intentionally allowed (the entry-point landing is
//     public + fine to index); the parameterised variants
//     (/check?presurvey=…, /check?step=…) get noindex'd at the page
//     level when they exist. Disallow here would block crawlers
//     from following sitemap nav.
//   - "/api/" disallow stops crawlers wasting budget on JSON
//     endpoints — important because we have several public ones
//     (epc lookup, places autocomplete) that would otherwise look
//     like indexable URLs.
//
// To verify: curl https://www.propertoasty.com/robots.txt

import type { MetadataRoute } from "next";

const SITE_URL = "https://www.propertoasty.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/api/",
          "/auth/",
          "/admin/",
          "/installer/",
          "/dashboard/",
          "/r/",
          "/lead/",
          // Trailing-slash variants for crawlers that strip them.
          "/admin",
          "/installer",
          "/dashboard",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
