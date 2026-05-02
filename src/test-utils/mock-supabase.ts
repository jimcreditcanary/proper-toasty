// Tiny Supabase admin-client mock for unit tests.
//
// Captures the chain pattern (.from().select().eq().gte()...) and
// returns predetermined data per table. Per-table FIFO queue so a
// test that issues two selects against the same table can stage
// distinct responses (e.g. billing's "window query" vs "YTD count").
//
// Filters (eq / gte / not / in / order / limit) are no-ops — the
// fixture data is presumed pre-filtered by the caller. We're
// testing aggregation logic, not the query chain itself.
//
// Type-asserted via `unknown as SupabaseClient` because mocking the
// full surface is more code than the mock itself.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface MockTableResponse {
  data?: unknown[] | null;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

export interface MockSingleResponse {
  data?: unknown | null;
  error?: { message: string; code?: string } | null;
}

type AnyResponse = MockTableResponse | MockSingleResponse;

export function makeMockAdmin(
  byTable: Record<string, AnyResponse[]>,
): SupabaseClient<Database> {
  // Clone the queues so the caller's fixture object isn't mutated.
  const queues: Record<string, AnyResponse[]> = {};
  for (const k of Object.keys(byTable)) queues[k] = [...byTable[k]];

  const buildChain = (response: AnyResponse) => {
    const resolved = {
      data:
        (response as MockTableResponse).data === undefined
          ? null
          : (response as MockTableResponse).data,
      error: response.error ?? null,
      count: (response as MockTableResponse).count ?? null,
    };
    // Each chain method returns `this` so any sequence of filters
    // resolves to the same value. `.then()` makes the chain
    // awaitable (Supabase's QueryBuilder is also a thenable).
    type Chain = {
      select: (...a: unknown[]) => Chain;
      eq: (...a: unknown[]) => Chain;
      gte: (...a: unknown[]) => Chain;
      lte: (...a: unknown[]) => Chain;
      lt: (...a: unknown[]) => Chain;
      gt: (...a: unknown[]) => Chain;
      not: (...a: unknown[]) => Chain;
      in: (...a: unknown[]) => Chain;
      order: (...a: unknown[]) => Chain;
      limit: (...a: unknown[]) => Chain;
      maybeSingle: () => Chain;
      single: () => Chain;
      // Mutators — not used by aggregation queries but stubbed so
      // tests for write paths can use the same mock.
      insert: (...a: unknown[]) => Chain;
      update: (...a: unknown[]) => Chain;
      delete: (...a: unknown[]) => Chain;
      then: <T>(
        onFulfilled?: (
          value: typeof resolved,
        ) => T | PromiseLike<T>,
      ) => Promise<T>;
    };
    const c: Chain = {
      select: () => c,
      eq: () => c,
      gte: () => c,
      lte: () => c,
      lt: () => c,
      gt: () => c,
      not: () => c,
      in: () => c,
      order: () => c,
      limit: () => c,
      maybeSingle: () => c,
      single: () => c,
      insert: () => c,
      update: () => c,
      delete: () => c,
      then: (onFulfilled) =>
        Promise.resolve(resolved).then(onFulfilled as never),
    };
    return c;
  };

  return {
    from: (table: string) => {
      const queue = queues[table];
      if (!queue || queue.length === 0) {
        // Default to an empty result rather than throwing — keeps
        // tests resilient to queries the test author didn't anticipate
        // (e.g. lazy-expiry sweep on the pre-survey-requests page).
        return buildChain({ data: [], error: null });
      }
      const next = queue.shift()!;
      return buildChain(next);
    },
  } as unknown as SupabaseClient<Database>;
}
