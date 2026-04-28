import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  fetchCheckatradeForInstaller,
  persistCheckatradeResult,
  shouldRefresh,
  type CachedReview,
} from "@/lib/services/checkatrade";

// POST /api/installers/checkatrade-refresh
//
// The Book-a-visit tab calls this when it renders the visible tiles.
// Body: { ids: number[] }  (ids of currently-shown installer tiles)
//
// For each id we:
//   1. Read the cached checkatrade_* fields
//   2. If the row is fresh (≤ 90 days), do nothing
//   3. If stale, scrape Checkatrade, persist, and return the new value
//
// We process at most a handful in parallel to be polite to Checkatrade.
// Failures are persisted with status='blocked' / 'error: ...' so we
// don't keep retrying within the cache window. Returns whatever we've
// got at the end — UI updates its tiles.

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(50),
});

const PARALLEL = 3;

interface ResponseRow {
  id: number;
  checkatradeScore: number | null;
  checkatradeReviewCount: number | null;
  checkatradeUrl: string | null;
}

async function processOne(
  id: number,
  cached: CachedReview | null,
  installer: { company_name: string; postcode: string | null } | null,
): Promise<ResponseRow> {
  const baseline: ResponseRow = {
    id,
    checkatradeScore: cached?.score ?? null,
    checkatradeReviewCount: cached?.reviewCount ?? null,
    checkatradeUrl: cached?.url ?? null,
  };
  if (!installer) return baseline;

  // Refresh only if stale or never fetched.
  if (!shouldRefresh(cached?.fetchedAt ?? null)) return baseline;

  const result = await fetchCheckatradeForInstaller({
    companyName: installer.company_name,
    postcode: installer.postcode,
  });
  await persistCheckatradeResult(id, result);
  return {
    id,
    checkatradeScore: result.score,
    checkatradeReviewCount: result.reviewCount,
    checkatradeUrl: result.url,
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
  const { data: rows, error } = await admin
    .from("installers")
    .select(
      "id, company_name, postcode, checkatrade_score, checkatrade_review_count, checkatrade_url, checkatrade_fetched_at, checkatrade_status",
    )
    .in("id", parsed.data.ids);

  if (error) {
    console.error("[checkatrade-refresh] query failed", error);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const work: { id: number; cached: CachedReview; installer: { company_name: string; postcode: string | null } }[] =
    (rows ?? []).map((r) => ({
      id: r.id,
      cached: {
        score: r.checkatrade_score != null ? Number(r.checkatrade_score) : null,
        reviewCount: r.checkatrade_review_count,
        url: r.checkatrade_url,
        fetchedAt: r.checkatrade_fetched_at,
        status: r.checkatrade_status,
      },
      installer: { company_name: r.company_name, postcode: r.postcode },
    }));

  // Process in chunks of PARALLEL to be polite + bounded.
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
