import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function lookupCompaniesHouse(companyNumber: string) {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY!;
  const url = `https://api.company-information.service.gov.uk/company/${encodeURIComponent(companyNumber)}`;
  console.log("Companies House lookup:", url);

  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("Companies House error:", res.status, errorBody);
    return { found: false, error: `HTTP ${res.status}`, details: errorBody };
  }

  return { found: true, data: await res.json() };
}

// Cache the HMRC OAuth token in memory to avoid fetching on every request
let hmrcTokenCache: { token: string; expiresAt: number } | null = null;

async function getHmrcAccessToken(): Promise<string> {
  const now = Date.now();

  // Return cached token if still valid (with 60s buffer)
  if (hmrcTokenCache && hmrcTokenCache.expiresAt > now + 60_000) {
    return hmrcTokenCache.token;
  }

  const baseUrl = process.env.HMRC_API_BASE_URL!;
  const clientId = process.env.HMRC_CLIENT_ID!;
  const clientSecret = process.env.HMRC_CLIENT_SECRET!;

  const tokenUrl = `${baseUrl}/oauth/token`;
  console.log("Fetching HMRC OAuth token from:", tokenUrl);

  const res = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("HMRC OAuth error:", res.status, errorBody);
    throw new Error(`HMRC OAuth failed: HTTP ${res.status}`);
  }

  const data = await res.json();
  hmrcTokenCache = {
    token: data.access_token,
    expiresAt: now + (data.expires_in ?? 3600) * 1000,
  };

  return data.access_token;
}

async function lookupHmrcVat(vatNumber: string) {
  const cleanVat = vatNumber.replace(/^GB/i, "").replace(/\s/g, "");
  const baseUrl = process.env.HMRC_API_BASE_URL!;

  let accessToken: string;
  try {
    accessToken = await getHmrcAccessToken();
  } catch (err) {
    console.error("Failed to get HMRC token:", err);
    return { found: false, error: "Failed to authenticate with HMRC" };
  }

  const url = `${baseUrl}/organisations/vat/check-vat-number/lookup/${encodeURIComponent(cleanVat)}`;
  console.log("HMRC VAT lookup URL:", url);

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.hmrc.2.0+json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("HMRC VAT error:", res.status, errorBody);
    return { found: false, error: `HTTP ${res.status}`, details: errorBody };
  }

  return { found: true, data: await res.json() };
}

async function verifyBankAccount(
  accountNumber: string,
  accountName: string,
  sortCode: string,
  scanId: string
) {
  const apiUrl = process.env.BANK_VERIFY_API_URL!;
  const apiKey = process.env.BANK_VERIFY_API_KEY!;
  const orgName = process.env.BANK_VERIFY_ORG_NAME!;

  // Strip any dashes/spaces from sort code
  const cleanSortCode = sortCode.replace(/[-\s]/g, "");

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Organization-Name": orgName,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      applicationId: scanId,
      customerId: scanId,
      customerName: accountName,
      bankAccount: accountNumber,
      sortCode: cleanSortCode,
      accountType: "Business",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    return { verified: false, error: `HTTP ${res.status}`, details: errorBody };
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

    if (scan.account_number && scan.company_name && scan.sort_code) {
      promises.push(
        verifyBankAccount(
          scan.account_number,
          scan.company_name,
          scan.sort_code,
          scan_id
        ).then((r) => {
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
