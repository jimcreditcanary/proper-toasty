import { NextRequest, NextResponse } from "next/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllChecks } from "@/lib/verification";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const admin = createAdminClient();

  try {
    // API key auth only
    const result = await authenticateApiRequest(request);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const { user } = result;

    // Check credits
    if (user.credits < 1) {
      return NextResponse.json(
        { error: "Insufficient credits. Purchase more at https://www.whoamipaying.co.uk/dashboard" },
        { status: 402 }
      );
    }

    const body = await request.json();
    const { company_name, vat_number, company_number, account_number, sort_code } = body;

    // Validate: at least one field required
    if (!company_name && !vat_number && !company_number && !account_number) {
      return NextResponse.json(
        {
          error: "At least one field is required",
          fields: ["company_name", "vat_number", "company_number", "account_number", "sort_code"],
        },
        { status: 400 }
      );
    }

    // Deduct credit atomically
    const { data: hasCredit } = await admin.rpc("deduct_credit", {
      p_user_id: user.id,
    });

    if (!hasCredit) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    const referenceId = crypto.randomUUID();

    console.log("API v1 verify:", {
      user_id: user.id,
      reference_id: referenceId,
      company_name,
      vat_number,
      company_number,
      account_number: account_number ? "***" + account_number.slice(-4) : null,
      sort_code,
    });

    // Run all checks
    const results = await runAllChecks({
      company_number: company_number || null,
      vat_number: vat_number || null,
      account_number: account_number || null,
      sort_code: sort_code || null,
      company_name: company_name || null,
      reference_id: referenceId,
    });

    const duration = Date.now() - startTime;

    // Log the API call
    const { error: logError } = await admin.from("api_logs").insert({
      user_id: user.id,
      endpoint: "/api/v1/verify",
      method: "POST",
      status_code: 200,
      credits_used: 1,
      duration_ms: duration,
      request_summary: {
        company_name: company_name || null,
        vat_number: vat_number || null,
        company_number: company_number || null,
        has_account_number: !!account_number,
        has_sort_code: !!sort_code,
      },
      response_summary: {
        companies_house: results.companies_house ? (results.companies_house.found ? "found" : "not_found") : "not_checked",
        hmrc_vat: results.hmrc_vat ? (results.hmrc_vat.found ? "found" : "not_found") : "not_checked",
        bank_verify: results.bank_verify ? ("verified" in results.bank_verify && results.bank_verify.verified ? "verified" : "not_verified") : "not_checked",
      },
    });
    if (logError) {
      console.error("Failed to insert api_log:", logError);
    }

    return NextResponse.json({
      reference_id: referenceId,
      credits_remaining: user.credits - 1,
      duration_ms: duration,
      results: {
        companies_house: results.companies_house ?? null,
        hmrc_vat: results.hmrc_vat ?? null,
        bank_verification: results.bank_verify ?? null,
      },
    });
  } catch (error) {
    console.error("API v1 verify error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
