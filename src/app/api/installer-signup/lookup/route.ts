import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ClaimLookupRequestSchema,
  type ClaimLookupHit,
  type ClaimLookupResponse,
} from "@/lib/schemas/installer-claim";
import {
  isCompanyNumber,
  normaliseCompanyNumber,
  rankByName,
} from "@/lib/installer-claim/lookup";
import { maskEmail } from "@/lib/installer-claim/email-mask";
import type { Database } from "@/types/database";

// POST /api/installer-signup/lookup
//
// Body: { q: string }
//
// Returns up to 5 matches. Two query modes:
//
//   1. Looks like a Companies House number (e.g. 12345678 or SC123456) →
//      exact match on `installers.company_number`.
//   2. Free text → ILIKE %q% on `installers.company_name`, then ranked
//      starts-with > contains > shorter wins (see lookup.ts).
//
// Already-claimed installers stay in the results but get
// `alreadyClaimed: true` so the UI can show "this has been claimed".
// We don't filter them out because the user might be trying to claim
// a profile someone else has stolen — the UI tells them to contact
// support, not pretend the profile doesn't exist.

export const runtime = "nodejs";
// Pure DB read, very fast — keep the platform default.

type InstallerRow = Database["public"]["Tables"]["installers"]["Row"];

// Fields we surface from the DB. Keeping this lean keeps the row
// payload small; we don't need the full installer record here.
const SELECT_COLS = [
  "id",
  "company_name",
  "company_number",
  "postcode",
  "county",
  "certification_body",
  "certification_number",
  "email",
  "user_id",
].join(", ");

type LookupRow = Pick<
  InstallerRow,
  | "id"
  | "company_name"
  | "company_number"
  | "postcode"
  | "county"
  | "certification_body"
  | "certification_number"
  | "email"
  | "user_id"
>;

function rowToHit(row: LookupRow, exactByNumber: boolean): ClaimLookupHit {
  return {
    id: row.id,
    companyName: row.company_name,
    companyNumber: row.company_number,
    postcode: row.postcode,
    county: row.county,
    certificationBody: row.certification_body,
    certificationNumber: row.certification_number,
    alreadyClaimed: row.user_id != null,
    emailHint: maskEmail(row.email),
    exactByNumber,
  };
}

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ClaimLookupResponse>(
      { ok: false, matches: [], byNumber: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = ClaimLookupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ClaimLookupResponse>(
      {
        ok: false,
        matches: [],
        byNumber: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }
  const { q } = parsed.data;
  const admin = createAdminClient();

  // ── Branch: company-number exact match ───────────────────────────
  if (isCompanyNumber(q)) {
    const number = normaliseCompanyNumber(q);
    const { data, error } = await admin
      .from("installers")
      .select(SELECT_COLS)
      .eq("company_number", number)
      .limit(5)
      .returns<LookupRow[]>();
    if (error) {
      console.error("[installer-signup/lookup] number query failed", error);
      return NextResponse.json<ClaimLookupResponse>(
        { ok: false, matches: [], byNumber: true, error: "Lookup failed" },
        { status: 500 },
      );
    }
    return NextResponse.json<ClaimLookupResponse>({
      ok: true,
      byNumber: true,
      matches: (data ?? []).map((r) => rowToHit(r, true)),
    });
  }

  // ── Branch: company-name fuzzy match ─────────────────────────────
  // Pull a generous batch (50) so the ranker has something to work
  // with — ILIKE alone returns rows in arbitrary order. The ranker
  // narrows it to 5.
  const escaped = q.replace(/[%_]/g, (m) => `\\${m}`);
  const { data, error } = await admin
    .from("installers")
    .select(SELECT_COLS)
    .ilike("company_name", `%${escaped}%`)
    .limit(50)
    .returns<LookupRow[]>();
  if (error) {
    console.error("[installer-signup/lookup] name query failed", error);
    return NextResponse.json<ClaimLookupResponse>(
      { ok: false, matches: [], byNumber: false, error: "Lookup failed" },
      { status: 500 },
    );
  }

  const ranked = rankByName(
    q,
    (data ?? []).map((r) => ({
      ...r,
      companyName: r.company_name,
    })),
    5,
  );

  return NextResponse.json<ClaimLookupResponse>({
    ok: true,
    byNumber: false,
    matches: ranked.map(({ installer }) =>
      rowToHit(installer as unknown as LookupRow, false),
    ),
  });
}
