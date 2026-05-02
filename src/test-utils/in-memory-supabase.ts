// Stateful in-memory Supabase admin-client mock for integration
// tests. Unlike makeMockAdmin (which returns canned per-call
// responses), this one persists writes across calls — so a row
// inserted in step 1 is visible to a select in step 5.
//
// Coverage: enough of the QueryBuilder surface to handle the
// installer journey (insert / select / update / delete / eq /
// gte / lte / not / in / order / limit / maybeSingle / single).
// RPC + auth.admin are also implemented.
//
// NOT implemented: joins, aggregations beyond count: exact, ilike,
// or, multi-column ordering. If a test needs those, extend here.
//
// All filters are AND-ed. `.in()` is array membership. `.not("col",
// "is", null)` filters out NULLs (mimics Supabase's IS NOT NULL).
//
// Usage:
//   const db = new InMemoryDb({
//     installers: [{ id: 100, user_id: "u1", ... }],
//     users: [{ id: "u1", credits: 30, ... }],
//   });
//   db.registerRpc("deduct_credits", ({ p_user_id, p_count }, store) => {
//     const u = store.tables.users.find((r) => r.id === p_user_id);
//     if (!u || (u.credits as number) < p_count) return { data: false };
//     u.credits = (u.credits as number) - p_count;
//     return { data: true };
//   });
//   const admin = db.adminClient();

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { randomUUID } from "node:crypto";

type Row = Record<string, unknown>;
type Filter =
  | { type: "eq"; col: string; val: unknown }
  | { type: "neq"; col: string; val: unknown }
  | { type: "gte"; col: string; val: unknown }
  | { type: "gt"; col: string; val: unknown }
  | { type: "lte"; col: string; val: unknown }
  | { type: "lt"; col: string; val: unknown }
  | { type: "in"; col: string; vals: unknown[] }
  | { type: "ilike"; col: string; pattern: string }
  | { type: "is_not_null"; col: string }
  | { type: "is_null"; col: string };

type RpcImpl = (
  args: Record<string, unknown>,
  db: InMemoryDb,
) => { data: unknown; error: { message: string } | null };

interface AuthUser {
  id: string;
  email: string | null;
}

export class InMemoryDb {
  tables: Record<string, Row[]>;
  authUsers: Record<string, AuthUser> = {};
  rpcImpls: Record<string, RpcImpl> = {};
  /** Per-table column defaults applied on insert when the column
   *  isn't explicitly supplied. Mirrors `default 'pending'` etc. */
  tableDefaults: Record<string, Row> = {};

  constructor(seed: Record<string, Row[]> = {}) {
    // Defensive copy so the seed object isn't mutated externally.
    this.tables = {};
    for (const k of Object.keys(seed)) this.tables[k] = seed[k].map((r) => ({ ...r }));
  }

  /** Configure DB defaults applied on insert. Won't override
   *  fields the inserter explicitly sets. */
  setDefaults(table: string, defaults: Row): void {
    this.tableDefaults[table] = defaults;
  }

  registerRpc(name: string, impl: RpcImpl): void {
    this.rpcImpls[name] = impl;
  }
  registerAuthUser(user: AuthUser): void {
    this.authUsers[user.id] = user;
  }

  /** All rows in `table` matching every filter. */
  private query(table: string, filters: Filter[]): Row[] {
    const rows = this.tables[table] ?? [];
    return rows.filter((row) => filters.every((f) => matches(row, f)));
  }

  /** Returns the chainable query builder + a SupabaseClient-shaped
   *  facade that delegates from()/rpc()/auth.admin to this store. */
  adminClient(): SupabaseClient<Database> {
    const store = this;
    return {
      from: (table: string) => buildChain(store, table),
      rpc: async (name: string, args?: Record<string, unknown>) => {
        const impl = store.rpcImpls[name];
        if (!impl) {
          return { data: null, error: { message: `unknown rpc: ${name}` } };
        }
        return impl(args ?? {}, store);
      },
      auth: {
        admin: {
          getUserById: async (id: string) => {
            const u = store.authUsers[id];
            if (!u) return { data: { user: null }, error: null };
            return { data: { user: u }, error: null };
          },
        },
      },
    } as unknown as SupabaseClient<Database>;
  }

  /** Public for tests that want to inspect state directly. */
  rowsIn(table: string): Row[] {
    return this.tables[table] ?? [];
  }
}

// ─── Filter matcher ─────────────────────────────────────────────────

function matches(row: Row, f: Filter): boolean {
  switch (f.type) {
    case "eq":
      return row[f.col] === f.val;
    case "neq":
      return row[f.col] !== f.val;
    case "gte":
      return cmp(row[f.col], f.val) >= 0;
    case "gt":
      return cmp(row[f.col], f.val) > 0;
    case "lte":
      return cmp(row[f.col], f.val) <= 0;
    case "lt":
      return cmp(row[f.col], f.val) < 0;
    case "in":
      return f.vals.includes(row[f.col]);
    case "ilike": {
      // Postgres ilike — `%` is wildcard, case-insensitive.
      const v = row[f.col];
      if (typeof v !== "string") return false;
      const re = new RegExp(
        "^" +
          f.pattern
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            .replace(/%/g, ".*") +
          "$",
        "i",
      );
      return re.test(v);
    }
    case "is_not_null":
      return row[f.col] !== null && row[f.col] !== undefined;
    case "is_null":
      return row[f.col] === null || row[f.col] === undefined;
  }
}

function cmp(a: unknown, b: unknown): number {
  // Strings: ISO timestamps compare correctly lexicographically;
  // also handles plain strings + numerics.
  if (typeof a === "string" && typeof b === "string") {
    return a < b ? -1 : a > b ? 1 : 0;
  }
  const an = Number(a);
  const bn = Number(b);
  if (Number.isFinite(an) && Number.isFinite(bn)) return an - bn;
  return 0;
}

