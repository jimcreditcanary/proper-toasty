import { NextResponse } from "next/server";
import { z } from "zod";
import { geocodeAddress } from "@/lib/services/geocoding";

export const runtime = "nodejs";

const RequestSchema = z.object({
  line1: z.string().min(1).max(200),
  postcode: z.string().min(2).max(10),
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
    const result = await geocodeAddress(parsed.data.line1, parsed.data.postcode);
    if (!result) {
      return NextResponse.json({ error: "Address could not be geocoded" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("geocode error", err);
    return NextResponse.json(
      { error: "Geocoding failed", detail: err instanceof Error ? err.message : String(err) },
      { status: 502 }
    );
  }
}
