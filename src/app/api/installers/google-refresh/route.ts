// POST /api/installers/google-refresh
//
// Town pages call this when they render installer cards. Body:
//   { ids: number[] }   (currently-shown installer ids, up to 50)
//
// For each id we:
//   1. Read the cached google_* fields.
//   2. If the row is fresh (≤ 30 days), do nothing — return cached.
//   3. If stale OR never fetched, hit Google Places (two-stage:
//      Text Search → Place Details), persist, and return the new
//      value.
//
// Bounded parallelism (PARALLEL = 5) to keep memory + simultaneous
// outbound calls in check. The Google Places API allows up to 600 QPS;
// nowhere close.
//
// Failures persist with status='error: ...' / 'not_found' /
// 'quota_exceeded' so we don't retry within the cache window. The UI
// hides the Google rating row when status != 'ok'.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchGoogleReviewsForInstaller,
  persistGoogleResult,
  shouldRefreshGoogle,
  type CachedGoogleReview,
} from "@/lib/services/google-places";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(50),
});

const PARALLEL = 5;

interface ResponseRow {
  id: number;
  googleRating: number | null;
  googleReviewCount: number | null;
  googleStatus: string | null;
  googleCapturedAt: string | null;
}

async function processOne(
  id: number,
  cached: CachedGoogleReview,
  installer: { company_name: string; postcode: string | null },
): Promise<ResponseRow> {
  // Short-circuit if cache is fresh.
  if (!shouldRefreshGoogle(cached.capturedAt)) {
    return {
      id,
      googleRating: cached.rating,
      googleReviewCount: cached.reviewCount,
      googleStatus: cached.status,
      googleCapturedAt: cached.capturedAt,
    };
  }

  const result = await fetchGoogleReviewsForInstaller({
    companyName: installer.company_name,
    postcode: installer.postcode,
    cachedPlaceId: cached.placeId,
  });
  await persistGoogleResult(id, result);

  return {
    id,
    googleRating: result.rating,
    googleReviewCount: result.reviewCount,
    googleStatus: result.status,
    googleCapturedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = RequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows, error } = await (admin as any)
    .from("installers")
    .select(
      "id, company_name, postcode, google_place_id, google_rating, google_review_count, google_captured_at, google_status",
    )
    .in("id", parsed.data.ids);

  if (error) {
    console.error("[google-refresh] query failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  type Row = {
    id: number;
    company_name: string;
    postcode: string | null;
    google_place_id: string | null;
    google_rating: number | null;
    google_review_count: number | null;
    google_captured_at: string | null;
    google_status: string | null;
  };

  const work: Array<{
    id: number;
    cached: CachedGoogleReview;
    installer: { company_name: string; postcode: string | null };
  }> = (rows ?? []).map((r: Row) => ({
    id: r.id,
    cached: {
      rating: r.google_rating != null ? Number(r.google_rating) : null,
      reviewCount: r.google_review_count,
      placeId: r.google_place_id,
      capturedAt: r.google_captured_at,
      status: r.google_status,
    },
    installer: { company_name: r.company_name, postcode: r.postcode },
  }));

  // Process in chunks of PARALLEL. Bounded outbound calls + bounded
  // memory if Places ever returns a huge payload for some reason.
  const out: ResponseRow[] = [];
  for (let i = 0; i < work.length; i += PARALLEL) {
    const chunk = work.slice(i, i + PARALLEL);
    const results = await Promise.all(
      chunk.map((w) => processOne(w.id, w.cached, w.installer)),
    );
    out.push(...results);
  }

  return NextResponse.json({ ok: true, results: out });
}
