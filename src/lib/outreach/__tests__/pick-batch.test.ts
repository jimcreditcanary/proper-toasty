import { describe, expect, it } from "vitest";
import { pickBatch, outcodeOf, type PickInput } from "../pick-batch";

function row(
  installer_id: number,
  first_name: string | null,
  postcode: string | null,
  quality_score: number,
): PickInput {
  return {
    installer_id,
    email: `installer-${installer_id}@example.com`,
    company_name: `Installer ${installer_id} Ltd`,
    postcode,
    first_name,
    quality_score,
  };
}

describe("outcodeOf", () => {
  it("extracts the outward code from a full postcode", () => {
    expect(outcodeOf("SW1A 1AA")).toBe("SW1A");
    expect(outcodeOf("m1 1aa")).toBe("M1");
    expect(outcodeOf("EC1V 9HX")).toBe("EC1V");
  });

  it("returns null for empty / malformed input", () => {
    expect(outcodeOf(null)).toBeNull();
    expect(outcodeOf("")).toBeNull();
    expect(outcodeOf("   ")).toBeNull();
    expect(outcodeOf("not-a-postcode")).toBeNull();
  });
});

describe("pickBatch — ordering", () => {
  it("returns named installers ahead of unnamed ones, all else equal", () => {
    // Input is in the order the caller would supply it: pure quality
    // order, named + unnamed interleaved.
    const eligible = [
      row(1, null, "M1 1AA", 100),
      row(2, "Alice", "B1 1AA", 95),
      row(3, null, "LS1 1AA", 90),
      row(4, "Bob", "G1 1AA", 85),
    ];

    const picked = pickBatch(eligible, 4);

    expect(picked.map((p) => p.installer_id)).toEqual([2, 4, 1, 3]);
  });

  it("preserves quality_score order within the named cohort", () => {
    const eligible = [
      row(1, "Alice", "M1 1AA", 100),
      row(2, "Bob", "B1 1AA", 80),
      row(3, "Carol", "LS1 1AA", 60),
    ];

    const picked = pickBatch(eligible, 3);

    expect(picked.map((p) => p.installer_id)).toEqual([1, 2, 3]);
  });

  it("preserves quality_score order within the unnamed cohort", () => {
    const eligible = [
      row(1, null, "M1 1AA", 100),
      row(2, null, "B1 1AA", 80),
      row(3, null, "LS1 1AA", 60),
    ];

    const picked = pickBatch(eligible, 3);

    expect(picked.map((p) => p.installer_id)).toEqual([1, 2, 3]);
  });

  it("treats empty-string first_name as unnamed", () => {
    const eligible = [
      row(1, "", "M1 1AA", 100),
      row(2, "Alice", "B1 1AA", 50),
    ];

    const picked = pickBatch(eligible, 2);

    expect(picked.map((p) => p.installer_id)).toEqual([2, 1]);
  });

  it("does NOT exclude unnamed installers — they fill the tail", () => {
    const eligible = [
      row(1, "Alice", "M1 1AA", 100),
      row(2, null, "B1 1AA", 90),
      row(3, null, "LS1 1AA", 80),
    ];

    const picked = pickBatch(eligible, 3);

    expect(picked).toHaveLength(3);
    expect(picked.map((p) => p.installer_id)).toEqual([1, 2, 3]);
  });

  it("returns only named when named pool fully satisfies target", () => {
    const eligible = [
      row(1, "Alice", "M1 1AA", 100),
      row(2, "Bob", "B1 1AA", 90),
      row(3, null, "LS1 1AA", 80),
      row(4, null, "G1 1AA", 70),
    ];

    const picked = pickBatch(eligible, 2);

    expect(picked.map((p) => p.installer_id)).toEqual([1, 2]);
  });
});

describe("pickBatch — outcode cap", () => {
  it("caps any single outcode at 5 across the whole batch", () => {
    const eligible = [
      // 7 named installers all in SW1A
      ...Array.from({ length: 7 }, (_, i) =>
        row(i + 1, `Named${i + 1}`, "SW1A 1AA", 100 - i),
      ),
      // 3 named installers elsewhere
      row(10, "Alice", "M1 1AA", 50),
      row(11, "Bob", "B1 1AA", 45),
      row(12, "Carol", "LS1 1AA", 40),
    ];

    const picked = pickBatch(eligible, 10);

    expect(picked).toHaveLength(8);
    expect(picked.filter((p) => p.postcode === "SW1A 1AA")).toHaveLength(5);
    // The top-5 SW1A by quality are 1..5; 6 and 7 must be excluded.
    expect(picked.map((p) => p.installer_id)).not.toContain(6);
    expect(picked.map((p) => p.installer_id)).not.toContain(7);
  });

  it("outcode cap spans both cohorts (named slots consume unnamed budget)", () => {
    const eligible = [
      // 5 named installers in SW1A — uses up the full cap
      ...Array.from({ length: 5 }, (_, i) =>
        row(i + 1, `Named${i + 1}`, "SW1A 1AA", 100 - i),
      ),
      // 3 unnamed in SW1A — should all be skipped
      row(10, null, "SW1A 1AA", 90),
      row(11, null, "SW1A 1AA", 85),
      row(12, null, "SW1A 1AA", 80),
      // 1 unnamed elsewhere — should slot in
      row(20, null, "M1 1AA", 70),
    ];

    const picked = pickBatch(eligible, 10);

    expect(picked).toHaveLength(6);
    expect(picked.filter((p) => p.postcode === "SW1A 1AA")).toHaveLength(5);
    expect(picked.map((p) => p.installer_id)).toContain(20);
    for (const id of [10, 11, 12]) {
      expect(picked.map((p) => p.installer_id)).not.toContain(id);
    }
  });

  it("treats null postcode as uncapped (no outcode key)", () => {
    const eligible = [
      ...Array.from({ length: 7 }, (_, i) =>
        row(i + 1, `Named${i + 1}`, null, 100 - i),
      ),
    ];

    const picked = pickBatch(eligible, 6);

    expect(picked).toHaveLength(6);
    expect(picked.map((p) => p.installer_id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("honours a custom maxPerOutcode", () => {
    const eligible = Array.from({ length: 5 }, (_, i) =>
      row(i + 1, `Named${i + 1}`, "SW1A 1AA", 100 - i),
    );

    const picked = pickBatch(eligible, 5, { maxPerOutcode: 2 });

    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.installer_id)).toEqual([1, 2]);
  });
});

describe("pickBatch — edge cases", () => {
  it("returns an empty array when target is 0 or negative", () => {
    const eligible = [row(1, "Alice", "M1 1AA", 100)];
    expect(pickBatch(eligible, 0)).toEqual([]);
    expect(pickBatch(eligible, -1)).toEqual([]);
  });

  it("returns everything when target exceeds the eligible pool", () => {
    const eligible = [
      row(1, "Alice", "M1 1AA", 100),
      row(2, null, "B1 1AA", 90),
    ];

    const picked = pickBatch(eligible, 100);

    expect(picked).toHaveLength(2);
    expect(picked.map((p) => p.installer_id)).toEqual([1, 2]);
  });

  it("returns an empty array for an empty pool", () => {
    expect(pickBatch([], 10)).toEqual([]);
  });
});
