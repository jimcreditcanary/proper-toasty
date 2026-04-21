import { NextResponse } from "next/server";
import { parseBill } from "@/lib/services/claude-bill";
import type { BillParseResponse } from "@/lib/schemas/bill";

export const runtime = "nodejs";
export const maxDuration = 30;

const ALLOWED = new Set(["image/jpeg", "image/png"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB post-resize

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (!ALLOWED.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG or PNG bills are supported. Save a PDF page as an image first." },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (8 MB max)" }, { status: 413 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await parseBill({
      data: buffer.toString("base64"),
      mediaType: file.type as "image/jpeg" | "image/png",
    });

    const response: BillParseResponse = result.analysis
      ? { ok: true, analysis: result.analysis }
      : { ok: false, reason: result.reason ?? "Couldn't extract figures" };

    return NextResponse.json(response);
  } catch (err) {
    console.error("bill parse error", err);
    return NextResponse.json(
      {
        error: "Bill parsing failed",
        detail: err instanceof Error ? err.message : String(err),
      },
      { status: 502 }
    );
  }
}
