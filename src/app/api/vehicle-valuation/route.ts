import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";
import type { DvlaVehicleData, VehicleValuation } from "@/components/wizard/types";

/**
 * AI vehicle valuation. Takes a DVLA record and asks Claude to estimate a
 * fair UK market price range plus any warnings worth flagging.
 *
 * This is called both from the wizard (for the preview card on the result
 * page) and from runVerification when the user opts into the
 * "AI Vehicle Valuation" check.
 */

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { dvla?: DvlaVehicleData };
    const dvla = body?.dvla;

    if (!dvla || !dvla.registrationNumber) {
      return NextResponse.json(
        { error: "Missing DVLA vehicle data" },
        { status: 400 }
      );
    }

    const prompt = `You are an expert UK used vehicle valuation analyst. Using the DVLA data provided and your knowledge of the UK used car market, provide a fair market valuation.

DVLA Data:
- Registration: ${dvla.registrationNumber}
- Make: ${dvla.make ?? "unknown"}
- Colour: ${dvla.colour ?? "unknown"}
- Fuel Type: ${dvla.fuelType ?? "unknown"}
- Engine Capacity: ${dvla.engineCapacity ?? "unknown"}cc
- Year of Manufacture: ${dvla.yearOfManufacture ?? "unknown"}
- First Registered: ${dvla.monthOfFirstRegistration ?? "unknown"}
- CO2 Emissions: ${dvla.co2Emissions ?? "unknown"} g/km
- Tax Status: ${dvla.taxStatus ?? "unknown"}
- MOT Status: ${dvla.motStatus ?? "unknown"}
- Euro Status: ${dvla.euroStatus ?? "unknown"}
- Type Approval: ${dvla.typeApproval ?? "unknown"}
- Revenue Weight: ${dvla.revenueWeight ?? "unknown"}kg
- Marked for Export: ${dvla.markedForExport === true ? "YES" : "no"}
- Wheelplan: ${dvla.wheelplan ?? "unknown"}
- Last V5C Issued: ${dvla.dateOfLastV5CIssued ?? "unknown"}

Respond in JSON only, no markdown, no preamble:
{
  "estimatedValueLow": <number in GBP \u2014 lower bound of fair market range>,
  "estimatedValueMid": <number in GBP \u2014 midpoint estimate>,
  "estimatedValueHigh": <number in GBP \u2014 upper bound of fair market range>,
  "confidence": "<low|medium|high>",
  "factors": [
    "<factor 1 affecting valuation>",
    "<factor 2>",
    "<factor 3>"
  ],
  "warnings": [
    "<any red flags, e.g. frequent V5C changes, export marker, unusual tax status>"
  ],
  "summary": "<2-3 sentence plain English summary of the valuation and what to watch out for>"
}

Important:
- Base your estimate on typical UK retail prices for this make, year, fuel type, and engine size
- Factor in the age of the vehicle (years since manufacture and first registration)
- Consider fuel type market trends (e.g. diesel depreciation, EV premiums)
- Flag if the V5C has been reissued recently (potential ownership churn)
- Flag if marked for export
- If MOT status is missing or expired, note this as a risk factor
- If tax is untaxed, note this \u2014 it may indicate the vehicle is off-road or has issues
- Be conservative \u2014 it's better to undervalue slightly than overvalue
- You do NOT have mileage data, so caveat your estimate accordingly`;

    const msg = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return NextResponse.json(
        { error: "Could not parse valuation response" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(match[0]);
    const valuation: VehicleValuation = {
      estimatedValueLow: Number(parsed.estimatedValueLow) || 0,
      estimatedValueMid: Number(parsed.estimatedValueMid) || 0,
      estimatedValueHigh: Number(parsed.estimatedValueHigh) || 0,
      confidence:
        parsed.confidence === "high"
          ? "high"
          : parsed.confidence === "medium"
            ? "medium"
            : "low",
      factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 10) : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 10) : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
    };

    return NextResponse.json({ valuation });
  } catch (err) {
    console.error("Vehicle valuation error:", err);
    return NextResponse.json(
      { error: "Unable to value that vehicle right now" },
      { status: 500 }
    );
  }
}
