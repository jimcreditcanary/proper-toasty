import { NextResponse } from "next/server";
import { ALLOWED_MIME, MAX_BYTES, uploadFloorplan } from "@/lib/services/floorplan";

export const runtime = "nodejs";

// Next.js body size limits: set via the route segment config if we push
// post-resize payloads near the default 4.5 MB limit.
export const maxDuration = 30;

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing 'file' field" }, { status: 400 });
  }

  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Only JPG or PNG floorplans are supported. Please save your PDF as an image first." },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (10 MB max)" }, { status: 413 });
  }

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { objectKey } = await uploadFloorplan(bytes, file.type);
    return NextResponse.json({ objectKey, bytes: bytes.byteLength });
  } catch (err) {
    console.error("floorplan upload error", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
