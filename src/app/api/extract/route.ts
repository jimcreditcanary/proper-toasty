import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { authenticateApiRequest } from "@/lib/api-auth";
import { anthropic } from "@/lib/anthropic";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    // Determine auth method: API key or session
    const authHeader = request.headers.get("authorization");
    let userId: string;

    if (authHeader) {
      // API key auth
      const result = await authenticateApiRequest(request);
      if ("error" in result) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status }
        );
      }
      userId = result.user.id;
    } else {
      // Session auth (dashboard)
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      userId = user.id;
    }

    const admin = createAdminClient();

    // Deduct credit
    const { data: hasCredit } = await admin.rpc("deduct_credit", {
      p_user_id: userId,
    });

    if (!hasCredit) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 402 }
      );
    }

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      // Refund credit on bad request
      const { data: profile } = await admin
        .from("users")
        .select("credits")
        .eq("id", userId)
        .single();
      await admin
        .from("users")
        .update({ credits: (profile?.credits ?? 0) + 1 })
        .eq("id", userId);
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const filePath = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await admin.storage
      .from("invoices")
      .upload(filePath, fileBuffer, {
        contentType: file.type,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 }
      );
    }

    // Create scan record
    const { data: scan, error: scanError } = await admin
      .from("scans")
      .insert({
        user_id: userId,
        file_url: filePath,
        file_name: file.name,
        status: "processing",
      })
      .select()
      .single();

    if (scanError || !scan) {
      return NextResponse.json(
        { error: "Failed to create scan record" },
        { status: 500 }
      );
    }

    // Extract data using Claude
    const fileBase64 = fileBuffer.toString("base64");
    const isPdf = file.type === "application/pdf";

    const extractPrompt = `Extract the following fields from this invoice. Return ONLY a JSON object with these exact keys:
{
  "company_name": "the company or business name on the invoice",
  "vat_number": "the VAT registration number (GB format)",
  "company_number": "the Companies House registration number",
  "sort_code": "the bank sort code (XX-XX-XX format)",
  "account_number": "the bank account number"
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
          content: [
            fileBlock,
            { type: "text", text: extractPrompt },
          ],
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Parse the JSON from Claude's response
    let extractedData;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      extractedData = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      extractedData = null;
    }

    if (!extractedData) {
      await admin
        .from("scans")
        .update({ status: "failed" })
        .eq("id", scan.id);
      return NextResponse.json(
        { error: "Failed to extract invoice data" },
        { status: 422 }
      );
    }

    // Update scan with extracted data
    await admin
      .from("scans")
      .update({
        status: "completed",
        extracted_data: extractedData,
        company_name: extractedData.company_name,
        vat_number: extractedData.vat_number,
        company_number: extractedData.company_number,
        sort_code: extractedData.sort_code,
        account_number: extractedData.account_number,
      })
      .eq("id", scan.id);

    return NextResponse.json({
      scan_id: scan.id,
      extracted: extractedData,
    });
  } catch (error) {
    console.error("Extract error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
