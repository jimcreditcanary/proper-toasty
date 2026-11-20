// POST /api/installer/onboarding/confirm-business
//
// Step 1 of the installer onboarding flow (propertoasty#217). The
// installer confirms (or corrects) the Companies House match the MCS
// scraper attached, plus the public trading address and phone.
//
// Three paths:
//   - confirm_match       → leave CH fields as-is, stamp confirmed_at,
//                           set legal_structure = 'limited_company'
//   - update_company      → overwrite company_number / ch_matched_name /
//                           ch_matched_address with the CH record the
//                           installer picked, stamp ch_match_source =
//                           'claim_user_picked', confirmed_at
//   - declare_non_limited → null out CH fields, set legal_structure to
//                           the supplied value, stamp confirmed_at
//
// On every path we also apply the trading-details override (address /
// phone / website) and, if it's the first confirmation for this row,
// snapshot the pre-change MCS-scraped fields into mcs_scraped_snapshot
// so we never lose the audit trail.

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundInstallerId } from "@/lib/installer-auth/get-bound-installer";

export const runtime = "nodejs";

const TradingSchema = z.object({
  address_line_1: z.string().trim().min(1).max(200),
  address_line_2: z.string().trim().max(200).optional().or(z.literal("")),
  address_line_3: z.string().trim().max(200).optional().or(z.literal("")),
  county: z.string().trim().max(100).optional().or(z.literal("")),
  postcode: z.string().trim().min(5).max(10),
  telephone: z.string().trim().max(40).optional().or(z.literal("")),
  website: z.string().trim().max(200).optional().or(z.literal("")),
});

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("confirm_match"),
    trading: TradingSchema,
  }),
  z.object({
    action: z.literal("update_company"),
    company_number: z.string().trim().min(6).max(10),
    ch_matched_name: z.string().trim().min(1).max(200),
    ch_matched_address: z.string().trim().min(1).max(500),
    trading: TradingSchema,
  }),
  z.object({
    action: z.literal("declare_non_limited"),
    legal_structure: z.enum(["sole_trader", "partnership", "llp"]),
    trading: TradingSchema,
  }),
]);

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const installerId = await getBoundInstallerId(admin, user.id);
  if (!installerId) {
    return NextResponse.json({ error: "Not an installer" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid body",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const payload = parsed.data;

  // Load current row — need the MCS-scraped values for the one-time
  // snapshot, and we gate the snapshot write on it being null.
  const { data: current, error: loadErr } = await admin
    .from("installers")
    .select(
      "id, company_number, ch_matched_name, ch_matched_address, ch_match_source, ch_match_confidence, address_line_1, address_line_2, address_line_3, county, postcode, country, telephone, website, mcs_scraped_snapshot, business_details_confirmed_at",
    )
    .eq("id", installerId)
    .maybeSingle();
  if (loadErr || !current) {
    return NextResponse.json(
      { error: "Installer row not found" },
      { status: 404 },
    );
  }

  const trimmedTrading = {
    address_line_1: payload.trading.address_line_1.trim(),
    address_line_2: nullable(payload.trading.address_line_2),
    address_line_3: nullable(payload.trading.address_line_3),
    county: nullable(payload.trading.county),
    postcode: payload.trading.postcode.trim(),
    telephone: nullable(payload.trading.telephone),
    website: nullable(payload.trading.website),
  };

  const update: Record<string, unknown> = {
    ...trimmedTrading,
    country: "United Kingdom",
    business_details_confirmed_at: new Date().toISOString(),
    business_details_confirmed_by: user.id,
  };

  // Snapshot the pre-change MCS values once. Preserves the originals
  // when the installer overwrites them here. Keyed by column name so
  // it's human-readable in admin tools.
  if (current.mcs_scraped_snapshot === null) {
    update.mcs_scraped_snapshot = {
      captured_at: new Date().toISOString(),
      company_number: current.company_number,
      ch_matched_name: current.ch_matched_name,
      ch_matched_address: current.ch_matched_address,
      ch_match_source: current.ch_match_source,
      ch_match_confidence: current.ch_match_confidence,
      address_line_1: current.address_line_1,
      address_line_2: current.address_line_2,
      address_line_3: current.address_line_3,
      county: current.county,
      postcode: current.postcode,
      country: current.country,
      telephone: current.telephone,
      website: current.website,
    };
  }

  switch (payload.action) {
    case "confirm_match":
      update.legal_structure = "limited_company";
      // CH fields untouched — scraper's match stands, now confirmed by
      // the installer themselves.
      update.ch_match_source = "claim_confirmed";
      update.ch_match_confidence = "high";
      break;
    case "update_company":
      update.legal_structure = "limited_company";
      update.company_number = payload.company_number.trim().toUpperCase();
      update.ch_matched_name = payload.ch_matched_name.trim();
      update.ch_matched_address = payload.ch_matched_address.trim();
      update.ch_match_source = "claim_user_picked";
      update.ch_match_confidence = "high";
      break;
    case "declare_non_limited":
      update.legal_structure = payload.legal_structure;
      update.company_number = null;
      update.ch_matched_name = null;
      update.ch_matched_address = null;
      update.ch_match_source = null;
      update.ch_match_confidence = null;
      break;
  }

  const { error: updateErr } = await admin
    .from("installers")
    .update(update)
    .eq("id", installerId);
  if (updateErr) {
    console.error("[installer/confirm-business] update failed", updateErr);
    return NextResponse.json(
      { error: "Could not save — please try again" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

function nullable(v: string | undefined): string | null {
  if (v === undefined) return null;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : null;
}
