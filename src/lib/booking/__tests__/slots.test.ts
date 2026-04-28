// Slot generator tests — focus on the bits that are easy to get
// wrong: DST transitions, buffer overlap, past-slot pruning, day-of-
// week derivation across midnight UTC.

import { describe, expect, it } from "vitest";
import {
  generateSlots,
  londonDateParts,
  londonOffsetMinutes,
  londonWallToUtc,
  type AvailabilityBlock,
  type ExistingMeeting,
} from "../slots";

// ─── Time-zone helpers ─────────────────────────────────────────────────

describe("londonOffsetMinutes", () => {
  it("returns 0 in GMT (January)", () => {
    expect(londonOffsetMinutes(new Date("2026-01-15T12:00:00Z"))).toBe(0);
  });

  it("returns 60 in BST (June)", () => {
    expect(londonOffsetMinutes(new Date("2026-06-15T12:00:00Z"))).toBe(60);
  });
});

describe("londonWallToUtc", () => {
  it("9am London in GMT == 9am UTC", () => {
    // Jan 14 2026 is a Wednesday in GMT
    expect(londonWallToUtc(2026, 1, 14, 9, 0).toISOString()).toBe(
      "2026-01-14T09:00:00.000Z",
    );
  });

  it("9am London in BST == 8am UTC", () => {
    // Jun 17 2026 is a Wednesday in BST (UTC+1)
    expect(londonWallToUtc(2026, 6, 17, 9, 0).toISOString()).toBe(
      "2026-06-17T08:00:00.000Z",
    );
  });

  it("handles spring-forward boundary", () => {
    // BST starts at 01:00 GMT on 29 March 2026 — 01:00 wall jumps to 02:00.
    // 09:00 London on that day = 08:00 UTC (BST is now in force).
    expect(londonWallToUtc(2026, 3, 29, 9, 0).toISOString()).toBe(
      "2026-03-29T08:00:00.000Z",
    );
  });

  it("handles autumn-back boundary", () => {
    // BST ends at 02:00 BST on 25 October 2026 — clocks fall back to 01:00.
    // 09:00 London on that day = 09:00 UTC (back in GMT).
    expect(londonWallToUtc(2026, 10, 25, 9, 0).toISOString()).toBe(
      "2026-10-25T09:00:00.000Z",
    );
  });
});

describe("londonDateParts", () => {
  it("returns the London calendar date for a UTC instant", () => {
    // Late evening UTC = same day in London (still BST in summer)
    expect(londonDateParts(new Date("2026-06-17T22:00:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 17,
    });
  });

  it("rolls to the next day when past midnight London", () => {
    // 23:30 UTC on Jun 17 is 00:30 Jun 18 in London (BST = UTC+1)
    expect(londonDateParts(new Date("2026-06-17T23:30:00Z"))).toEqual({
      year: 2026,
      month: 6,
      day: 18,
    });
  });
});

// ─── Slot generation ───────────────────────────────────────────────────

const MON_FRI_9_TO_5: AvailabilityBlock[] = [1, 2, 3, 4, 5].map((dow) => ({
  dayOfWeek: dow,
  startTime: "09:00",
  endTime: "17:00",
}));

describe("generateSlots — basics", () => {
  it("generates 30-min-spaced 1hr slots from 09:00 to 16:00 inclusive", () => {
    // Wednesday 14 Jan 2026 — single-day window
    const now = new Date("2026-01-14T08:00:00Z"); // 08:00 GMT = 08:00 London
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
    });
    // 09:00, 09:30, 10:00, ..., 16:00 — last slot must end by 17:00.
    // (9*2=18, 16*2=32 — that's 32 - 18 + 1 = 15 slots)
    expect(slots).toHaveLength(15);
    expect(slots[0].timeLabel).toBe("09:00");
    expect(slots[slots.length - 1].timeLabel).toBe("16:00");
  });

  it("emits no slots on weekends with the default Mon-Fri block", () => {
    const now = new Date("2026-01-17T07:00:00Z"); // Saturday
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
    });
    expect(slots).toEqual([]);
  });

  it("walks the full window producing slots across multiple days", () => {
    const now = new Date("2026-01-12T07:00:00Z"); // Monday
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 7,
      minLeadMinutes: 0,
    });
    // Mon-Fri = 5 days × 15 slots = 75
    expect(slots).toHaveLength(75);
  });
});

