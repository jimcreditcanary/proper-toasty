// Regression guard for the Google Search Console "Invalid URL in
// field 'id' (in 'itemListElement.item')" error: the breadcrumb
// `item` must be an absolute URL. We pass site-relative paths from
// callers (authors page, AEOPage town pages) and rely on the schema
// component to resolve them against the canonical origin.

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { BreadcrumbListSchema } from "./BreadcrumbListSchema";
import { ORG_PROFILE } from "@/lib/seo/org-profile";

/** Pull the JSON-LD payload out of the rendered <script> tag. */
function parseJsonLd(markup: string): {
  itemListElement: Array<{ position: number; name: string; item?: string }>;
} {
  const match = markup.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*)<\/script>/,
  );
  if (!match) throw new Error("no JSON-LD script tag rendered");
  // The component HTML-escapes via dangerouslySetInnerHTML; decode the
  // handful of entities that appear in our URLs/JSON.
  const json = match[1]
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&");
  return JSON.parse(json);
}

describe("BreadcrumbListSchema", () => {
  it("resolves site-relative crumb URLs to absolute", () => {
    const markup = renderToStaticMarkup(
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: "/" },
          { name: "Heat pumps", url: "/heat-pumps" },
          { name: "Norwich" },
        ]}
      />,
    );
    const data = parseJsonLd(markup);

    // Home "/" → bare origin (no trailing slash).
    expect(data.itemListElement[0].item).toBe(ORG_PROFILE.url);
    // "/heat-pumps" → origin + path.
    expect(data.itemListElement[1].item).toBe(
      `${ORG_PROFILE.url}/heat-pumps`,
    );
    // Final crumb (current page) carries no `item` per the spec.
    expect(data.itemListElement[2].item).toBeUndefined();
    expect(data.itemListElement[2].name).toBe("Norwich");

    // Every emitted `item` must be an absolute http(s) URL.
    for (const el of data.itemListElement) {
      if (el.item !== undefined) {
        expect(el.item).toMatch(/^https?:\/\//);
      }
    }
  });

  it("passes already-absolute URLs through untouched", () => {
    const abs = `${ORG_PROFILE.url}/blog`;
    const markup = renderToStaticMarkup(
      <BreadcrumbListSchema
        items={[
          { name: "Home", url: ORG_PROFILE.url },
          { name: "Journal", url: abs },
          { name: "A post" },
        ]}
      />,
    );
    const data = parseJsonLd(markup);
    expect(data.itemListElement[0].item).toBe(ORG_PROFILE.url);
    expect(data.itemListElement[1].item).toBe(abs);
  });

  it("renders nothing for an empty trail", () => {
    const markup = renderToStaticMarkup(
      <BreadcrumbListSchema items={[]} />,
    );
    expect(markup).toBe("");
  });
});
