import { NextResponse } from "next/server";
import { validatePostcode } from "@/lib/services/postcodes";
import { PostcodeValidateRequestSchema } from "@/lib/schemas/postcodes";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = PostcodeValidateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await validatePostcode(parsed.data.postcode);
    if (!result) return NextResponse.json({ error: "Postcode not found" }, { status: 404 });
    return NextResponse.json({ result });
  } catch (err) {
    console.error("postcode validate error", err);
    return NextResponse.json({ error: "Validation failed" }, { status: 502 });
  }
}