describe("generateSlots — past pruning", () => {
  it("drops slots earlier than minLeadMinutes from now", () => {
    const now = new Date("2026-01-14T11:00:00Z"); // Wed 11:00 London
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 60, // need at least 1hr lead
    });
    // First bookable slot should be 12:30 or later (11:00 + 60min lead = 12:00,
    // and slots are at :00 and :30 — 12:00 itself is allowed since lead is
    // "earliest acceptable", not "strictly after")
    expect(slots[0].timeLabel).toBe("12:00");
  });

  it("drops slots starting before now even with zero lead", () => {
    const now = new Date("2026-01-14T13:30:00Z"); // Wed 13:30 London
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
    });
    expect(slots[0].timeLabel).toBe("13:30");
  });
});

describe("generateSlots — conflict + buffer", () => {
  it("removes slots that overlap with an existing meeting + buffers", () => {
    const now = new Date("2026-01-14T07:00:00Z"); // Wed pre-9am
    const existing: ExistingMeeting[] = [
      {
        // 11:00–12:00 London = 11:00–12:00 UTC (GMT in Jan)
        scheduledAt: "2026-01-14T11:00:00Z",
        durationMin: 60,
        travelBufferMin: 30,
      },
    ];
    const slots = generateSlots(MON_FRI_9_TO_5, existing, {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
      travelBufferMin: 30,
    });
    // Existing meeting window with its own buffer: 10:30 .. 12:30.
    // A candidate slot is blocked if (slotStart - buffer) overlaps that
    // window — i.e. slot's own buffered footprint touches the existing
    // window. With slot duration 60 + buffer 30 each side:
    //   - 09:00 → footprint 08:30–10:30. 10:30 == 10:30 → no strict
    //     overlap, BOOKABLE.
    //   - 09:30 → footprint 09:00–11:00. Crosses 10:30, BLOCKED.
    //   - 13:00 → footprint 12:30–14:30. 12:30 == 12:30, BOOKABLE.
    const labels = slots.map((s) => s.timeLabel);
    expect(labels).toContain("09:00");
    expect(labels).not.toContain("09:30");
    expect(labels).not.toContain("10:00");
    expect(labels).not.toContain("10:30");
    expect(labels).not.toContain("11:00");
    expect(labels).not.toContain("11:30");
    expect(labels).not.toContain("12:00");
    expect(labels).not.toContain("12:30");
    expect(labels).toContain("13:00");
  });
});

describe("generateSlots — DST", () => {
  it("produces correct UTC for slots that straddle the BST boundary", () => {
    // Window starts Mon 23 Mar 2026 (GMT). BST starts Sun 29 Mar.
    // First Monday entirely in BST is 30 Mar.
    const now = new Date("2026-03-23T07:00:00Z");
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 8, // covers Mon 23 → Mon 30 (incl)
      minLeadMinutes: 0,
    });
    const mar23 = slots.find((s) => s.dayKey === "2026-03-23");
    const mar30 = slots.find((s) => s.dayKey === "2026-03-30");
    expect(mar23?.startUtc).toBe("2026-03-23T09:00:00.000Z"); // GMT
    expect(mar30?.startUtc).toBe("2026-03-30T08:00:00.000Z"); // BST
  });
});

describe("generateSlots — multiple blocks per day", () => {
  it("supports two non-contiguous blocks on the same day", () => {
    const now = new Date("2026-01-14T07:00:00Z"); // Wed
    const split: AvailabilityBlock[] = [
      { dayOfWeek: 3, startTime: "09:00", endTime: "12:00" }, // morning
      { dayOfWeek: 3, startTime: "14:00", endTime: "17:00" }, // afternoon
    ];
    const slots = generateSlots(split, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
    });
    const labels = slots.map((s) => s.timeLabel);
    // Morning: 09:00, 09:30, 10:00, 10:30, 11:00 (last where end ≤ 12:00)
    expect(labels).toContain("11:00");
    expect(labels).not.toContain("11:30");
    // Lunch gap
    expect(labels).not.toContain("12:00");
    expect(labels).not.toContain("13:00");
    expect(labels).not.toContain("13:30");
    // Afternoon: 14:00 .. 16:00
    expect(labels).toContain("14:00");
    expect(labels).toContain("16:00");
    expect(labels).not.toContain("16:30");
  });
});

describe("generateSlots — labels", () => {
  it("formats day labels in Europe/London with abbreviated names", () => {
    const now = new Date("2026-05-04T06:00:00Z"); // Mon 4 May (BST)
    const slots = generateSlots(MON_FRI_9_TO_5, [], {
      now,
      windowDays: 1,
      minLeadMinutes: 0,
    });
    expect(slots[0].dayLabel).toBe("Mon 4 May");
  });
});
