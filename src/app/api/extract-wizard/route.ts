import { NextRequest, NextResponse } from "next/server";
import { anthropic } from "@/lib/anthropic";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const payeeType = formData.get("payeeType") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileBase64 = fileBuffer.toString("base64");
    const isPdf = file.type === "application/pdf";

    const isBusiness = payeeType === "business";

    const extractPrompt = isBusiness
      ? `Extract the following fields from this invoice. Return ONLY a JSON object with these exact keys:
{
  "company_name": "the company or business name on the invoice",
  "vat_number": "the VAT registration number (GB format)",
  "company_number": "the Companies House registration number",
  "sort_code": "the bank sort code (XX-XX-XX format)",
  "account_number": "the bank account number",
  "invoice_amount": the total amount as a number or null,
  "invoice_date": "the invoice date in YYYY-MM-DD format or null"
}

If a field is not found, set its value to null.`
      : `Extract the following fields from this invoice or payment request. Return ONLY a JSON object with these exact keys:
{
  "payee_name": "the name of the person or entity to be paid",
  "sort_code": "the bank sort code (XX-XX-XX format)",
  "account_number": "the bank account number",
  "invoice_amount": the total amount as a number or null,
  "invoice_date": "the invoice date in YYYY-MM-DD format or null"
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
    return NextResponse.json({ extracted });
  } catch (error) {
    console.error("Extract-wizard error:", error);
    return NextResponse.json(
      { error: "Failed to extract invoice data" },
      { status: 500 }
    );
  }
}
