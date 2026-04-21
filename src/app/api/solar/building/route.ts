import { NextResponse } from "next/server";
import { z } from "zod";
import { getBuildingInsights } from "@/lib/services/solar";

export const runtime = "nodejs";

const RequestSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
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
    const result = await getBuildingInsights(parsed.data.lat, parsed.data.lng);
    return NextResponse.json(result);
  } catch (err) {
    console.error("solar building error", err);
    return NextResponse.json({ error: "Solar lookup failed" }, { status: 502 });
  }
}
