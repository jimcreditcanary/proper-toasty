// Send-window + distribution unit tests. Pure-function focus.

import { describe, expect, it } from "vitest";
import {
  isInsideWindow,
  isWeekdayInTimezone,
  distributeSendTimes,
} from "../schedule";

const WIN = {
  timezone: "Europe/London",
  startHour: 9,
  endHour: 17,
  peakHours: [9, 10, 14, 15],
  weekdaysOnly: true,
};

describe("isInsideWindow", () => {
  it("returns true at 10:30 local on a Tuesday", () => {
    // 2026-05-19 (Tue) 10:30 BST = 09:30 UTC
    const t = new Date("2026-05-19T09:30:00Z");
    expect(isInsideWindow(t, WIN)).toBe(true);
  });

  it("returns false at 08:30 local on a Tuesday (before window)", () => {
    const t = new Date("2026-05-19T07:30:00Z"); // 08:30 BST
    expect(isInsideWindow(t, WIN)).toBe(false);
  });

  it("returns false at 17:00 local (exclusive end)", () => {
    const t = new Date("2026-05-19T16:00:00Z"); // 17:00 BST
    expect(isInsideWindow(t, WIN)).toBe(false);
  });

  it("returns false on Saturday when weekdaysOnly=true", () => {
    const sat = new Date("2026-05-23T11:00:00Z"); // Sat 12:00 BST
    expect(isInsideWindow(sat, WIN)).toBe(false);
  });

  it("returns true on Saturday when weekdaysOnly=false", () => {
    const sat = new Date("2026-05-23T11:00:00Z");
    expect(isInsideWindow(sat, { ...WIN, weekdaysOnly: false })).toBe(true);
  });

  it("respects DST — winter GMT, 10:00 local on a Tuesday", () => {
    // 2026-12-15 (Tue) 10:00 GMT = 10:00 UTC
    const t = new Date("2026-12-15T10:00:00Z");
    expect(isInsideWindow(t, WIN)).toBe(true);
  });
});

describe("isWeekdayInTimezone", () => {
  it("Monday → true", () => {
    expect(isWeekdayInTimezone(new Date("2026-05-18T10:00:00Z"), "Europe/London"))
      .toBe(true);
  });

  it("Friday → true", () => {
    expect(isWeekdayInTimezone(new Date("2026-05-22T10:00:00Z"), "Europe/London"))
      .toBe(true);
  });

  it("Saturday → false", () => {
    expect(isWeekdayInTimezone(new Date("2026-05-23T10:00:00Z"), "Europe/London"))
      .toBe(false);
  });

  it("Sunday → false", () => {
    expect(isWeekdayInTimezone(new Date("2026-05-24T10:00:00Z"), "Europe/London"))
      .toBe(false);
  });
});

describe("distributeSendTimes", () => {
  // Deterministic random sequence — seeded by closure.
  function seeded(n: number): () => number {
    let i = 0;
    return () => {
      const out = ((n * (i + 1)) % 997) / 997;
      i++;
      return out;
    };
  }

  it("returns N timestamps for count N", () => {
    const t = new Date("2026-05-19T07:30:00Z");
    const stamps = distributeSendTimes({
      now: t,
      window: WIN,
      count: 5,
      random: seeded(42),
    });
    expect(stamps).toHaveLength(5);
  });

  it("returns timestamps in ascending order", () => {
    const t = new Date("2026-05-19T07:30:00Z");
    const stamps = distributeSendTimes({
      now: t,
      window: WIN,
      count: 10,
      random: seeded(7),
    });
    for (let i = 1; i < stamps.length; i++) {
      expect(stamps[i].getTime()).toBeGreaterThanOrEqual(stamps[i - 1].getTime());
    }
  });

  it("returns empty array for count=0", () => {
    const t = new Date("2026-05-19T07:30:00Z");
    expect(
      distributeSendTimes({ now: t, window: WIN, count: 0 }),
    ).toEqual([]);
  });

  it("returns empty array when called after window close", () => {
    // 18:00 BST = 17:00 UTC — past 17:00 local close
    const after = new Date("2026-05-19T17:00:00Z");
    expect(
      distributeSendTimes({ now: after, window: WIN, count: 5 }),
    ).toEqual([]);
  });
});
