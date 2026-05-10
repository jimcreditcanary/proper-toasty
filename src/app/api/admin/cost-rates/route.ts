// POST /api/admin/cost-rates
//
// Body: { rates: Partial<CostRates> }
//
// Upserts each provided rate into public.admin_settings under the
// `cost_rate.<field>` key. Missing fields are left untouched (so a
// partial update doesn't blow away other rates). Negative values
// are rejected; the P&L summariser assumes non-negative.
//
// Reads use loadCostRates(); deletes aren't needed — a rate can be
// reset to default by setting it to the default value explicitly.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  COST_RATE_KEY_PREFIX,
  DEFAULT_COST_RATES,
  type CostRates,
} from "@/lib/admin/cost-rates";

export const runtime = "nodejs";

// Build the Zod schema dynamically from DEFAULT_COST_RATES so adding
// a new rate is a one-place change (cost-rates.ts) — no risk of
// the API silently ignoring a new key the form is sending.
const RateFields = Object.keys(DEFAULT_COST_RATES) as (keyof CostRates)[];
const RateSchema = z
  .object(
    Object.fromEntries(
      RateFields.map((k) => [
        k,
        z.number().nonnegative().finite().optional(),
      ]),
    ),
  )
  .strict();

const BodySchema = z.object({
  rates: RateSchema,
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Upsert each provided rate. admin_settings has a unique key
  // constraint so onConflict="key" makes upsert atomic per rate.
  // The `value` column is `numeric` in the DB but the generated TS
  // types serialise as string (Postgres returns numerics as strings
  // by default), so we coerce to string at the boundary.
  const rows = Object.entries(parsed.data.rates)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v >= 0)
    .map(([k, v]) => ({
      key: `${COST_RATE_KEY_PREFIX}${k}`,
      value: String(v as number),
      updated_at: new Date().toISOString(),
    }));

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, updated: 0 });
  }

  const { error } = await admin
    .from("admin_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) {
    console.error("[admin/cost-rates] upsert failed", error);
    return NextResponse.json(
      { error: "Database error" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, updated: rows.length });
}
