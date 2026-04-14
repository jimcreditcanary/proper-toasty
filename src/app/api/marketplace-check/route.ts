import { NextRequest, NextResponse } from "next/server";

/**
 * Marketplace listing check (wizard):
 * 1. Accept a screenshot of the listing (FormData: "screenshot" + optional "sessionId")
 * 2. Claude vision extracts item title + listed price from the screenshot
 * 3. Claude (with web_search) searches for UK comparable prices and returns a valuation range
 *
 * Returns: { itemTitle, listedPrice, valuationMin, valuationMax, valuationSummary, confidence }
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const screenshot = formData.get("screenshot") as File | null;
    const sessionId = formData.get("sessionId") as string | null;

    if (!screenshot) {
      return NextResponse.json(
        { error: "Screenshot is required" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const fileBuffer = Buffer.from(await screenshot.arrayBuffer());
    const fileBase64 = fileBuffer.toString("base64");
    const mediaType = screenshot.type || "image/png";

    // ── Step 1: Vision extraction of item title + listed price ─────────
    const extractRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
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
                  media_type: mediaType,
                  data: fileBase64,
                },
              },
              {
                type: "text",
                text: `This is a screenshot of a Facebook Marketplace listing. Extract:

1. The item title/name (the main heading)
2. The listed price (in GBP \u00A3)
3. A brief description of the item (make/model/year/condition if visible)

Return ONLY a JSON object with no markdown fences:
{"item_title": "the item name", "listed_price": 1234.00, "description": "brief description"}

Make sure listed_price is a number (not a string). If the price shows as "Free" use 0. If price is not visible, use null.`,
              },
            ],
          },
        ],
      }),
    });

    if (!extractRes.ok) {
      const errText = await extractRes.text();
      console.error("Vision extraction error:", extractRes.status, errText);
      return NextResponse.json(
        { error: "Failed to read the listing screenshot" },
        { status: 502 }
      );
    }

    const extractData = await extractRes.json();
    const extractBlocks = extractData.content as Array<{ type: string; text?: string }>;
    let extractText = "";
    for (const block of extractBlocks) {
      if (block.type === "text" && block.text) {
        extractText = block.text;
        break;
      }
    }

    let itemTitle: string | null = null;
    let listedPrice: number | null = null;
    let itemDescription: string | null = null;

    if (extractText) {
      const cleaned = extractText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          itemTitle = parsed.item_title || null;
          listedPrice = parsed.listed_price != null ? Number(parsed.listed_price) : null;
          itemDescription = parsed.description || null;
        } catch (e) {
          console.warn("Failed to parse vision response:", e);
        }
      }
    }

    if (!itemTitle) {
      return NextResponse.json(
        {
          error:
            "Couldn't read the item from that screenshot. Make sure the title and price are visible, and try again.",
        },
        { status: 400 }
      );
    }

    // ── Step 2: Valuation search via Claude + web_search ──────────────
    const valueRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [
          {
            role: "user",
            content: `You are a marketplace item valuation assistant for WhoAmIPaying, a UK payment verification service.

A user has shared a Facebook Marketplace listing. We have already extracted these details from the screenshot:
- Item: ${itemTitle}
- Listed price: ${listedPrice != null ? `\u00A3${listedPrice}` : "not visible"}
- Description: ${itemDescription ?? "(none)"}

Your task:
1. Search for comparable UK listings/sales to estimate the current market value in GBP. Check eBay UK, Autotrader UK (for vehicles), Gumtree, specialist UK dealers, and any relevant sources.
2. Return a valuation range based on the comparables you find.
3. If you can't find comparables, set confidence to "low" and explain.

CRITICAL RULES:
- valuationMin and valuationMax MUST represent the actual market value range from comparable listings/sales
- Do NOT adjust for "private sale discount" or condition assumptions
- All prices in GBP (\u00A3). Convert from EUR/USD if needed, stating the rate used
- Prioritise UK sources

Return ONLY a JSON object with no markdown fences:
{
  "valuationMin": <number - lowest comparable price found in GBP>,
  "valuationMax": <number - highest comparable price found in GBP>,
  "valuationSummary": "<Plain text, under 150 words. State what the item appears to be, what comparable listings you found and their prices in GBP, and whether the listing seems like good/fair/poor value. Be direct and factual. No markdown.>",
  "confidence": "high" | "medium" | "low"
}`,
          },
        ],
      }),
    });

    if (!valueRes.ok) {
      const errText = await valueRes.text();
      console.error("Valuation search error:", valueRes.status, errText);
      return NextResponse.json(
        { error: "Failed to analyse marketplace listing" },
        { status: 502 }
      );
    }

    const valueData = await valueRes.json();
    const valueBlocks = valueData.content as Array<{ type: string; text?: string }>;

    let valueText = "";
    for (let i = valueBlocks.length - 1; i >= 0; i--) {
      if (valueBlocks[i].type === "text" && valueBlocks[i].text) {
        valueText = valueBlocks[i].text!;
        break;
      }
    }

    if (!valueText) {
      return NextResponse.json(
        { error: "No response from valuation analysis" },
        { status: 502 }
      );
    }

    const valueCleaned = valueText
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const valueMatch = valueCleaned.match(/\{[\s\S]*\}/);
    if (!valueMatch) {
      return NextResponse.json(
        { error: "Could not parse valuation response" },
        { status: 502 }
      );
    }

    const valueParsed = JSON.parse(valueMatch[0]);

    // Track cost against wizard session
    if (sessionId) {
      const extractTokens =
        (extractData.usage?.input_tokens || 0) + (extractData.usage?.output_tokens || 0);
      const valueTokens =
        (valueData.usage?.input_tokens || 0) + (valueData.usage?.output_tokens || 0);
      const totalTokens = extractTokens + valueTokens;
      const costPer1k = 0.003;
      const marketplaceCost = (totalTokens / 1000) * costPer1k;
      fetch(new URL("/api/track-wizard-start", req.url).toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, marketplaceCost }),
      }).catch(() => {});
    }

    return NextResponse.json({
      itemTitle,
      listedPrice,
      valuationMin: Number(valueParsed.valuationMin) || 0,
      valuationMax: Number(valueParsed.valuationMax) || 0,
      valuationSummary: valueParsed.valuationSummary ?? "",
      confidence: valueParsed.confidence ?? "low",
    });
  } catch (err) {
    console.error("marketplace-check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
