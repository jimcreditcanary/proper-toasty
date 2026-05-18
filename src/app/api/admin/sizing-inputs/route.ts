// POST /api/admin/sizing-inputs
//
// Body: { inputs: Partial<SizingInputs> }
//
// Upserts each provided field into public.admin_settings under
// `sizing_input.<field>`. Missing fields are left untouched (partial
// update), so saving one slider doesn't blow away the rest.
//
// Per-field validation lives in isValidSizingValue — same rules as
// the read path so the write path can't poison the cache.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/require-admin";
import {
  DEFAULT_SIZING_INPUTS,
  SIZING_INPUT_KEY_PREFIX,
  isValidSizingValue,
  type SizingInputs,
} from "@/lib/admin/sizing-inputs";

export const runtime = "nodejs";

// Build schema from DEFAULT_SIZING_INPUTS so a new field is a
// one-place change (sizing-inputs.ts) — the API can't silently
// drop a key the form is sending.
const InputFields = Object.keys(
  DEFAULT_SIZING_INPUTS,
) as (keyof SizingInputs)[];

const InputSchema = z
  .object(
    Object.fromEntries(
      InputFields.map((k) => [k, z.number().finite().optional()]),
    ),
  )
  .strict();

const BodySchema = z.object({
  inputs: InputSchema,
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

  // Reject any field that fails its per-field rule (e.g. percentage
  // out of 0–1, sizing rule-of-thumb at zero). One bad field fails
  // the whole request so the form can show a precise error.
  const rejected: string[] = [];
  for (const [field, value] of Object.entries(parsed.data.inputs)) {
    if (typeof value !== "number") continue;
    if (!isValidSizingValue(field as keyof SizingInputs, value)) {
      rejected.push(field);
    }
  }
  if (rejected.length > 0) {
    return NextResponse.json(
      {
        error: `Invalid value for: ${rejected.join(", ")}`,
        rejected,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const rows = Object.entries(parsed.data.inputs)
    .filter(([, v]) => typeof v === "number" && Number.isFinite(v))
    .map(([k, v]) => ({
      key: `${SIZING_INPUT_KEY_PREFIX}${k}`,
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
    console.error("[admin/sizing-inputs] upsert failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: rows.length });
}
