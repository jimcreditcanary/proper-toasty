// Regression guard for the Bing Webmaster Tools "Invalid sitemap —
// Unable to fetch urls from the sitemap" failure: the master index
// must not reference a sub-sitemap that is an empty <urlset>. Bing
// (unlike Google) rejects an empty child and fails the whole scan.
// sitemap-data.xml is an empty Phase 4 stub, so it must stay out of
// the index until it emits real <url> rows.

import { describe, expect, it } from "vitest";
import { GET } from "./route";

async function getIndex(): Promise<string> {
  const res = await GET();
  return res.text();
}

describe("sitemap.xml master index", () => {
  it("lists the three populated sub-sitemaps", async () => {
    const xml = await getIndex();
    expect(xml).toContain("/sitemap-pages.xml");
    expect(xml).toContain("/sitemap-guides.xml");
    expect(xml).toContain("/sitemap-towns.xml");
  });

  it("does NOT list the empty sitemap-data.xml stub", async () => {
    const xml = await getIndex();
    // If you re-add it because Phase 4 populated it with real URLs,
    // update this assertion deliberately — don't relist an empty one.
    expect(xml).not.toContain("/sitemap-data.xml");
  });

  it("is a well-formed sitemapindex document", async () => {
    const xml = await getIndex();
    expect(xml).toContain("<sitemapindex");
    expect(xml).toContain("</sitemapindex>");
  });
});
