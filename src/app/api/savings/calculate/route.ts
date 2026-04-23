import { NextResponse } from "next/server";
import { z } from "zod";
import { AnalyseResponseSchema } from "@/lib/schemas/analyse";
import { FuelTariffSchema } from "@/lib/schemas/bill";
import { buildCalculatorRequest, callCalculator } from "@/lib/services/savings";

// POST /api/savings/calculate
//
// Body: the AnalyseResponse from Step 5 + the per-fuel tariffs + the
// user-controlled inputs from the report-page calculator UI (toggles + sliders).
//
// Returns a SavingsCalculateResult — never 500s on Octopus failure; instead
// the result envelope carries `ok: false` + an error string the UI can render.

export const runtime = "nodejs";
export const maxDuration = 30;

const RequestBodySchema = z.object({
  analysis: AnalyseResponseSchema,
  electricityTariff: FuelTariffSchema.nullable(),
  gasTariff: FuelTariffSchema.nullable(),
  inputs: z.object({
    hasSolar: z.boolean(),
    hasBattery: z.boolean(),
    hasHeatPump: z.boolean(),
    batteryKwh: z.number().nonnegative().optional(),
    years: z.number().int().min(1).max(50).optional(),
    exportPrice: z.number().nonnegative().optional(),
    solarLoanTermYears: z.number().int().min(1).optional(),
    batteryLoanTermYears: z.number().int().min(1).optional(),
  }),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { analysis, electricityTariff, gasTariff, inputs } = parsed.data;

  let request;
  try {
    request = buildCalculatorRequest(analysis, electricityTariff, gasTariff, inputs);
  } catch (e) {
    return NextResponse.json(
      {
        error: "Failed to build calculator request",
        details: e instanceof Error ? e.message : String(e),
      },
      { status: 400 },
    );
  }

  const result = await callCalculator(request);
  return NextResponse.json(result);
}
