import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, sessionId } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid 'url' parameter" },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
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

A user has shared this Facebook Marketplace listing URL: ${url}

Your task:
1. Try to identify the item from the URL. Facebook Marketplace URLs often contain a slug describing the item (e.g. "/marketplace/item/123456/2019-bmw-3-series-320d/"). Extract what you can from the URL slug. If the page content is accessible, use that too.
2. Search for the item + "price UK" to estimate its current market value in the UK. Check eBay UK, Autotrader UK (for vehicles), Gumtree, specialist UK dealers, and any relevant sources.
3. If the URL contains no useful slug or you cannot identify the item at all, set confidence to "low" and explain in the summary.

CRITICAL RULES:
- valuationMin and valuationMax MUST represent the actual market value range found from comparable listings/sales
- Do NOT adjust for "private sale discount" or condition assumptions
- All prices in GBP (£). Convert from EUR/USD if needed, stating the rate used
- Prioritise UK sources

Return ONLY a JSON object with no markdown fences:
{
  "itemTitle": "<best guess at item name/title>",
  "listedPrice": <number if you can determine it, or null>,
  "valuationMin": <number - lowest comparable price found in GBP>,
  "valuationMax": <number - highest comparable price found in GBP>,
  "valuationSummary": "<Plain text, under 150 words. State what the item appears to be, what comparable listings you found and their prices in GBP, and whether the listing seems like good/fair/poor value. Be direct and factual. No markdown.>",
  "confidence": "high" | "medium" | "low"
}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Anthropic API error:", res.status, errText);
      return NextResponse.json(
        { error: "Failed to analyse marketplace listing" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const blocks = data.content as Array<{ type: string; text?: string }>;

    // Find the last text block (Claude's final answer after web searches)
    let textContent = "";
    for (let i = blocks.length - 1; i >= 0; i--) {
      if (blocks[i].type === "text" && blocks[i].text) {
        textContent = blocks[i].text!;
        break;
      }
    }

    if (!textContent) {
      return NextResponse.json(
        { error: "No response from analysis" },
        { status: 502 }
      );
    }

    // Strip markdown fences if present and extract JSON
    const cleaned = textContent
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);

    if (!match) {
      return NextResponse.json(
        { error: "Could not parse analysis response" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(match[0]);

    // Track marketplace check cost against wizard session
    if (sessionId && data.usage) {
      const totalTokens = (data.usage.input_tokens || 0) + (data.usage.output_tokens || 0);
      const costPer1k = 0.003;
      const marketplaceCost = (totalTokens / 1000) * costPer1k;
      fetch(new URL("/api/track-wizard-start", req.url).toString(), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, marketplaceCost }),
      }).catch(() => {});
    }

    return NextResponse.json({
      itemTitle: parsed.itemTitle ?? "Unknown item",
      listedPrice: parsed.listedPrice ?? null,
      valuationMin: Number(parsed.valuationMin) || 0,
      valuationMax: Number(parsed.valuationMax) || 0,
      valuationSummary: parsed.valuationSummary ?? "",
      confidence: parsed.confidence ?? "low",
    });
  } catch (err) {
    console.error("marketplace-check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
