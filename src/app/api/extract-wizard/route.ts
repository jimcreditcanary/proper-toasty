import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const payeeType = formData.get("payeeType") as string | null;
    const wizardSessionId = formData.get("sessionId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBase64 = fileBuffer.toString("base64");
    const isPdf = file.type === "application/pdf";

    const isBusiness = payeeType === "business";
    const fileName = file.name || "";

    const extractPrompt = isBusiness
      ? `Extract payment details from this document (invoice, estimate, quote, or payment request).${fileName ? ` The filename is: "${fileName}".` : ""} Look carefully at all text including headers, footers, letterhead, and fine print.

Return ONLY a JSON object with these exact keys:
{
  "company_name": "the company or business name that is requesting payment (the payee/seller, NOT the customer)",
  "vat_number": "the VAT registration number if shown (GB format, e.g. GB123456789)",
  "company_number": "the Companies House registration number if shown",
  "sort_code": "the bank sort code if shown (XX-XX-XX format, 6 digits)",
  "account_number": "the bank account number if shown (typically 8 digits)",
  "invoice_amount": the total amount due as a number (e.g. 3012.00) or null,
  "invoice_date": "the document date in YYYY-MM-DD format or null"
}

Important: Extract the company/business name even if this is a quote or estimate, not just invoices. Check the letterhead, header, footer, and "from" section. If a field is not found in the document, set its value to null.`
      : `Extract payment details from this document (invoice, estimate, quote, or payment request).${fileName ? ` The filename is: "${fileName}".` : ""} Look carefully at all text including headers, footers, and fine print.

Return ONLY a JSON object with these exact keys:
{
  "payee_name": "the name of the person or entity requesting payment (the payee/seller, NOT the customer)",
  "sort_code": "the bank sort code if shown (XX-XX-XX format, 6 digits)",
  "account_number": "the bank account number if shown (typically 8 digits)",
  "invoice_amount": the total amount due as a number (e.g. 3012.00) or null,
  "invoice_date": "the document date in YYYY-MM-DD format or null"
}

Important: Extract the payee name even if this is a quote or estimate. Check the letterhead, header, footer, and "from" section. If a field is not found in the document, set its value to null.`;

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
            media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
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

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "Could not extract data from this document" },
        { status: 422 }
      );
    }

    const extracted = JSON.parse(jsonMatch[0]);
    console.log("Extract-wizard result:", JSON.stringify(extracted, null, 2));

    // Track extraction cost against wizard session
    if (wizardSessionId && message.usage) {
      const totalTokens = (message.usage.input_tokens || 0) + (message.usage.output_tokens || 0);
      const costPer1k = 0.003; // default, matches admin_settings
      const extractionCost = (totalTokens / 1000) * costPer1k;
      fetch(new URL("/api/track-wizard-start", request.url).toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: wizardSessionId, extractionCost }),
      }).catch(() => {});
    }

    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("Extract-wizard error:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}
