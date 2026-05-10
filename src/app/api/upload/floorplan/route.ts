// POST /api/upload/floorplan
//
// V2 upload-only flow. Single endpoint:
//   1. Validate the multipart upload (PNG/JPG, ≤10 MB).
//   2. Upload bytes to the existing `floorplans` bucket.
//   3. SHA-256 hash for failure-correlation.
//   4. Insert public.floorplan_uploads row at status='extracting'.
//   5. Run extractFloorplan() — Sonnet vision call + Zod validation
//      with one retry on schema fail.
//   6. Update the row to 'complete' (with extract) OR 'failed' (with
//      failure_reason). Either way return { id } so the client can
//      navigate to /report/[id]; the page handles the failure state.
//
// Sync rather than queued because:
//   - Vercel functions have plenty of headroom (60s on hobby, 300s
//     on pro) and Sonnet vision typically lands in 15-25s.
//   - Spec target is ~30s end-to-end, which fits comfortably.
//   - One round-trip beats client polling for v1 simplicity.

import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ALLOWED_MIME,
  MAX_BYTES,
  uploadFloorplan,
} from "@/lib/services/floorplan";
import { extractFloorplan } from "@/lib/floorplan/extract";

export const runtime = "nodejs";
// 60s caps Vercel hobby tier; bump to 120 once we move to pro.
export const maxDuration = 60;

interface UploadOk {
  ok: true;
  id: string;
  status: "complete";
}
interface UploadFail {
  ok: false;
  id?: string;
  status?: "failed";
  error: string;
}

export async function POST(req: Request): Promise<NextResponse<UploadOk | UploadFail>> {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json<UploadFail>(
      { ok: false, error: "Expected multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json<UploadFail>(
      { ok: false, error: "Missing 'file' field" },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json<UploadFail>(
      {
        ok: false,
        error:
          "Only JPG or PNG floorplans are supported. PDF support is on the roadmap; please save your PDF as an image first.",
      },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json<UploadFail>(
      { ok: false, error: "File too large (10 MB max)" },
      { status: 413 },
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const imageHash = createHash("sha256").update(bytes).digest("hex");

  // 1. Push the image to storage. Failure here is fatal — without
  //    a stored copy we can't show it on the report or triage later.
  let objectKey: string;
  try {
    const uploaded = await uploadFloorplan(bytes, file.type);
    objectKey = uploaded.objectKey;
  } catch (e) {
    console.error("[upload/floorplan] storage upload failed", e);
    return NextResponse.json<UploadFail>(
      { ok: false, error: "Couldn't store the image — try again." },
      { status: 500 },
    );
  }

  const admin = createAdminClient();

  // 2. Create the row at status='extracting'. We persist the row
  //    BEFORE the model call so a model-call failure still leaves an
  //    audit trail (image_hash + storage key) for triage.
  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const { data: row, error: insertErr } = await admin
    .from("floorplan_uploads")
    .insert({
      image_object_key: objectKey,
      image_hash: imageHash,
      image_bytes: bytes.byteLength,
      image_mime: mime,
      status: "extracting",
    })
    .select("id")
    .single();

  if (insertErr || !row) {
    console.error("[upload/floorplan] row insert failed", insertErr);
    return NextResponse.json<UploadFail>(
      { ok: false, error: "Database error — try again." },
      { status: 500 },
    );
  }

  // 3. Run the extract. This is the slow leg (~15-25s Sonnet
  //    vision). Caller blocks; spec target is ~30s end-to-end.
  const result = await extractFloorplan({ imageBytes: bytes, mimeType: mime });

  // 4. Update the row with the outcome. Either way write the model
  //    + token attribution so the cost-rates dashboard can read
  //    actuals once the per-call ledger reads from this table.
  const updateBase = {
    attempts: result.attempts,
    model: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    completed_at: new Date().toISOString(),
  };

  if (!result.ok) {
    await admin
      .from("floorplan_uploads")
      .update({
        ...updateBase,
        status: "failed",
        failure_reason: result.error,
      })
      .eq("id", row.id);

    console.warn("[upload/floorplan] extraction failed", {
      uploadId: row.id,
      imageHash,
      error: result.error,
    });

    return NextResponse.json<UploadFail>(
      {
        ok: false,
        id: row.id,
        status: "failed",
        error:
          "We couldn't read this floorplan. Try a sharper image — clearer line-work + readable room labels usually do the trick.",
      },
      { status: 422 },
    );
  }

  await admin
    .from("floorplan_uploads")
    .update({
      ...updateBase,
      status: "complete",
      // The DB column is jsonb; the generated types insist on Json so
      // we cast at the boundary. The Zod-validated extract is
      // guaranteed to be JSON-serialisable.
      extract: result.extract as unknown as never,
    })
    .eq("id", row.id);

  return NextResponse.json<UploadOk>({
    ok: true,
    id: row.id,
    status: "complete",
  });
}
