import { NextResponse } from "next/server";
import { z } from "zod";
import { getEpc } from "@/lib/services/epc";

export const runtime = "nodejs";

// `uprn` accepts string or null. Null means OS Places didn't return one
// (rare — only seen on brand-new builds before AddressBase ingest). The
// route falls back to postcode+address matching, scored against
// `addressFull` if present (richer than line1 for multi-flat blocks)
// and `addressLine1` otherwise.
const RequestSchema = z
  .object({
    uprn: z.string().max(12).nullable().optional(),
    postcode: z.string().min(2).max(10).optional(),
    addressLine1: z.string().min(1).max(200).optional(),
    addressFull: z.string().min(1).max(400).optional(),
  })
  .refine((v) => v.uprn || (v.postcode && v.addressLine1), {
    message: "Provide uprn, or both postcode and addressLine1",
  });

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const result = await getEpc({
      uprn: parsed.data.uprn ?? null,
      postcode: parsed.data.postcode ?? null,
      addressLine1: parsed.data.addressLine1 ?? null,
      addressFull: parsed.data.addressFull ?? null,
    });
    // The route returns 200 in both found / not-found cases — that's
    // the right semantic, but it makes "no data came back" hard to
    // diagnose from logs alone. Log the outcome explicitly with
    // the input + reason so we can see WHY the wizard saw a
    // found:false response without having to re-run the request.
    if (!result.found) {
      console.warn("[epc/by-address] not found", {
        uprn: parsed.data.uprn ?? null,
        postcode: parsed.data.postcode ?? null,
        addressLine1: parsed.data.addressLine1 ?? null,
        reason: result.reason,
      });
    } else {
      console.log("[epc/by-address] found", {
        uprn: parsed.data.uprn ?? null,
        postcode: parsed.data.postcode ?? null,
        matchMethod: result.matchMethod,
        certBand: result.certificate.currentEnergyBand,
      });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[epc/by-address] error", {
      uprn: parsed.data.uprn ?? null,
      postcode: parsed.data.postcode ?? null,
      addressLine1: parsed.data.addressLine1 ?? null,
      err: err instanceof Error ? err.message : err,
    });
    return NextResponse.json({ error: "EPC lookup failed" }, { status: 502 });
  }
}
