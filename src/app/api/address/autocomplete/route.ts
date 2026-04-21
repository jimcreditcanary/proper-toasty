import { NextResponse } from "next/server";
import { autocompleteAddress } from "@/lib/services/places";
import { PlacesAutocompleteRequestSchema } from "@/lib/schemas/places";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PlacesAutocompleteRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const suggestions = await autocompleteAddress(parsed.data.input, parsed.data.sessionToken);
    return NextResponse.json({ suggestions });
  } catch (err) {
    console.error("autocomplete error", err);
    return NextResponse.json({ error: "Autocomplete failed" }, { status: 502 });
  }
}
