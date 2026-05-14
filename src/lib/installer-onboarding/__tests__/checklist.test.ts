// Pure-function tests for the onboarding checklist. Focus on the
// "what's the next step" highlight and the isComplete flag — those
// drive the UI so getting them wrong means a brand-new installer
// either sees no guidance or never escapes the panel.

import { describe, expect, it } from "vitest";
import { buildChecklist } from "../checklist";

const ZERO = {
  hasAvailability: false,
  hasLogo: false,
  creditBalance: 0,
  preSurveyRequestCount: 0,
  proposalSentCount: 0,
} as const;

describe("buildChecklist — empty installer", () => {
  it("returns 5 items, none done, first one current", () => {
    const r = buildChecklist(ZERO);
    expect(r.items.length).toBe(5);
    expect(r.doneCount).toBe(0);
    expect(r.totalCount).toBe(5);
    expect(r.isComplete).toBe(false);
    expect(r.items[0].id).toBe("availability");
    expect(r.items[0].current).toBe(true);
    expect(r.items.slice(1).every((it) => !it.current)).toBe(true);
  });
});

describe("buildChecklist — partial completion", () => {
  it("advances current to the next not-done item (logo after availability)", () => {
    const r = buildChecklist({ ...ZERO, hasAvailability: true });
    expect(r.items[0].done).toBe(true);
    expect(r.items[0].current).toBe(false);
    expect(r.items[1].id).toBe("logo");
    expect(r.items[1].current).toBe(true);
    expect(r.doneCount).toBe(1);
    expect(r.isComplete).toBe(false);
  });

  it("advances past the logo step to credits when logo is done", () => {
    const r = buildChecklist({
      ...ZERO,
      hasAvailability: true,
      hasLogo: true,
    });
    expect(r.items[2].id).toBe("credits");
    expect(r.items[2].current).toBe(true);
    expect(r.doneCount).toBe(2);
  });

  it("treats credit balance > 0 as 'done' regardless of value", () => {
    const a = buildChecklist({ ...ZERO, creditBalance: 1 });
    const b = buildChecklist({ ...ZERO, creditBalance: 1000 });
    expect(a.items[2].done).toBe(true);
    expect(b.items[2].done).toBe(true);
  });

  it("doesn't mark credits as done when balance is exactly 0", () => {
    const r = buildChecklist({ ...ZERO, creditBalance: 0 });
    expect(r.items[2].done).toBe(false);
  });
});

describe("buildChecklist — full completion", () => {
  it("isComplete = true when every step is done", () => {
    const r = buildChecklist({
      hasAvailability: true,
      hasLogo: true,
      creditBalance: 30,
      preSurveyRequestCount: 1,
      proposalSentCount: 1,
    });
    expect(r.isComplete).toBe(true);
    expect(r.doneCount).toBe(5);
    expect(r.items.every((it) => !it.current)).toBe(true);
  });
});

describe("buildChecklist — out-of-order completion", () => {
  it("highlights the first NOT-done step even if later ones are done", () => {
    // Simulate an installer who skipped availability but already
    // uploaded a logo + bought credits + sent a pre-survey + a quote.
    // Availability is still the next nag.
    const r = buildChecklist({
      hasAvailability: false,
      hasLogo: true,
      creditBalance: 10,
      preSurveyRequestCount: 2,
      proposalSentCount: 1,
    });
    expect(r.items[0].id).toBe("availability");
    expect(r.items[0].current).toBe(true);
    expect(r.items.slice(1).every((it) => !it.current)).toBe(true);
    expect(r.doneCount).toBe(4);
    expect(r.isComplete).toBe(false);
  });
});

describe("buildChecklist — copy + CTAs", () => {
  it("each item has a CTA pointing at the right page", () => {
    const r = buildChecklist(ZERO);
    expect(r.items[0].ctaHref).toBe("/installer/availability");
    expect(r.items[1].ctaHref).toBe("/installer/profile");
    expect(r.items[2].ctaHref).toBe("/installer/credits");
    expect(r.items[3].ctaHref).toBe("/installer/pre-survey-requests");
    expect(r.items[4].ctaHref).toBe("/installer/proposals");
  });
});
