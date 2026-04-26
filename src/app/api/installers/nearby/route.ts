import { NextResponse } from "next/server";
import { findNearby } from "@/lib/services/installers";
import {
  NearbyInstallersRequestSchema,
  type NearbyInstallersResponse,
} from "@/lib/schemas/installers";

// POST /api/installers/nearby
//
// Returns a paginated, distance-ordered list of MCS-certified installers
// matching the user's capability filter. Used by the report's
// Book a site visit tab.

export const runtime = "nodejs";
export const maxDuration = 15;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<NearbyInstallersResponse>(
      {
        ok: false,
        installers: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        error: "Invalid JSON",
      },
      { status: 400 },
    );
  }

  const parsed = NearbyInstallersRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<NearbyInstallersResponse>(
      {
        ok: false,
        installers: [],
        totalCount: 0,
        page: 1,
        pageSize: 10,
        error:
          parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  if (!input.wantsHeatPump && !input.wantsSolar && !input.wantsBattery) {
    return NextResponse.json<NearbyInstallersResponse>(
      {
        ok: false,
        installers: [],
        totalCount: 0,
        page: input.page,
        pageSize: input.pageSize,
        error:
          "Pick at least one technology so we can match you to the right specialists.",
      },
      { status: 400 },
    );
  }

  try {
    const { installers, totalCount } = await findNearby(input);
    return NextResponse.json<NearbyInstallersResponse>({
      ok: true,
      installers,
      totalCount,
      page: input.page,
      pageSize: input.pageSize,
    });
  } catch (err) {
    console.error("[installers/nearby] failed", err);
    return NextResponse.json<NearbyInstallersResponse>(
      {
        ok: false,
        installers: [],
        totalCount: 0,
        page: input.page,
        pageSize: input.pageSize,
        error:
          err instanceof Error ? err.message : "Could not load installers",
      },
      { status: 500 },
    );
  }
}
