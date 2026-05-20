// Selection logic for the daily outreach batch.
//
// Pure function so the route can stay focused on auth / DB I/O and
// the ordering rules can be unit-tested without a Supabase mock.
//
// Rules, in order of precedence:
//   1. Named installers (first_name is not null) flow before unnamed
//      ones — during warmup the personalised subject lands a better
//      open rate, so we burn the named pool first.
//   2. Within each cohort (named, then unnamed), pick by descending
//      quality_score.
//   3. No more than `maxPerOutcode` (default 5) recipients per
//      postcode outcode across the WHOLE batch (the cap spans both
//      cohorts — a noisy outcode in the named pass eats slots from
//      the unnamed pass too).
//
// The caller already orders the input rows by quality_score desc
// (the view + the .order() in the route). We re-order by named-first
// here without re-sorting, so the quality ranking is preserved
// within each cohort.

export interface PickInput {
  installer_id: number;
  email: string;
  company_name: string;
  postcode: string | null;
  first_name: string | null;
  quality_score: number;
}

export interface PickOptions {
  /** Max recipients per outcode in the resulting batch. Default 5. */
  maxPerOutcode?: number;
}

/** "SW1A 1AA" → "SW1A"; null when postcode missing/malformed. */
export function outcodeOf(postcode: string | null): string | null {
  if (!postcode) return null;
  const match = /^([A-Z]{1,2}\d[A-Z\d]?)/i.exec(postcode.trim());
  return match ? match[1].toUpperCase() : null;
}

/**
 * Pick up to `target` recipients from the eligible pool, preferring
 * named installers and respecting the per-outcode cap.
 *
 * @param eligible rows ordered by quality_score desc
 * @param target  how many to pick (typically the remaining daily limit)
 */
export function pickBatch<T extends PickInput>(
  eligible: readonly T[],
  target: number,
  options: PickOptions = {},
): T[] {
  if (target <= 0) return [];
  const maxPerOutcode = options.maxPerOutcode ?? 5;

  const picked: T[] = [];
  const outcodeCount = new Map<string, number>();

  const walk = (predicate: (row: T) => boolean) => {
    for (const row of eligible) {
      if (picked.length >= target) return;
      if (!predicate(row)) continue;
      const oc = outcodeOf(row.postcode);
      if (oc) {
        const c = outcodeCount.get(oc) ?? 0;
        if (c >= maxPerOutcode) continue;
        outcodeCount.set(oc, c + 1);
      }
      picked.push(row);
    }
  };

  // Pass 1: named installers, in the order the caller gave us.
  walk((r) => r.first_name !== null && r.first_name !== "");

  // Pass 2: unnamed installers fill any leftover capacity.
  walk((r) => r.first_name === null || r.first_name === "");

  return picked;
}
