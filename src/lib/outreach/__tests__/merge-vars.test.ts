import { describe, expect, it } from "vitest";
import { bestEffortFirstName } from "../merge-vars";

describe("bestEffortFirstName", () => {
  it("prefers the enriched installer.first_name", () => {
    expect(
      bestEffortFirstName({
        first_name: "James",
        company_name: "Ealing Solar Co.",
      }),
    ).toBe("James");
  });

  it("falls back to the company-name first-word when no enriched name", () => {
    expect(
      bestEffortFirstName({
        first_name: null,
        company_name: "Ealing Solar Co.",
      }),
    ).toBe("Ealing");
  });

  it("returns null when company name is just a suffix", () => {
    expect(
      bestEffortFirstName({
        first_name: null,
        company_name: "Ltd",
      }),
    ).toBeNull();
  });

  it("returns null when both first_name and company_name are empty", () => {
    expect(
      bestEffortFirstName({
        first_name: null,
        company_name: "",
      }),
    ).toBeNull();
  });

  it("never returns the literal string 'there'", () => {
    expect(
      bestEffortFirstName({
        first_name: null,
        company_name: "   ",
      }),
    ).not.toBe("there");
  });

  it("trims whitespace on enriched first_name", () => {
    expect(
      bestEffortFirstName({
        first_name: "  James  ",
        company_name: "Foo",
      }),
    ).toBe("James");
  });

  it("ignores empty-string enriched first_name and falls through", () => {
    expect(
      bestEffortFirstName({
        first_name: "",
        company_name: "Bob Plumbing Ltd",
      }),
    ).toBe("Bob");
  });

  it("legacy string call signature still works", () => {
    expect(bestEffortFirstName("Ealing Solar Co.")).toBe("Ealing");
    expect(bestEffortFirstName("Ltd")).toBeNull();
  });

  it("returns null on null / undefined input", () => {
    expect(bestEffortFirstName(null)).toBeNull();
    expect(bestEffortFirstName(undefined)).toBeNull();
  });
});
