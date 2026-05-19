// Tests for the curated cover-image library. The library is small
// + the lookups are O(8), so the value here is catching:
//   - Theme typos slipping past TS that don't match an entry
//   - The reverse-credit lookup matching by photo ID rather than
//     full URL (so transform-param drift doesn't break credits)

import { describe, expect, it } from "vitest";
import {
  coverImageForTheme,
  creditForCoverImage,
} from "../cover-image-library";
import { COVER_IMAGE_THEMES } from "../blog-draft";

describe("coverImageForTheme", () => {
  it("returns a URL + credit for every theme in the canonical list", () => {
    for (const theme of COVER_IMAGE_THEMES) {
      const entry = coverImageForTheme(theme);
      expect(entry.url).toMatch(/^https:\/\/images\.unsplash\.com\//);
      expect(entry.credit).toMatch(/Unsplash/);
      expect(entry.creditUrl).toMatch(/^https:\/\/unsplash\.com\//);
    }
  });

  it("falls back to uk_home_exterior for null / unknown themes", () => {
    const fallback = coverImageForTheme("uk_home_exterior");
    expect(coverImageForTheme(null)).toEqual(fallback);
    // Cast around the type-narrowing to simulate a stale theme name
    // arriving from a DB that pre-dates the enum.
    expect(
      coverImageForTheme(
        "stale_theme" as unknown as (typeof COVER_IMAGE_THEMES)[number],
      ),
    ).toEqual(fallback);
  });
});

describe("creditForCoverImage", () => {
  it("matches by photo ID even when transform params differ", () => {
    const baseUrl = coverImageForTheme("solar_panels_on_roof").url;
    const idMatch = /\/(photo-[a-z0-9-]+)/.exec(baseUrl);
    expect(idMatch).not.toBeNull();
    const idOnlyUrl = `https://images.unsplash.com/${idMatch![1]}?w=400&q=60`;
    const credit = creditForCoverImage(idOnlyUrl);
    expect(credit).not.toBeNull();
    expect(credit?.credit).toMatch(/Unsplash/);
  });

  it("returns null for null / non-library URLs", () => {
    expect(creditForCoverImage(null)).toBeNull();
    expect(creditForCoverImage("/hero-uk-home.jpg")).toBeNull();
    expect(
      creditForCoverImage("https://images.unsplash.com/photo-nonexistent"),
    ).toBeNull();
  });
});
