import { anthropic } from "@/lib/anthropic";
import {
  lookupCompaniesHouse,
  lookupHmrcVat,
  verifyBankAccount,
} from "@/lib/verification";
import type { Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type DvlaRecord = {
  registrationNumber?: string;
  make?: string | null;
  colour?: string | null;
  fuelType?: string | null;
  engineCapacity?: number | null;
  yearOfManufacture?: number | null;
  monthOfFirstRegistration?: string | null;
  taxStatus?: string | null;
  taxDueDate?: string | null;
  motStatus?: string | null;
  motExpiryDate?: string | null;
  co2Emissions?: number | null;
  markedForExport?: boolean | null;
  typeApproval?: string | null;
  wheelplan?: string | null;
  revenueWeight?: number | null;
  euroStatus?: string | null;
  dateOfLastV5CIssued?: string | null;
  raw?: Record<string, unknown>;
};

export async function runVerification(params: {
  formData: FormData;
  userId: string | null;
  admin: SupabaseClient<Database>;
}): Promise<{ id: string }> {
  const { formData, userId, admin } = params;

  // ── Parse multipart form data ─────────────────────────────────────
  const flowType = formData.get("flowType") as string | null;
  const payeeType = formData.get("payeeType") as string | null;
  const payeeName = formData.get("payeeName") as string | null;
  const companyNameInput = formData.get("companyNameInput") as string | null;
  const sortCode = formData.get("sortCode") as string | null;
  const accountNumber = formData.get("accountNumber") as string | null;
  const vatNumberInput = formData.get("vatNumberInput") as string | null;
  const companyNumberInput = formData.get("companyNumberInput") as string | null;
  const invoiceAmount = formData.get("invoiceAmount") as string | null;
  const purchaseCategory = formData.get("purchaseCategory") as string | null;
  const file = formData.get("file") as File | null;

  // Vehicle + DVLA
  const vehicleReg = formData.get("vehicleReg") as string | null;
  const dvlaDataRaw = formData.get("dvlaData") as string | null;
  let dvlaData: DvlaRecord | null = null;
  if (dvlaDataRaw) {
    try {
      dvlaData = JSON.parse(dvlaDataRaw) as DvlaRecord;
    } catch {
      dvlaData = null;
    }
  }

  // Marketplace
  const marketplaceSource = formData.get("marketplaceSource") as string | null;
  const marketplaceOther = formData.get("marketplaceOther") as string | null;
  const marketplaceScreenshot = formData.get("marketplaceScreenshot") as File | null;

  // Selected checks
  const selectedChecksRaw = formData.get("selectedChecks") as string | null;
  let selectedChecks: string[] = [];
  if (selectedChecksRaw) {
    try {
      const parsed = JSON.parse(selectedChecksRaw);
      if (Array.isArray(parsed)) selectedChecks = parsed.filter((x) => typeof x === "string");
    } catch {
      selectedChecks = [];
    }
  }
  // If the client didn't tell us, assume all checks the data supports.
  const isChecked = (id: string): boolean =>
    selectedChecks.length === 0 || selectedChecks.includes(id);

  // Track total Anthropic token usage across all calls
  let totalTokensUsed = 0;

  // ── Invoice extraction (if file uploaded) ──────────────────────────
  let extractedData: {
    company_name?: string | null;
    vat_number?: string | null;
    company_number?: string | null;
    sort_code?: string | null;
    account_number?: string | null;
    invoice_amount?: number | null;
  } | null = null;
  let invoiceFilePath: string | null = null;

  if (file) {
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const folderPrefix = userId || "leads";
    const filePath = `${folderPrefix}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await admin.storage
      .from("invoices")
      .upload(filePath, fileBuffer, { contentType: file.type });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error("Failed to upload file");
    }
    invoiceFilePath = filePath;

    // Extract via Claude
    const fileBase64 = fileBuffer.toString("base64");
    const isPdf = file.type === "application/pdf";

    const extractPrompt = `Extract the following fields from this invoice. Return ONLY a JSON object with these exact keys:
{
  "company_name": "the company or business name on the invoice",
  "vat_number": "the VAT registration number (GB format)",
  "company_number": "the Companies House registration number",
  "sort_code": "the bank sort code (XX-XX-XX format)",
  "account_number": "the bank account number",
  "invoice_amount": the total amount as a number or null
}

If a field is not found, set its value to null.`;

    const fileBlock = isPdf
      ? ({
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: fileBase64,
          },
        })
      : ({
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: fileBase64,
          },
        });

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [fileBlock, { type: "text", text: extractPrompt }],
        },
      ],
    });

    totalTokensUsed +=
      (message.usage?.input_tokens ?? 0) + (message.usage?.output_tokens ?? 0);

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extractedData = null;
    }
  }

  // ── Marketplace screenshot upload ──────────────────────────────────
  let marketplaceScreenshotUrl: string | null = null;
  if (marketplaceScreenshot && marketplaceScreenshot instanceof File) {
    try {
      const buf = Buffer.from(await marketplaceScreenshot.arrayBuffer());
      const folderPrefix = userId || "leads";
      const path = `${folderPrefix}/${Date.now()}-${marketplaceScreenshot.name}`;
      const { error } = await admin.storage
        .from("marketplace-screenshots")
        .upload(path, buf, { contentType: marketplaceScreenshot.type });
      if (!error) {
        marketplaceScreenshotUrl = path;
      } else {
        console.error("Marketplace screenshot upload error:", error);
      }
    } catch (err) {
      console.error("Marketplace screenshot upload failed:", err);
    }
  }

  // ── Determine final field values (extracted > manual input) ─────────
  const finalCompanyName =
    extractedData?.company_name || companyNameInput || payeeName || null;
  const finalVatNumber = extractedData?.vat_number || vatNumberInput || null;
  const finalCompanyNumber =
    extractedData?.company_number || companyNumberInput || null;
  const finalSortCode = extractedData?.sort_code || sortCode || null;
  const finalAccountNumber = extractedData?.account_number || accountNumber || null;
  const finalInvoiceAmount =
    extractedData?.invoice_amount ??
    (invoiceAmount ? parseFloat(invoiceAmount) : null);

  // ── Create verification record ─────────────────────────────────────
  const { data: verification, error: insertError } = await admin
    .from("verifications")
    .insert({
      user_id: userId,
      flow_type: flowType,
      marketplace_source: marketplaceSource,
      marketplace_other: marketplaceOther,
      marketplace_screenshot_url: marketplaceScreenshotUrl,
      invoice_file_path: invoiceFilePath,
      payee_type: payeeType,
      payee_name: payeeName,
      company_name_input: companyNameInput,
      sort_code: finalSortCode,
      account_number: finalAccountNumber,
      vat_number_input: vatNumberInput,
      invoice_amount: finalInvoiceAmount,
      purchase_category: purchaseCategory,
      vehicle_reg: vehicleReg,
      dvla_data: (dvlaData as unknown as Json) ?? null,
      selected_checks: selectedChecks.length > 0 ? selectedChecks : null,
      check_tier: "enhanced",
      extracted_company_name: extractedData?.company_name ?? null,
      extracted_vat_number: extractedData?.vat_number ?? null,
      extracted_invoice_amount: extractedData?.invoice_amount ?? null,
      extracted_sort_code: extractedData?.sort_code ?? null,
      extracted_account_number: extractedData?.account_number ?? null,
      status: "processing",
    })
    .select()
    .single();

  if (insertError || !verification) {
    console.error("Insert verification error:", insertError);
    throw new Error("Failed to create verification record");
  }

  // ── Persist DVLA lookup (linked to verification) ───────────────────
  if (dvlaData && dvlaData.registrationNumber) {
    admin
      .from("vehicle_lookups")
      .insert({
        verification_id: verification.id,
        registration_number: dvlaData.registrationNumber,
        make: dvlaData.make ?? null,
        colour: dvlaData.colour ?? null,
        fuel_type: dvlaData.fuelType ?? null,
        engine_capacity: dvlaData.engineCapacity ?? null,
        year_of_manufacture: dvlaData.yearOfManufacture ?? null,
        month_of_first_registration: dvlaData.monthOfFirstRegistration ?? null,
        tax_status: dvlaData.taxStatus ?? null,
        tax_due_date: dvlaData.taxDueDate ?? null,
        mot_status: dvlaData.motStatus ?? null,
        mot_expiry_date: dvlaData.motExpiryDate ?? null,
        co2_emissions: dvlaData.co2Emissions ?? null,
        marked_for_export: dvlaData.markedForExport ?? null,
        type_approval: dvlaData.typeApproval ?? null,
        wheelplan: dvlaData.wheelplan ?? null,
        revenue_weight: dvlaData.revenueWeight ?? null,
        euro_status: dvlaData.euroStatus ?? null,
        date_of_last_v5c_issued: dvlaData.dateOfLastV5CIssued ?? null,
        raw_response: (dvlaData.raw ?? dvlaData) as unknown as Json,
      })
      .then(({ error: vlErr }) => {
        if (vlErr) console.error("vehicle_lookups insert:", vlErr);
      });
  }

  // ── Run checks in parallel ─────────────────────────────────────────
  interface CHResult {
    found: boolean;
    data?: Record<string, unknown>;
    error?: string;
    details?: string;
  }
  interface VATResult {
    found: boolean;
    data?: Record<string, unknown>;
    error?: string;
    details?: string;
  }
  interface BankResult {
    verified: boolean;
    data?: Record<string, unknown>;
    error?: string;
    details?: string;
  }

  const results: {
    ch: CHResult | null;
    vat: VATResult | null;
    bank: BankResult | null;
    reviews: { rating: number | null; count: number | null; summary: string } | null;
    vehicleValuation: {
      estimatedValueLow: number;
      estimatedValueMid: number;
      estimatedValueHigh: number;
      confidence: string;
      factors: string[];
      warnings: string[];
      summary: string;
    } | null;
  } = { ch: null, vat: null, bank: null, reviews: null, vehicleValuation: null };

  const promises: Promise<void>[] = [];

  const isBusiness =
    payeeType === "business" ||
    !!finalCompanyNumber ||
    !!finalVatNumber;

  // Google Reviews — business only, and user opted in
  if (isChecked("online_reviews") && isBusiness && finalCompanyName) {
    promises.push(
      (async () => {
        try {
          const reviewsRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 512,
              tools: [{ type: "web_search_20250305", name: "web_search" }],
              messages: [
                {
                  role: "user",
                  content: `Find online reviews for the UK company: "${finalCompanyName}"

Search for reviews on ALL of these platforms (try each one separately):
1. Google Business Profile / Google Maps
2. Trustpilot
3. Checkatrade
4. Yell.com
5. Reviews.io

Pick the platform with the MOST reviews or highest visibility.

Return ONLY a JSON object with no markdown formatting:
{"rating": <number or null>, "review_count": <number or null>, "source": "<platform name>", "summary": "<One sentence summary>"}`,
                },
              ],
            }),
          });
          if (reviewsRes.ok) {
            const revData = await reviewsRes.json();
            totalTokensUsed +=
              (revData.usage?.input_tokens ?? 0) + (revData.usage?.output_tokens ?? 0);
            const blocks = revData.content as Array<{ type: string; text?: string }>;
            let revText = "";
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].type === "text" && blocks[i].text) {
                revText = blocks[i].text!;
                break;
              }
            }
            if (revText) {
              const cleaned = revText
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/g, "")
                .trim();
              const match = cleaned.match(/\{[\s\S]*\}/);
              const parsed = match ? JSON.parse(match[0]) : null;
              if (parsed) {
                results.reviews = {
                  rating: parsed.rating != null ? Number(parsed.rating) : null,
                  count: parsed.review_count != null ? Number(parsed.review_count) : null,
                  summary: parsed.summary ?? "No review data found.",
                };
              }
            }
          }
        } catch (err) {
          console.error("Google reviews check error:", err);
        }
      })()
    );
  }

  // Vehicle valuation — only when user opted in and we have DVLA data
  if (isChecked("vehicle_valuation") && dvlaData && dvlaData.registrationNumber) {
    promises.push(
      (async () => {
        try {
          const prompt = `You are an expert UK used vehicle valuation analyst. Using the DVLA data provided, estimate a fair UK market price.

DVLA Data:
- Registration: ${dvlaData!.registrationNumber}
- Make: ${dvlaData!.make ?? "unknown"}
- Colour: ${dvlaData!.colour ?? "unknown"}
- Fuel Type: ${dvlaData!.fuelType ?? "unknown"}
- Engine Capacity: ${dvlaData!.engineCapacity ?? "unknown"}cc
- Year of Manufacture: ${dvlaData!.yearOfManufacture ?? "unknown"}
- First Registered: ${dvlaData!.monthOfFirstRegistration ?? "unknown"}
- CO2 Emissions: ${dvlaData!.co2Emissions ?? "unknown"} g/km
- Tax Status: ${dvlaData!.taxStatus ?? "unknown"}
- MOT Status: ${dvlaData!.motStatus ?? "unknown"}
- Euro Status: ${dvlaData!.euroStatus ?? "unknown"}
- Marked for Export: ${dvlaData!.markedForExport === true ? "YES" : "no"}
- Last V5C Issued: ${dvlaData!.dateOfLastV5CIssued ?? "unknown"}

Respond in JSON only, no markdown, no preamble:
{
  "estimatedValueLow": <number in GBP>,
  "estimatedValueMid": <number in GBP>,
  "estimatedValueHigh": <number in GBP>,
  "confidence": "<low|medium|high>",
  "factors": ["<factor>", "<factor>", "<factor>"],
  "warnings": ["<warning>"],
  "summary": "<2-3 sentence plain English summary>"
}

Be conservative. You do NOT have mileage data, so caveat accordingly.`;

          const msg = await anthropic.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          });
          totalTokensUsed +=
            (msg.usage?.input_tokens ?? 0) + (msg.usage?.output_tokens ?? 0);

          const text = msg.content[0]?.type === "text" ? msg.content[0].text : "";
          const match = text.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            results.vehicleValuation = {
              estimatedValueLow: Number(parsed.estimatedValueLow) || 0,
              estimatedValueMid: Number(parsed.estimatedValueMid) || 0,
              estimatedValueHigh: Number(parsed.estimatedValueHigh) || 0,
              confidence:
                parsed.confidence === "high"
                  ? "high"
                  : parsed.confidence === "medium"
                    ? "medium"
                    : "low",
              factors: Array.isArray(parsed.factors) ? parsed.factors.slice(0, 10) : [],
              warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 10) : [],
              summary: typeof parsed.summary === "string" ? parsed.summary : "",
            };
          }
        } catch (err) {
          console.error("Vehicle valuation error:", err);
        }
      })()
    );
  }

  // Companies House — business only
  if (
    (isChecked("companies_house") ||
      isChecked("trading_history") ||
      isChecked("accounts_filed")) &&
    finalCompanyNumber
  ) {
    promises.push(
      lookupCompaniesHouse(finalCompanyNumber)
        .then((r) => {
          results.ch = r as CHResult;
        })
        .catch((err) => {
          console.error("CH check error:", err);
          results.ch = { found: false, error: String(err) };
        })
    );
  }

  // HMRC VAT
  if (isChecked("vat") && finalVatNumber) {
    promises.push(
      lookupHmrcVat(finalVatNumber)
        .then((r) => {
          results.vat = r as VATResult;
        })
        .catch((err) => {
          console.error("VAT check error:", err);
          results.vat = { found: false, error: String(err) };
        })
    );
  }

  // Bank / CoP
  if (
    isChecked("cop") &&
    finalAccountNumber &&
    finalCompanyName &&
    finalSortCode
  ) {
    promises.push(
      verifyBankAccount(
        finalAccountNumber,
        finalCompanyName,
        finalSortCode,
        verification.id
      )
        .then((r) => {
          results.bank = r as BankResult;
        })
        .catch((err) => {
          console.error("Bank check error:", err);
          results.bank = { verified: false, error: String(err) };
        })
    );
  }

  await Promise.all(promises);

  const chResult = results.ch;
  const vatResult = results.vat;
  const bankResult = results.bank;

  // ── Extract structured data from results ───────────────────────────
  const chData = chResult?.found ? (chResult.data ?? null) : null;
  const companiesHouseName = chData
    ? ((chData as Record<string, unknown>).company_name as string | null)
    : null;
  const companiesHouseNumber = chData
    ? ((chData as Record<string, unknown>).company_number as string | null)
    : null;
  const companiesHouseStatus = chData
    ? ((chData as Record<string, unknown>).company_status as string | null)
    : null;
  const incorporatedDate = chData
    ? ((chData as Record<string, unknown>).date_of_creation as string | null)
    : null;

  let accountsDate: string | null = null;
  let accountsOverdue = false;
  if (chData) {
    const accounts = (chData as Record<string, unknown>).accounts as
      | Record<string, unknown>
      | undefined;
    if (accounts) {
      const lastAccounts = accounts.last_accounts as Record<string, unknown> | undefined;
      if (lastAccounts && typeof lastAccounts === "object") {
        accountsDate = (lastAccounts.made_up_to as string) ?? null;
      } else if (typeof accounts.last_accounts === "string") {
        accountsDate = accounts.last_accounts;
      }
      accountsOverdue = accounts.overdue === true;
    }
  }

  const vatApiData = vatResult?.found ? (vatResult.data ?? null) : null;
  let vatApiName: string | null = null;
  if (vatApiData) {
    const target = (vatApiData as Record<string, unknown>).target as
      | Record<string, unknown>
      | undefined;
    vatApiName = target
      ? (target.name as string | null)
      : ((vatApiData as Record<string, unknown>).name as string | null);
  }

  let copResult: string | null = null;
  let copReason: string | null = null;
  if (bankResult) {
    if (bankResult.verified && bankResult.data) {
      const bd = bankResult.data as Record<string, unknown>;
      const nameMatch = bd.nameMatchResult as string | undefined;
      if (nameMatch === "Full") {
        copResult = "FULL_MATCH";
      } else if (nameMatch === "Partial") {
        copResult = "PARTIAL_MATCH";
      } else if (nameMatch === "None" || nameMatch === "No") {
        copResult = "NO_MATCH";
      } else {
        copResult = bd.result === true ? "FULL_MATCH" : "NO_MATCH";
      }
      copReason = (bd.resultText as string) ?? (bd.reasonCode as string) ?? null;
    } else {
      copResult = "NO_MATCH";
      copReason = bankResult.error ?? null;
    }
  }

  // ── Overall risk ───────────────────────────────────────────────────
  let riskScore = 0;
  let checksRun = 0;

  if (chResult) {
    checksRun++;
    if (!chResult.found) riskScore += 2;
    else if (companiesHouseStatus && companiesHouseStatus !== "active") riskScore += 1;
    if (accountsOverdue) riskScore += 1;
  }

  if (vatResult) {
    checksRun++;
    if (!vatResult.found) riskScore += 2;
    if (vatApiName && finalCompanyName) {
      const normA = vatApiName.toLowerCase().trim();
      const normB = finalCompanyName.toLowerCase().trim();
      if (normA !== normB && !normA.includes(normB) && !normB.includes(normA)) {
        riskScore += 1;
      }
    }
  }

  if (bankResult) {
    checksRun++;
    if (copResult === "NO_MATCH") riskScore += 3;
    else if (copResult === "PARTIAL_MATCH") riskScore += 1;
  }

  let overallRisk: string;
  if (checksRun === 0) {
    overallRisk = "UNKNOWN";
  } else if (riskScore === 0) {
    overallRisk = "LOW";
  } else if (riskScore <= 2) {
    overallRisk = "MEDIUM";
  } else {
    overallRisk = "HIGH";
  }

  // ── Update verification record ─────────────────────────────────────
  const { error: updateError } = await admin
    .from("verifications")
    .update({
      companies_house_result: (chResult as unknown as Json) ?? null,
      companies_house_name: companiesHouseName,
      companies_house_number: companiesHouseNumber,
      companies_house_status: companiesHouseStatus,
      companies_house_incorporated_date: incorporatedDate,
      companies_house_accounts_date: accountsDate,
      companies_house_accounts_overdue: accountsOverdue,
      hmrc_vat_result: (vatResult as unknown as Json) ?? null,
      vat_api_name: vatApiName,
      bank_verify_result: (bankResult as unknown as Json) ?? null,
      cop_result: copResult,
      cop_reason: copReason,
      overall_risk: overallRisk,
      google_reviews_rating: results.reviews?.rating ?? null,
      google_reviews_count: results.reviews?.count ?? null,
      google_reviews_summary: results.reviews?.summary ?? null,
      vehicle_valuation:
        (results.vehicleValuation as unknown as Json) ?? null,
      anthropic_tokens_used: totalTokensUsed > 0 ? totalTokensUsed : null,
      status: "completed",
    })
    .eq("id", verification.id);

  if (updateError) {
    console.error("Failed to update verification:", updateError);
  }

  return { id: verification.id };
}
