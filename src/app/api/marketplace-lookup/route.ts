import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Marketplace listing analysis:
 * 1. Accept a screenshot of the listing
 * 2. Use Claude vision to extract item title + price from the screenshot
 * 3. Use Claude with web_search to estimate UK market valuation
 */
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

    const formData = await request.formData();
    const screenshot = formData.get("screenshot") as File | null;
    const listingUrl = formData.get("listingUrl") as string | null;

    if (!screenshot) {
      return NextResponse.json(
        { error: "Screenshot is required" },
        { status: 400 }
      );
    }

    console.log("Marketplace lookup — screenshot:", screenshot.name, screenshot.size, "bytes");

    // ── Step 1: Extract item details from screenshot via Claude vision ──
    const fileBuffer = Buffer.from(await screenshot.arrayBuffer());
    const fileBase64 = fileBuffer.toString("base64");

    const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: screenshot.type || "image/png",
                  data: fileBase64,
                },
              },
              {
                type: "text",
                text: `This is a screenshot of a Facebook Marketplace listing. Extract the following details from the screenshot:

1. The item title/name (the main heading)
2. The listed price (in GBP £)
3. The seller name (if visible)
4. The location (if visible)
5. A brief description of the item

Return ONLY a JSON object with no markdown fences:
{"item_title": "the item name", "listed_price": 1234.00, "currency": "GBP", "seller_name": "name or null", "location": "location or null", "description": "brief description of what the item is"}

Make sure listed_price is a number (not a string). If the price shows as "Free" use 0. If price is not visible, use null.`,
              },
            ],
          },
        ],
      }),
    });

    let itemTitle: string | null = null;
    let listedPrice: number | null = null;
    let itemDescription: string | null = null;

    if (extractRes.ok) {
      const extractData = await extractRes.json();
      const blocks = extractData.content as Array<{ type: string; text?: string }>;

      let extractText = "";
      for (const block of blocks) {
        if (block.type === "text" && block.text) {
          extractText = block.text;
          break;
        }
      }

      console.log("Step 1 (vision) raw response:", extractText);

      if (extractText) {
        const cleaned = extractText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        try {
          const match = cleaned.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : null;
          if (parsed) {
            itemTitle = parsed.item_title || null;
            listedPrice = parsed.listed_price != null ? Number(parsed.listed_price) : null;
            itemDescription = parsed.description || null;
          }
        } catch (e) {
          console.warn("Failed to parse step 1 response:", e);
        }
      }
    } else {
      const errText = await extractRes.text().catch(() => "");
      console.error("Step 1 (vision) Anthropic error:", extractRes.status, errText);
    }

    console.log("Step 1 result:", { itemTitle, listedPrice, itemDescription });

    // If we couldn't extract anything, return early
    if (!itemTitle) {
      return NextResponse.json({
        itemTitle: null,
        listedPrice: null,
        currency: "GBP",
        valuationMin: null,
        valuationMax: null,
        confidence: "low",
        valuationSummary: "Could not extract item details from the screenshot. Please ensure the screenshot clearly shows the item title and price.",
        sources: [],
      });
    }

    // ── Step 2: Estimate UK market valuation via web search ─────────────
    const valuationRes = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: `I need to know the current UK market value for this item: "${itemTitle}"
${itemDescription ? `\nDescription: ${itemDescription}` : ""}
${listedPrice != null ? `\nIt is listed on Facebook Marketplace for £${listedPrice}` : ""}

Search for recent UK sale prices, dealer prices, and market data for this exact item or very similar items. Check sites like eBay UK, Autotrader, Gumtree, specialist dealers, etc.

Return ONLY a JSON object with no markdown fences:
{
  "estimated_min": <lowest reasonable UK market price as a number>,
  "estimated_max": <highest reasonable UK market price as a number>,
  "confidence": "high" | "medium" | "low",
  "sources": ["urls of sources found"],
  "valuation_summary": "brief 1-2 sentence explanation of how you determined the value range"
}`,
          },
        ],
      }),
    });

    let valuationMin: number | null = null;
    let valuationMax: number | null = null;
    let confidence = "low";
    let valuationSummary: string | null = null;
    let sources: string[] = [];

    if (valuationRes.ok) {
      const valData = await valuationRes.json();
      const valBlocks = valData.content as Array<{ type: string; text?: string }>;

      let valText = "";
      for (let i = valBlocks.length - 1; i >= 0; i--) {
        if (valBlocks[i].type === "text" && valBlocks[i].text) {
          valText = valBlocks[i].text!;
          break;
        }
      }

      console.log("Step 2 (valuation) raw response:", valText);

      if (valText) {
        const cleaned = valText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        try {
          const match = cleaned.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : null;
          if (parsed) {
            valuationMin = parsed.estimated_min != null ? Number(parsed.estimated_min) : null;
            valuationMax = parsed.estimated_max != null ? Number(parsed.estimated_max) : null;
            confidence = parsed.confidence ?? "low";
            valuationSummary = parsed.valuation_summary ?? null;
            sources = parsed.sources ?? [];
          }
        } catch (e) {
          console.warn("Failed to parse step 2 response:", e);
        }
      }
    } else {
      const errText = await valuationRes.text().catch(() => "");
      console.error("Step 2 (valuation) Anthropic error:", valuationRes.status, errText);
    }

    console.log("Final result:", { itemTitle, listedPrice, valuationMin, valuationMax, confidence });

    return NextResponse.json({
      itemTitle,
      listedPrice,
      currency: "GBP",
      valuationMin,
      valuationMax,
      confidence,
      valuationSummary: valuationSummary ?? "Valuation could not be determined.",
      sources,
    });
  } catch (error) {
    console.error("Marketplace lookup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
