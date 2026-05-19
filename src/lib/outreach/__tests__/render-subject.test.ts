import { describe, expect, it } from "vitest";
import { renderSubjectVars } from "../render-subject";

describe("renderSubjectVars", () => {
  it("substitutes a simple {{var}} placeholder", () => {
    expect(
      renderSubjectVars("Hello {{first_name}}", { first_name: "James" }),
    ).toBe("Hello James");
  });

  it("keeps the inner block when {{#var}}...{{/var}} value is truthy", () => {
    expect(
      renderSubjectVars(
        "Quick question{{#first_name}}, {{first_name}}{{/first_name}}",
        { first_name: "James" },
      ),
    ).toBe("Quick question, James");
  });

  it("drops the conditional block when var is empty string", () => {
    expect(
      renderSubjectVars(
        "Quick question{{#first_name}}, {{first_name}}{{/first_name}}",
        { first_name: "" },
      ),
    ).toBe("Quick question");
  });

  it("drops the conditional block when var is null", () => {
    expect(
      renderSubjectVars(
        "Quick question{{#first_name}}, {{first_name}}{{/first_name}}",
        { first_name: null },
      ),
    ).toBe("Quick question");
  });

  it("drops the conditional block when var is missing entirely", () => {
    expect(
      renderSubjectVars(
        "Quick question{{#first_name}}, {{first_name}}{{/first_name}}",
        {},
      ),
    ).toBe("Quick question");
  });

  it("renders the company_name variant", () => {
    expect(
      renderSubjectVars("{{company_name}} — a quick question", {
        company_name: "Ealing Solar Co.",
      }),
    ).toBe("Ealing Solar Co. — a quick question");
  });

  it("collapses double spaces left by dropped blocks", () => {
    expect(
      renderSubjectVars(
        "Hello {{#first_name}}{{first_name}}{{/first_name}} world",
        { first_name: "" },
      ),
    ).toBe("Hello world");
  });

  it("trims dangling space before a comma", () => {
    expect(
      renderSubjectVars(
        "Quick question{{#first_name}} {{first_name}}{{/first_name}}, see attached",
        { first_name: "" },
      ),
    ).toBe("Quick question, see attached");
  });

  it("replaces missing {{var}} with empty string", () => {
    expect(renderSubjectVars("Hi {{first_name}} there", {})).toBe(
      "Hi there",
    );
  });

  it("treats numeric 0 as falsy in the conditional block", () => {
    expect(
      renderSubjectVars("Spots: {{#n}}{{n}} left{{/n}}", { n: 0 }),
    ).toBe("Spots:");
  });

  it("renders the conditional block when var is a non-zero number", () => {
    expect(
      renderSubjectVars("Spots: {{#n}}{{n}} left{{/n}}", { n: 3 }),
    ).toBe("Spots: 3 left");
  });

  it("handles multiple sequential variables", () => {
    expect(
      renderSubjectVars("{{a}} + {{b}} = {{c}}", { a: 1, b: 2, c: 3 }),
    ).toBe("1 + 2 = 3");
  });
});
