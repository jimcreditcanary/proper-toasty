// POST /api/savings/calculate
//
// Pure-computation endpoint backing the Savings tab. Takes the
// homeowner's current energy figures + planned improvements, returns
// a 10-year projection across 4 financing scenarios (do nothing,
// finance, pay upfront, add to mortgage).
//
// Idempotent + stateless — same inputs always produce the same
// response. No DB, no auth (we may rate-limit later if it gets
// hit hard from outside our app, but for v1 it's fine in the open).
//
// All inputs have defaults — POST with `{}` (or empty body) returns
// a default-driven projection. Useful for smoke tests + quick
// previews before the wizard data is ready.
//
// Schema lives in src/lib/savings/scenarios-schema.ts.
// Engine lives in src/lib/savings/scenarios.ts.

import { NextResponse } from "next/server";
import { CalculateRequestSchema } from "@/lib/savings/scenarios-schema";
import { calculateScenarios } from "@/lib/savings/scenarios";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Empty body → use all defaults. Bad JSON → 400. Anything else
  // goes through Zod for shape + range validation (battery size
  // must be 0/3/5/10, percentages 0-1, etc.).
  let body: unknown = {};
  const text = await req.text();
  if (text.trim().length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 },
      );
    }
  }

  const parsed = CalculateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  try {
    const result = calculateScenarios(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    // Pure-computation failure should be impossible — log so we
    // catch any future regression in Sentry.
    console.error("[savings/calculate] compute failed", err);
    return NextResponse.json(
      { error: "Calculation failed" },
      { status: 500 },
    );
  }
}
