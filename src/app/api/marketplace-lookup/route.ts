import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Session auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { listingUrl } = body;

    if (!listingUrl || typeof listingUrl !== "string") {
      return NextResponse.json(
        { error: "listingUrl is required" },
        { status: 400 }
      );
    }

    console.log("Marketplace lookup for URL:", listingUrl);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `Search for the Facebook Marketplace listing at this URL: ${listingUrl}. Extract the item title and listed price if publicly visible. Then search for the approximate UK market value of this item. Return JSON only with no markdown: { "item_title": "string", "listed_price": number | null, "currency": "GBP", "estimated_min": number, "estimated_max": number, "confidence": "high"|"medium"|"low", "sources": ["string"], "valuation_summary": "string" }`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return NextResponse.json(
        { error: "Failed to analyse listing" },
        { status: 502 }
      );
    }

    const anthropicData = await anthropicRes.json();

    // Find the last text content block
    const contentBlocks = anthropicData.content as Array<{
      type: string;
      text?: string;
    }>;
    let responseText = "";
    for (let i = contentBlocks.length - 1; i >= 0; i--) {
      if (contentBlocks[i].type === "text" && contentBlocks[i].text) {
        responseText = contentBlocks[i].text!;
        break;
      }
    }

    if (!responseText) {
      return NextResponse.json(
        { error: "No text response from AI" },
        { status: 502 }
      );
    }

    // Strip markdown fences if present
    const cleaned = responseText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    let parsed;
    try {
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      console.error("Failed to parse marketplace response. Raw text:", cleaned);
      return NextResponse.json(
        { error: "Failed to parse valuation response" },
        { status: 422 }
      );
    }

    console.log("Marketplace lookup result:", JSON.stringify(parsed));

    return NextResponse.json({
      itemTitle: parsed.item_title ?? null,
      listedPrice: parsed.listed_price ?? null,
      currency: parsed.currency ?? "GBP",
      valuationMin: parsed.estimated_min ?? null,
      valuationMax: parsed.estimated_max ?? null,
      confidence: parsed.confidence ?? "low",
      valuationSummary: parsed.valuation_summary ?? null,
      sources: parsed.sources ?? [],
    });
  } catch (error) {
    console.error("Marketplace lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
