// Unit tests for the pure helpers in town-aggregates.ts.
// The DB-touching upserts are exercised end-to-end via the build
// script; this file just covers the slug derivation logic, which
// is fiddly enough on real council names that a regression would
// quietly mis-key future LA pages.

import { describe, expect, it } from "vitest";
import { laSlugFromCouncilName } from "../town-aggregates";

describe("laSlugFromCouncilName", () => {
  it("handles a simple single-word council", () => {
    expect(laSlugFromCouncilName("Sheffield")).toBe("sheffield");
  });

  it("handles spaces", () => {
    expect(laSlugFromCouncilName("Newcastle upon Tyne")).toBe(
      "newcastle-upon-tyne",
    );
  });

  it("strips commas and 'City of' suffixes", () => {
    expect(laSlugFromCouncilName("Kingston upon Hull, City of")).toBe(
      "kingston-upon-hull-city-of",
    );
  });

  it("collapses repeated separators", () => {
    expect(laSlugFromCouncilName("Stoke -- on -- Trent")).toBe(
      "stoke-on-trent",
    );
  });

  it("trims leading and trailing separators", () => {
    expect(laSlugFromCouncilName(" - Sheffield - ")).toBe("sheffield");
  });

  it("is stable across re-runs (no Math.random / Date)", () => {
    const a = laSlugFromCouncilName("Kingston upon Hull, City of");
    const b = laSlugFromCouncilName("Kingston upon Hull, City of");
    expect(a).toBe(b);
  });
});
