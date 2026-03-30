import { anthropic } from "@/lib/anthropic";
import {
  lookupCompaniesHouse,
  lookupHmrcVat,
  verifyBankAccount,
} from "@/lib/verification";
import type { Json } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function runVerification(params: {
  formData: FormData;
  userId: string | null;
  admin: SupabaseClient<Database>;
}): Promise<{ id: string }> {
  const { formData, userId, admin } = params;

  // Parse multipart form data
  const flowType = formData.get("flowType") as string | null;
  const marketplaceUrl = formData.get("marketplaceUrl") as string | null;
  const marketplaceItemTitle = formData.get("marketplaceItemTitle") as string | null;
  const marketplaceListedPrice = formData.get("marketplaceListedPrice") as string | null;
  const valuationMin = formData.get("valuationMin") as string | null;
  const valuationMax = formData.get("valuationMax") as string | null;
  const valuationSummary = formData.get("valuationSummary") as string | null;
  const payeeType = formData.get("payeeType") as string | null;
  const payeeName = formData.get("payeeName") as string | null;
  const companyNameInput = formData.get("companyNameInput") as string | null;
  const sortCode = formData.get("sortCode") as string | null;
  const accountNumber = formData.get("accountNumber") as string | null;
  const vatNumberInput = formData.get("vatNumberInput") as string | null;
  const companyNumberInput = formData.get("companyNumberInput") as string | null;
  const invoiceAmount = formData.get("invoiceAmount") as string | null;
  const file = formData.get("file") as File | null;

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

    // Extract data via Claude
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

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extractedData = null;
    }
  }

  // ── Determine final field values (extracted > manual input) ─────────
  const finalCompanyName =
    extractedData?.company_name || companyNameInput || payeeName || null;
  const finalVatNumber =
    extractedData?.vat_number || vatNumberInput || null;
  const finalCompanyNumber =
    extractedData?.company_number || companyNumberInput || null;
  const finalSortCode =
    extractedData?.sort_code || sortCode || null;
  const finalAccountNumber =
    extractedData?.account_number || accountNumber || null;
  const finalInvoiceAmount =
    extractedData?.invoice_amount ??
    (invoiceAmount ? parseFloat(invoiceAmount) : null);

  // ── Create verification record ─────────────────────────────────────
  const { data: verification, error: insertError } = await admin
    .from("verifications")
    .insert({
      user_id: userId,
      flow_type: flowType,
      marketplace_url: marketplaceUrl,
      marketplace_item_title: marketplaceItemTitle,
      marketplace_listed_price: marketplaceListedPrice
        ? parseFloat(marketplaceListedPrice)
        : null,
      valuation_min: valuationMin ? parseFloat(valuationMin) : null,
      valuation_max: valuationMax ? parseFloat(valuationMax) : null,
      valuation_summary: valuationSummary,
      invoice_file_path: invoiceFilePath,
      payee_type: payeeType,
      payee_name: payeeName,
      company_name_input: companyNameInput,
      sort_code: finalSortCode,
      account_number: finalAccountNumber,
      vat_number_input: vatNumberInput,
      invoice_amount: finalInvoiceAmount,
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

  // ── Run checks in parallel ─────────────────────────────────────────
  interface CHResult { found: boolean; data?: Record<string, unknown>; error?: string; details?: string }
  interface VATResult { found: boolean; data?: Record<string, unknown>; error?: string; details?: string }
  interface BankResult { verified: boolean; data?: Record<string, unknown>; error?: string; details?: string }

  const results: {
    ch: CHResult | null;
    vat: VATResult | null;
    bank: BankResult | null;
    valuation: { min: number; max: number; confidence: string; summary: string; sources: string[] } | null;
    reviews: { rating: number | null; count: number | null; summary: string } | null;
  } = { ch: null, vat: null, bank: null, valuation: null, reviews: null };

  const promises: Promise<void>[] = [];

  // Google Reviews check — only for businesses
  const isBusiness = payeeType === "business" || !!finalCompanyNumber || !!finalVatNumber;
  console.log("Reviews check:", { isBusiness, payeeType, finalCompanyName, finalCompanyNumber: !!finalCompanyNumber, finalVatNumber: !!finalVatNumber });
  if (isBusiness && finalCompanyName) {
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
              messages: [{
                role: "user",
                content: `Find online reviews for the UK company: "${finalCompanyName}"

Search for reviews on ALL of these platforms (try each one separately):
1. Google Business Profile / Google Maps — search "${finalCompanyName} reviews"
2. Trustpilot — search "${finalCompanyName} Trustpilot"
3. Checkatrade — search "${finalCompanyName} Checkatrade"
4. Yell.com — search "${finalCompanyName} Yell"
5. Reviews.io — search "${finalCompanyName} Reviews.io"

Pick the platform with the MOST reviews or highest visibility. If you find reviews on multiple platforms, pick the one with the best data (star rating + count).

IMPORTANT: Actually perform the web searches. Do not guess or say you cannot find reviews without searching.

Return ONLY a JSON object with no markdown formatting:
{"rating": <number e.g. 4.5 or null if genuinely not found on any platform>, "review_count": <number or null>, "source": "<platform name where you found reviews e.g. Google, Trustpilot, Checkatrade, Yell>", "summary": "<One sentence: rating, count, source, and any key themes. If no reviews found on ANY platform after searching all of them, say 'No online reviews found for this business on Google, Trustpilot, Checkatrade, or Yell.' Plain text only.>"}`,
              }],
            }),
          });
          if (reviewsRes.ok) {
            const revData = await reviewsRes.json();
            const blocks = revData.content as Array<{ type: string; text?: string }>;
            let revText = "";
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].type === "text" && blocks[i].text) { revText = blocks[i].text!; break; }
            }
            if (revText) {
              const cleaned = revText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
              const match = cleaned.match(/\{[\s\S]*\}/);
              const parsed = match ? JSON.parse(match[0]) : null;
              if (parsed) {
                results.reviews = {
                  rating: parsed.rating != null ? Number(parsed.rating) : null,
                  count: parsed.review_count != null ? Number(parsed.review_count) : null,
                  summary: parsed.summary ?? "No review data found.",
                };
                console.log("Google reviews:", results.reviews);
              }
            }
          }
        } catch (err) {
          console.error("Google reviews check error:", err);
        }
      })()
    );
  }

  // Marketplace valuation — only run if listed price > £1000
  const listedPriceNum = marketplaceListedPrice ? parseFloat(marketplaceListedPrice) : 0;
  if (flowType === "marketplace" && marketplaceItemTitle && listedPriceNum > 1000) {
    promises.push(
      (async () => {
        try {
          const valRes = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": process.env.ANTHROPIC_API_KEY!,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model: "claude-sonnet-4-20250514",
              max_tokens: 2048,
              tools: [{ type: "web_search_20250305", name: "web_search" }],
              messages: [{
                role: "user",
                content: `You are a marketplace valuation analyst for WhoAmIPaying, a UK payment verification service.

A user wants to buy: "${marketplaceItemTitle}"
${marketplaceListedPrice ? `Listed price: £${marketplaceListedPrice} (private sale, Facebook Marketplace)` : ""}

Research the current UK market value for this item. Search eBay UK, Autotrader UK, Gumtree, specialist UK dealers, and any relevant sources.

CRITICAL RULES FOR estimated_min AND estimated_max:
- These MUST represent the actual market value range you found from comparable listings and sales
- Do NOT adjust these numbers down for "private sale discount", condition assumptions, or speculation
- If you found comparable items listed/sold for £20,000-£30,000, then estimated_min=20000 and estimated_max=30000
- The numbers in estimated_min and estimated_max MUST be consistent with the prices you describe in valuation_assessment — no contradictions
- All prices in GBP (£). If converting from EUR/USD, use the current exchange rate and state the rate used
- Prioritise UK sources. If only European sources are available, convert accurately and note the exchange rate

Return ONLY a JSON object with no markdown fences:
{
  "estimated_min": <number - lowest comparable price found in GBP>,
  "estimated_max": <number - highest comparable price found in GBP>,
  "confidence": "high" | "medium" | "low",
  "sources": ["source urls"],
  "valuation_assessment": "<Plain text, under 150 words. State: what the item is, what comparable listings you found and their actual prices in GBP, whether the listed price represents good/fair/poor value compared to those comparables, and what the buyer should check before purchasing. Be direct and factual. No markdown.>"
}`,
              }],
            }),
          });
          if (valRes.ok) {
            const valData = await valRes.json();
            const blocks = valData.content as Array<{ type: string; text?: string }>;
            let valText = "";
            for (let i = blocks.length - 1; i >= 0; i--) {
              if (blocks[i].type === "text" && blocks[i].text) { valText = blocks[i].text!; break; }
            }
            if (valText) {
              const cleaned = valText.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
              const match = cleaned.match(/\{[\s\S]*\}/);
              const parsed = match ? JSON.parse(match[0]) : null;
              if (parsed) {
                results.valuation = {
                  min: Number(parsed.estimated_min),
                  max: Number(parsed.estimated_max),
                  confidence: parsed.confidence ?? "low",
                  summary: parsed.valuation_assessment ?? parsed.valuation_summary ?? "",
                  sources: parsed.sources ?? [],
                };
                console.log("Marketplace valuation:", results.valuation);
              }
            }
          }
        } catch (err) {
          console.error("Marketplace valuation error:", err);
        }
      })()
    );
  }

  if (finalCompanyNumber) {
    promises.push(
      lookupCompaniesHouse(finalCompanyNumber)
        .then((r) => { results.ch = r as CHResult; })
        .catch((err) => {
          console.error("CH check error:", err);
          results.ch = { found: false, error: String(err) };
        })
    );
  }

  if (finalVatNumber) {
    promises.push(
      lookupHmrcVat(finalVatNumber)
        .then((r) => { results.vat = r as VATResult; })
        .catch((err) => {
          console.error("VAT check error:", err);
          results.vat = { found: false, error: String(err) };
        })
    );
  }

  if (finalAccountNumber && finalCompanyName && finalSortCode) {
    promises.push(
      verifyBankAccount(
        finalAccountNumber,
        finalCompanyName,
        finalSortCode,
        verification.id
      )
        .then((r) => { results.bank = r as BankResult; })
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
    ? (chData as Record<string, unknown>).company_name as string | null
    : null;
  const companiesHouseNumber = chData
    ? (chData as Record<string, unknown>).company_number as string | null
    : null;
  const companiesHouseStatus = chData
    ? (chData as Record<string, unknown>).company_status as string | null
    : null;
  const incorporatedDate = chData
    ? (chData as Record<string, unknown>).date_of_creation as string | null
    : null;

  // Accounts info
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

  // VAT data
  const vatApiData = vatResult?.found ? (vatResult.data ?? null) : null;
  let vatApiName: string | null = null;
  if (vatApiData) {
    const target = (vatApiData as Record<string, unknown>).target as
      | Record<string, unknown>
      | undefined;
    vatApiName = target
      ? (target.name as string | null)
      : (vatApiData as Record<string, unknown>).name as string | null;
  }

  // Bank/CoP data
  let copResult: string | null = null;
  let copReason: string | null = null;
  if (bankResult) {
    if (bankResult.verified && bankResult.data) {
      const bd = bankResult.data as Record<string, unknown>;
      // Map nameMatchResult from CoP API to our standard values
      const nameMatch = bd.nameMatchResult as string | undefined;
      if (nameMatch === "Full") {
        copResult = "FULL_MATCH";
      } else if (nameMatch === "Partial") {
        copResult = "PARTIAL_MATCH";
      } else if (nameMatch === "None" || nameMatch === "No") {
        copResult = "NO_MATCH";
      } else {
        // Fallback: check the boolean result field
        copResult = bd.result === true ? "FULL_MATCH" : "NO_MATCH";
      }
      copReason = (bd.resultText as string) ?? (bd.reasonCode as string) ?? null;
    } else {
      copResult = "NO_MATCH";
      copReason = bankResult.error ?? null;
    }
  }

  // ── Calculate overall risk ─────────────────────────────────────────
  let riskScore = 0;
  let checksRun = 0;

  if (chResult) {
    checksRun++;
    if (!chResult.found) riskScore += 2;
    else if (companiesHouseStatus && companiesHouseStatus !== "active")
      riskScore += 1;
    if (accountsOverdue) riskScore += 1;
  }

  if (vatResult) {
    checksRun++;
    if (!vatResult.found) riskScore += 2;
    // Name mismatch check
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

  // Marketplace price check
  if (flowType === "marketplace" && valuationMin && marketplaceListedPrice) {
    const listed = parseFloat(marketplaceListedPrice);
    const minVal = parseFloat(valuationMin);
    const maxVal = valuationMax ? parseFloat(valuationMax) : minVal * 1.5;
    if (listed < minVal * 0.5) riskScore += 2; // Suspiciously cheap
    else if (listed < minVal * 0.8) riskScore += 1;
    else if (listed > maxVal * 1.5) riskScore += 1; // Overpriced
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
  console.log("Updating verification:", verification.id, {
    companies_house_name: companiesHouseName,
    companies_house_number: companiesHouseNumber,
    companies_house_status: companiesHouseStatus,
    companies_house_incorporated_date: incorporatedDate,
    vat_api_name: vatApiName,
    cop_result: copResult,
    cop_reason: copReason,
    overall_risk: overallRisk,
  });

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
      valuation_min: results.valuation?.min ?? null,
      valuation_max: results.valuation?.max ?? null,
      valuation_summary: results.valuation?.summary ?? null,
      google_reviews_rating: results.reviews?.rating ?? null,
      google_reviews_count: results.reviews?.count ?? null,
      google_reviews_summary: results.reviews?.summary ?? null,
      status: "completed",
    })
    .eq("id", verification.id);

  if (updateError) {
    console.error("Failed to update verification:", updateError);
  } else {
    console.log("Verification updated successfully:", verification.id);
  }

  return { id: verification.id };
}
