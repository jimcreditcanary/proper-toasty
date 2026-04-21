import { NextResponse } from "next/server";
import { z } from "zod";
import { getEpc } from "@/lib/services/epc";

export const runtime = "nodejs";

const RequestSchema = z
  .object({
    uprn: z.string().min(1).max(12).optional(),
    postcode: z.string().min(2).max(10).optional(),
    addressLine1: z.string().min(1).max(200).optional(),
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
    const result = await getEpc(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("epc by-address error", err);
    return NextResponse.json({ error: "EPC lookup failed" }, { status: 502 });
  }
}
