// Pure-function tests for the onboarding checklist. Focus on the
// "what's the next step" highlight, the isComplete flag, the
// dependency-hint surface, and shouldShowWelcomeCard — those drive
// the UI so getting them wrong means a brand-new installer either
// sees no guidance, sees the wrong guidance, or never escapes the
// panel.
//
// History:
//   - "Top up your credit balance" was removed (m066 + outreach
//     tier grants ensure every installer starts with +30 credits).
//     Count went from 5 to 4.
//   - Order-gating on CTAs was removed (PR "Installer welcome card:
//     remove forced ordering + add dismiss-whole-card"). Every task
//     keeps its CTA regardless of position. `current` survives only
//     as a visual emphasis flag for the recommended next step.
//   - Added `taskAddedAt` per item + `shouldShowWelcomeCard` helper
//     to support re-showing the card when new tasks ship after a
//     prior dismissal.

import { describe, expect, it } from "vitest";
import { buildChecklist, shouldShowWelcomeCard } from "../checklist";

const ZERO = {
  hasAvailability: false,
  hasLogo: false,
  preSurveyRequestCount: 0,
  proposalSentCount: 0,
} as const;

describe("buildChecklist — empty installer", () => {
  it("returns 4 items, none done, first one current", () => {
    const r = buildChecklist(ZERO);
    expect(r.items.length).toBe(4);
    expect(r.doneCount).toBe(0);
    expect(r.totalCount).toBe(4);
    expect(r.isComplete).toBe(false);
    expect(r.items[0].id).toBe("availability");
    expect(r.items[0].current).toBe(true);
    expect(r.items.slice(1).every((it) => !it.current)).toBe(true);
  });

  it("every task carries a taskAddedAt ISO date string", () => {
    const r = buildChecklist(ZERO);
    for (const it of r.items) {
      // Loose check — must parse as a date and not be in the future.
      const t = Date.parse(it.taskAddedAt);
      expect(Number.isFinite(t)).toBe(true);
      expect(t).toBeLessThanOrEqual(Date.now());
    }
    expect(r.latestTaskAddedAt).toBe(
      r.items.map((it) => it.taskAddedAt).sort().at(-1),
    );
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

  it("advances past the logo step to first_pre_survey when logo is done", () => {
    const r = buildChecklist({
      ...ZERO,
      hasAvailability: true,
      hasLogo: true,
    });
    expect(r.items[2].id).toBe("first_pre_survey");
    expect(r.items[2].current).toBe(true);
    expect(r.doneCount).toBe(2);
  });
});

describe("buildChecklist — full completion", () => {
  it("isComplete = true when every step is done", () => {
    const r = buildChecklist({
      hasAvailability: true,
      hasLogo: true,
      preSurveyRequestCount: 1,
      proposalSentCount: 1,
    });
    expect(r.isComplete).toBe(true);
    expect(r.doneCount).toBe(4);
    expect(r.items.every((it) => !it.current)).toBe(true);
  });
});

describe("buildChecklist — out-of-order completion", () => {
  it("highlights the first NOT-done step even if later ones are done", () => {
    // Simulate an installer who skipped availability but already
    // uploaded a logo + sent a pre-survey + a quote. Availability
    // is still the next nag.
    const r = buildChecklist({
      hasAvailability: false,
      hasLogo: true,
      preSurveyRequestCount: 2,
      proposalSentCount: 1,
    });
    expect(r.items[0].id).toBe("availability");
    expect(r.items[0].current).toBe(true);
    expect(r.items.slice(1).every((it) => !it.current)).toBe(true);
    expect(r.doneCount).toBe(3);
    expect(r.isComplete).toBe(false);
  });
});

describe("buildChecklist — copy + CTAs", () => {
  it("each item has a CTA pointing at the right page", () => {
    const r = buildChecklist(ZERO);
    expect(r.items[0].ctaHref).toBe("/installer/availability");
    expect(r.items[1].ctaHref).toBe("/installer/profile");
    expect(r.items[2].ctaHref).toBe("/installer/pre-survey-requests");
    expect(r.items[3].ctaHref).toBe("/installer/proposals");
  });

  it("no longer includes a 'credits' / top-up task", () => {
    // The credit top-up task was removed — defend against regression
    // (e.g. someone re-adding it back unintentionally).
    const r = buildChecklist(ZERO);
    expect(r.items.find((it) => it.id === ("credits" as never))).toBeUndefined();
    expect(r.items.some((it) => /top up/i.test(it.title))).toBe(false);
  });

  it("every not-done item carries a CTA label + href so the page can render its button regardless of order", () => {
    // Regression guard for the "remove forced ordering" change:
    // every not-done task must expose ctaLabel + ctaHref so the
    // page can always render the button. (Previously the page
    // only rendered the CTA for the `current` task.)
    const r = buildChecklist({
      ...ZERO,
      hasAvailability: true, // 1 done
    });
    for (const it of r.items.filter((it) => !it.done)) {
      expect(it.ctaLabel.length).toBeGreaterThan(0);
      expect(it.ctaHref.length).toBeGreaterThan(0);
    }
  });
});

describe("buildChecklist — dependency hints", () => {
  it("surfaces a hint on first_quote when no pre-survey has been sent yet", () => {
    const r = buildChecklist(ZERO);
    const quote = r.items.find((it) => it.id === "first_quote")!;
    expect(quote.dependencyHint).toBeTruthy();
    expect(quote.dependencyHint).toMatch(/pre-survey/i);
  });

  it("drops the hint once a pre-survey has been sent", () => {
    const r = buildChecklist({ ...ZERO, preSurveyRequestCount: 1 });
    const quote = r.items.find((it) => it.id === "first_quote")!;
    expect(quote.dependencyHint).toBeUndefined();
  });

  it("availability + logo + pre-survey tasks carry no dependency hint (they're standalone)", () => {
    const r = buildChecklist(ZERO);
    expect(r.items.find((it) => it.id === "availability")!.dependencyHint).toBeUndefined();
    expect(r.items.find((it) => it.id === "logo")!.dependencyHint).toBeUndefined();
    expect(r.items.find((it) => it.id === "first_pre_survey")!.dependencyHint).toBeUndefined();
  });
});

describe("shouldShowWelcomeCard", () => {
  it("shows the card when never dismissed and tasks remain", () => {
    const r = buildChecklist(ZERO);
    expect(shouldShowWelcomeCard(r, null)).toBe(true);
  });

  it("hides the card once every task is done — regardless of dismissal state", () => {
    const r = buildChecklist({
      hasAvailability: true,
      hasLogo: true,
      preSurveyRequestCount: 1,
      proposalSentCount: 1,
    });
    expect(shouldShowWelcomeCard(r, null)).toBe(false);
    expect(shouldShowWelcomeCard(r, "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("hides the card when dismissed AFTER the most recent task addition", () => {
    const r = buildChecklist(ZERO);
    // Dismissed far in the future — newer than every task constant.
    expect(shouldShowWelcomeCard(r, "2099-01-01T00:00:00Z")).toBe(false);
  });

  it("re-shows the card when a task was added AFTER the dismissal stamp", () => {
    // Simulate: installer dismissed in 2020, but the latest task
    // shipped in 2024 (current ORIGINAL_TASKS_ADDED_AT). The card
    // should re-appear so they see the new task.
    const r = buildChecklist(ZERO);
    expect(shouldShowWelcomeCard(r, "2020-01-01T00:00:00Z")).toBe(true);
  });
});