// ─── Query builder ──────────────────────────────────────────────────

interface BuilderState {
  filters: Filter[];
  selectCols: string;
  selectOpts: { count?: "exact"; head?: boolean };
  order?: { col: string; ascending: boolean };
  limit?: number;
  isSingle: boolean;
  isMaybeSingle: boolean;
  // Mutator state
  mode: "select" | "insert" | "update" | "delete";
  insertRows?: Row[];
  updatePatch?: Row;
}

function buildChain(store: InMemoryDb, table: string) {
  const state: BuilderState = {
    filters: [],
    selectCols: "*",
    selectOpts: {},
    isSingle: false,
    isMaybeSingle: false,
    mode: "select",
  };

  const chain = {
    select: (cols = "*", opts: { count?: "exact"; head?: boolean } = {}) => {
      state.selectCols = cols;
      state.selectOpts = opts;
      // After a mutator, .select() switches to "return the result".
      // The mode stays as the original mutator so .then knows what
      // to do — we just remember the cols to project.
      return chain;
    },
    insert: (rowOrRows: Row | Row[]) => {
      state.mode = "insert";
      state.insertRows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
      return chain;
    },
    update: (patch: Row) => {
      state.mode = "update";
      state.updatePatch = patch;
      return chain;
    },
    delete: () => {
      state.mode = "delete";
      return chain;
    },
    eq: (col: string, val: unknown) => (state.filters.push({ type: "eq", col, val }), chain),
    neq: (col: string, val: unknown) => (state.filters.push({ type: "neq", col, val }), chain),
    gte: (col: string, val: unknown) => (state.filters.push({ type: "gte", col, val }), chain),
    gt: (col: string, val: unknown) => (state.filters.push({ type: "gt", col, val }), chain),
    lte: (col: string, val: unknown) => (state.filters.push({ type: "lte", col, val }), chain),
    lt: (col: string, val: unknown) => (state.filters.push({ type: "lt", col, val }), chain),
    in: (col: string, vals: unknown[]) =>
      (state.filters.push({ type: "in", col, vals }), chain),
    ilike: (col: string, pattern: string) =>
      (state.filters.push({ type: "ilike", col, pattern }), chain),
    not: (col: string, op: string, val: unknown) => {
      if (op === "is" && val === null) {
        state.filters.push({ type: "is_not_null", col });
      } else {
        // Fallback: treat as != val
        state.filters.push({ type: "neq", col, val });
      }
      return chain;
    },
    is: (col: string, val: unknown) => {
      if (val === null) state.filters.push({ type: "is_null", col });
      return chain;
    },
    order: (col: string, opts: { ascending?: boolean } = {}) => {
      state.order = { col, ascending: opts.ascending !== false };
      return chain;
    },
    limit: (n: number) => ((state.limit = n), chain),
    maybeSingle: () => ((state.isMaybeSingle = true), chain),
    single: () => ((state.isSingle = true), chain),
    then: (
      onFulfilled?: (value: {
        data: unknown;
        error: { message: string } | null;
        count?: number | null;
      }) => unknown,
    ) => Promise.resolve(execute(store, table, state)).then(onFulfilled as never),
  };
  return chain;
}

function execute(
  store: InMemoryDb,
  table: string,
  state: BuilderState,
): { data: unknown; error: { message: string } | null; count?: number | null } {
  const rows = store.tables[table] ?? (store.tables[table] = []);

  if (state.mode === "insert") {
    const inserted: Row[] = [];
    const defaults = store.tableDefaults[table] ?? {};
    for (const r of state.insertRows ?? []) {
      // Apply table defaults first, then explicit values (so the
      // inserter wins). Final overlay sets baseline metadata.
      const row: Row = {
        ...defaults,
        ...r,
        id: (r.id as string) ?? randomUUID(),
        created_at: (r.created_at as string) ?? new Date().toISOString(),
        updated_at: (r.updated_at as string) ?? new Date().toISOString(),
      };
      rows.push(row);
      inserted.push(row);
    }
    if (state.isSingle || state.isMaybeSingle) {
      return { data: inserted[0] ?? null, error: null };
    }
    return { data: inserted, error: null };
  }

  if (state.mode === "update") {
    const matched = rows.filter((row) =>
      state.filters.every((f) => matches(row, f)),
    );
    for (const row of matched) {
      Object.assign(row, state.updatePatch ?? {});
      row.updated_at = new Date().toISOString();
    }
    if (state.isSingle || state.isMaybeSingle) {
      return { data: matched[0] ?? null, error: null };
    }
    return { data: matched, error: null };
  }

  if (state.mode === "delete") {
    const before = rows.length;
    const remaining = rows.filter((row) =>
      !state.filters.every((f) => matches(row, f)),
    );
    store.tables[table] = remaining;
    return { data: null, error: null, count: before - remaining.length };
  }

  // select
  let result = rows.filter((row) => state.filters.every((f) => matches(row, f)));
  if (state.order) {
    const { col, ascending } = state.order;
    result = [...result].sort((a, b) => {
      const c = cmp(a[col], b[col]);
      return ascending ? c : -c;
    });
  }
  if (state.limit != null) result = result.slice(0, state.limit);

  if (state.isSingle || state.isMaybeSingle) {
    return { data: result[0] ?? null, error: null };
  }

  if (state.selectOpts.count === "exact" && state.selectOpts.head) {
    return { data: null, error: null, count: result.length };
  }
  if (state.selectOpts.count === "exact") {
    return { data: result, error: null, count: result.length };
  }
  return { data: result, error: null };
}
