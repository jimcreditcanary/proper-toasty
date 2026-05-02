// /api/installer/billing/export
//
// GET — streams a CSV of the last 12 months of billing activity for
// the signed-in installer. Two logical sections separated by a blank
// row + a header per section:
//
//   PURCHASES (Stripe receipts)
//   date, credits, amount_gbp, currency, status, method, receipt_url
//
//   USAGE (credits out)
//   month, lead_acceptances, lead_credits_used,
//   pre_survey_requests, pre_survey_credits_used, total_credits_used
//
// Single-file CSV is the cheapest format that works in Excel /
// Numbers / Sheets without extra steps. If accountants ask for an
// XLSX with proper tabs we'll add it later.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadBilling } from "@/lib/installer-billing/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return NextResponse.json(
      { error: "Installer profile not linked" },
      { status: 403 },
    );
  }

  const data = await loadBilling(admin, {
    userId: user.id,
    installerId: installer.id,
    months: 12,
  });

  const lines: string[] = [];
  // File-level header so the accountant knows what they've opened.
  lines.push(
    `# Propertoasty billing export — ${installer.company_name}`,
  );
  lines.push(`# Generated ${new Date().toISOString()}`);
  lines.push("");

  // ── Section 1: Stripe purchases ──
  lines.push("PURCHASES");
  lines.push(
    [
      "date",
      "credits",
      "amount_gbp",
      "currency",
      "status",
      "method",
      "receipt_url",
    ]
      .map(csvField)
      .join(","),
  );
  for (const p of data.purchases) {
    lines.push(
      [
        p.created_at,
        String(p.pack_credits),
        (p.price_pence / 100).toFixed(2),
        p.currency.toUpperCase(),
        p.status,
        p.is_auto_recharge ? "auto_topup" : "checkout",
        p.stripe_receipt_url ?? "",
      ]
        .map(csvField)
        .join(","),
    );
  }

  lines.push("");

  // ── Section 2: monthly usage ──
  lines.push("USAGE");
  lines.push(
    [
      "month",
      "lead_acceptances",
      "lead_credits_used",
      "pre_survey_requests",
      "pre_survey_credits_used",
      "total_credits_used",
    ]
      .map(csvField)
      .join(","),
  );
  for (const m of data.months) {
    lines.push(
      [
        m.label,
        String(m.usage.leadAcceptances),
        String(m.usage.leadCreditsUsed),
        String(m.usage.preSurveyRequests),
        String(m.usage.preSurveyCreditsUsed),
        String(m.usage.totalCreditsUsed),
      ]
        .map(csvField)
        .join(","),
    );
  }

  const body = lines.join("\n");
  const filename = `propertoasty-billing-${todayStamp()}.csv`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

// ─── CSV escape ────────────────────────────────────────────────────
//
// Wraps in quotes if the value contains a comma, quote, or newline.
// Doubles inner quotes per RFC 4180. Cheap; saves a dep.
function csvField(v: string): string {
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function todayStamp(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
