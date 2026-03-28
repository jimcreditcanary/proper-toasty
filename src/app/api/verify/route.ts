import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAllChecks } from "@/lib/verification";

export async function POST(request: NextRequest) {
  try {
    // Auth: API key or session
    const authHeader = request.headers.get("authorization");
    let userId: string;

    if (authHeader) {
      const result = await authenticateApiRequest(request);
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      userId = result.user.id;
    } else {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    const body = await request.json();
    const { scan_id } = body;

    if (!scan_id) {
      return NextResponse.json(
        { error: "scan_id is required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Get the scan
    const { data: scan, error: scanError } = await admin
      .from("scans")
      .select("*")
      .eq("id", scan_id)
      .eq("user_id", userId)
      .single();

    if (scanError || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    console.log("Verify checks for scan:", scan_id, {
      has_company_number: !!scan.company_number,
      has_vat_number: !!scan.vat_number,
      has_account_number: !!scan.account_number,
      has_sort_code: !!scan.sort_code,
      has_company_name: !!scan.company_name,
    });

    const results = await runAllChecks({
      company_number: scan.company_number,
      vat_number: scan.vat_number,
      account_number: scan.account_number,
      sort_code: scan.sort_code,
      company_name: scan.company_name,
      reference_id: scan_id,
    });

    // Update scan with verification results
    await admin
      .from("scans")
      .update({
        companies_house_result: results.companies_house ?? null,
        hmrc_vat_result: results.hmrc_vat ?? null,
        bank_verify_result: results.bank_verify ?? null,
      })
      .eq("id", scan_id);

    return NextResponse.json({
      scan_id,
      results,
    });
  } catch (error) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
