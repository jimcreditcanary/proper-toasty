// Shared verification functions used by /api/verify and /api/v1/verify

// ── Companies House ──────────────────────────────────────────────────

export async function lookupCompaniesHouse(companyNumber: string) {
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

// ── HMRC VAT ─────────────────────────────────────────────────────────

let hmrcTokenCache: { token: string; expiresAt: number } | null = null;

async function getHmrcAccessToken(): Promise<string> {
  const now = Date.now();

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

export async function lookupHmrcVat(vatNumber: string) {
  const cleanVat = vatNumber.replace(/^GB/i, "").replace(/\s/g, "");
  const baseUrl = process.env.HMRC_API_BASE_URL!;

  const isSandbox = baseUrl.includes("test-api");
  const lookupVat = isSandbox ? "553557881" : cleanVat;
  if (isSandbox) {
    console.log(`HMRC sandbox: overriding VAT ${cleanVat} with test number ${lookupVat}`);
  }

  let accessToken: string;
  try {
    accessToken = await getHmrcAccessToken();
  } catch (err) {
    console.error("Failed to get HMRC token:", err);
    return { found: false, error: "Failed to authenticate with HMRC" };
  }

  const url = `${baseUrl}/organisations/vat/check-vat-number/lookup/${encodeURIComponent(lookupVat)}`;
  console.log("HMRC VAT lookup URL:", url);

  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.hmrc.2.0+json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (res.ok) {
    return { found: true, data: await res.json() };
  }

  const errorBody = await res.text().catch(() => "");
  console.error("HMRC VAT error:", res.status, errorBody);
  return { found: false, error: `HTTP ${res.status}`, details: errorBody };
}

// ── Bank Account (CoP Check) ─────────────────────────────────────────

export async function verifyBankAccount(
  accountNumber: string,
  accountName: string,
  sortCode: string,
  referenceId: string
) {
  const apiUrl = process.env.BANK_VERIFY_API_URL!;
  const apiKey = process.env.BANK_VERIFY_API_KEY!;
  const orgName = process.env.BANK_VERIFY_ORG_NAME!;

  const cleanSortCode = sortCode.replace(/[-\s]/g, "");

  console.log("Bank verify request:", {
    url: apiUrl,
    customerName: accountName,
    bankAccount: accountNumber,
    sortCode: cleanSortCode,
    orgName,
  });

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Organization-Name": orgName,
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      applicationId: referenceId,
      customerId: referenceId,
      customerName: accountName,
      bankAccount: accountNumber,
      sortCode: cleanSortCode,
      accountType: "Business",
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    console.error("Bank verify error:", res.status, errorBody);
    return { verified: false, error: `HTTP ${res.status}`, details: errorBody };
  }

  const data = await res.json();
  console.log("Bank verify success:", JSON.stringify(data));
  return { verified: true, data };
}

// ── Run all checks ───────────────────────────────────────────────────

export type VerificationResults = {
  companies_house?: Awaited<ReturnType<typeof lookupCompaniesHouse>>;
  hmrc_vat?: Awaited<ReturnType<typeof lookupHmrcVat>>;
  bank_verify?: Awaited<ReturnType<typeof verifyBankAccount>>;
};

export async function runAllChecks(fields: {
  company_number?: string | null;
  vat_number?: string | null;
  account_number?: string | null;
  sort_code?: string | null;
  company_name?: string | null;
  reference_id: string;
}): Promise<VerificationResults> {
  const results: VerificationResults = {};
  const promises: Promise<void>[] = [];

  if (fields.company_number) {
    promises.push(
      lookupCompaniesHouse(fields.company_number)
        .then((r) => { results.companies_house = r; })
        .catch((err) => {
          console.error("Companies House check crashed:", err);
          results.companies_house = { found: false, error: String(err), details: "" };
        })
    );
  }

  if (fields.vat_number) {
    if (!process.env.HMRC_CLIENT_ID || !process.env.HMRC_CLIENT_SECRET) {
      results.hmrc_vat = { found: false, error: "HMRC credentials not configured on server", details: "" };
    } else {
      promises.push(
        lookupHmrcVat(fields.vat_number)
          .then((r) => { results.hmrc_vat = r; })
          .catch((err) => {
            console.error("HMRC VAT check crashed:", err);
            results.hmrc_vat = { found: false, error: String(err), details: "" };
          })
      );
    }
  }

  if (fields.account_number && fields.company_name && fields.sort_code) {
    if (!process.env.BANK_VERIFY_API_URL || !process.env.BANK_VERIFY_API_KEY) {
      results.bank_verify = { verified: false, error: "Bank verification not configured on server", details: "" };
    } else {
      promises.push(
        verifyBankAccount(
          fields.account_number,
          fields.company_name,
          fields.sort_code,
          fields.reference_id
        )
          .then((r) => { results.bank_verify = r; })
          .catch((err) => {
            console.error("Bank verify check crashed:", err);
            results.bank_verify = { verified: false, error: String(err), details: "" };
          })
      );
    }
  }

  await Promise.all(promises);
  return results;
}
