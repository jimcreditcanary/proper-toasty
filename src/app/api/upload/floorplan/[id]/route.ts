// GET /api/upload/floorplan/[id]
//
// Returns the validated extract for a floorplan_uploads row. Used by
// the wizard's Step 4 to fetch the canonical extract back after the
// POST returns just { id }, so the client can store the typed shape
// in wizard state without trusting whatever the POST response body
// happened to say.
//
// Open by default — the v1 path is anonymous and the upload id is
// already a UUID. When auth ties uploads to homeowners, this gates
// on user_id ownership.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

interface OkResponse {
  ok: true;
  status: "extracting" | "complete" | "failed";
  extract: unknown | null;
  failure_reason: string | null;
}

interface FailResponse {
  ok: false;
  error: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<OkResponse | FailResponse>> {
  const { id } = await params;
  if (!id) {
    return NextResponse.json<FailResponse>(
      { ok: false, error: "Missing id" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("floorplan_uploads")
    .select("status, extract, failure_reason")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.error("[upload/floorplan/:id] lookup failed", error);
    return NextResponse.json<FailResponse>(
      { ok: false, error: "Database error" },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json<FailResponse>(
      { ok: false, error: "Not found" },
      { status: 404 },
    );
  }

  return NextResponse.json<OkResponse>({
    ok: true,
    status: data.status,
    extract: data.extract,
    failure_reason: data.failure_reason,
  });
}
