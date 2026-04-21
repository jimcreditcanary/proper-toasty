import { NextResponse } from "next/server";
import { getPlaceDetails } from "@/lib/services/places";
import { validatePostcode } from "@/lib/services/postcodes";
import { PlaceDetailsRequestSchema } from "@/lib/schemas/places";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlaceDetailsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const details = await getPlaceDetails(parsed.data.placeId, parsed.data.sessionToken);
    const postcodeLookup = details.postcode
      ? await validatePostcode(details.postcode).catch(() => null)
      : null;

    return NextResponse.json({
      details,
      country: postcodeLookup?.country ?? null,
      postcodeValidated: postcodeLookup,
    });
  } catch (err) {
    console.error("place details error", err);
    return NextResponse.json({ error: "Place details failed" }, { status: 502 });
  }
}
