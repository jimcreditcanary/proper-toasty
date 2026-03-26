import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function lookupCompaniesHouse(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY!;
  const res = await fetch(
    `https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
      },
    }
  );

  if (!res.ok) {
    return { found: false, error: `HTTP ${res.status}` };
  }

  return { found: true, data: await res.json() };
}

async function lookupHmrcVat(vatNumber: string) {
  const cleanVat = vatNumber.replace(/^GB/i, "").replace(/\s/g, "");
  const baseUrl = process.env.HMRC_API_BASE_URL!;
  const res = await fetch(
    `${baseUrl}/organisations/vat/check-vat-number/lookup/${encodeURIComponent(cleanVat)}`,
    {
      headers: {
        Accept: "application/vnd.hmrc.1.0+json",
      },
    }
  );

  if (!res.ok) {
    return { found: false, error: `HTTP ${res.status}` };
  }

  return { found: true, data: await res.json() };
}

async function verifyBankAccount(accountNumber: string, accountName: string) {
  const apiUrl = process.env.BANK_VERIFY_API_URL!;
  const apiKey = process.env.BANK_VERIFY_API_KEY!;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      account_number: accountNumber,
      account_name: accountName,
    }),
  });

  if (!res.ok) {
    return { verified: false, error: `HTTP ${res.status}` };
  }

  return { verified: true, data: await res.json() };
}

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

    const results: {
      companies_house?: Awaited<ReturnType<typeof lookupCompaniesHouse>>;
      hmrc_vat?: Awaited<ReturnType<typeof lookupHmrcVat>>;
      bank_verify?: Awaited<ReturnType<typeof verifyBankAccount>>;
    } = {};

    // Run checks in parallel where possible
    const promises: Promise<void>[] = [];

    if (scan.company_number) {
      promises.push(
        lookupCompaniesHouse(scan.company_number).then((r) => {
          results.companies_house = r;
        })
      );
    }

    if (scan.vat_number) {
      promises.push(
        lookupHmrcVat(scan.vat_number).then((r) => {
          results.hmrc_vat = r;
        })
      );
    }

    if (scan.account_number && scan.company_name) {
      promises.push(
        verifyBankAccount(scan.account_number, scan.company_name).then((r) => {
          results.bank_verify = r;
        })
      );
    }

    await Promise.all(promises);

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
