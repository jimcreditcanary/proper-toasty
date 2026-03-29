import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Two-step marketplace lookup:
 * 1. Use Claude with web_search to find the listing details from search engines
 * 2. Use Claude with web_search to estimate UK market valuation
 *
 * Facebook blocks direct HTML fetching, so we rely on search engine
 * indexing of listings to get item title and price.
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

    const body = await request.json();
    const { listingUrl } = body;

    if (!listingUrl || typeof listingUrl !== "string") {
      return NextResponse.json(
        { error: "listingUrl is required" },
        { status: 400 }
      );
    }

    // Clean the URL in case it's been doubled
    const cleanUrl = listingUrl.replace(
      /(https:\/\/www\.facebook\.com\/marketplace\/item\/\d+\/?).*$/,
      "$1"
    );

    // Extract the listing ID for search
    const listingIdMatch = cleanUrl.match(/\/item\/(\d+)/);
    const listingId = listingIdMatch ? listingIdMatch[1] : "";

    console.log("Marketplace lookup for URL:", cleanUrl, "ID:", listingId);

    // ── Step 1: Find listing details via web search ────────────────────
    const findListingRes = await fetch("https://api.anthropic.com/v1/messages", {
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
            content: `I need you to find details about a Facebook Marketplace listing.

The listing URL is: ${cleanUrl}
The listing ID is: ${listingId}

Please search for this specific listing using the listing ID number. Try searches like:
- "facebook marketplace ${listingId}"
- site:facebook.com/marketplace ${listingId}
- "${listingId}" marketplace

From the search results, extract the item title/name and the listed price in GBP.

Return ONLY a JSON object with no markdown fences:
{"item_title": "the item name", "listed_price": 1234, "currency": "GBP"}

If you cannot find the listing, still try to determine what the item might be from any cached results, snippets, or related pages. If you truly cannot find anything, return:
{"item_title": null, "listed_price": null, "currency": "GBP"}`,
          },
        ],
      }),
    });

    let itemTitle: string | null = null;
    let listedPrice: number | null = null;

    if (findListingRes.ok) {
      const findData = await findListingRes.json();
      const blocks = findData.content as Array<{ type: string; text?: string }>;

      let findText = "";
      for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i].type === "text" && blocks[i].text) {
          findText = blocks[i].text!;
          break;
        }
      }

      console.log("Step 1 raw response:", findText);

      if (findText) {
        const cleaned = findText
          .replace(/```json\s*/gi, "")
          .replace(/```\s*/g, "")
          .trim();
        try {
          const match = cleaned.match(/\{[\s\S]*\}/);
          const parsed = match ? JSON.parse(match[0]) : null;
          if (parsed) {
            itemTitle = parsed.item_title || null;
            listedPrice = parsed.listed_price != null ? Number(parsed.listed_price) : null;
          }
        } catch {
          console.warn("Failed to parse step 1 response");
        }
      }
    } else {
      const errText = await findListingRes.text().catch(() => "");
      console.error("Step 1 Anthropic error:", findListingRes.status, errText);
    }

    console.log("Step 1 result:", { itemTitle, listedPrice });

    // ── Step 2: Estimate UK market valuation ───────────────────────────
    const valuationPrompt = itemTitle
      ? `I need to know the current UK market value for this item: "${itemTitle}"

Search for recent UK sale prices, listings, and market data for this exact item or very similar items.

Return ONLY a JSON object with no markdown fences:
{
  "item_title": "${itemTitle}",
  "listed_price": ${listedPrice ?? "null"},
  "currency": "GBP",
  "estimated_min": <lowest reasonable UK price as a number>,
  "estimated_max": <highest reasonable UK price as a number>,
  "confidence": "high" | "medium" | "low",
  "sources": ["urls you found"],
  "valuation_summary": "brief 1-2 sentence explanation"
}`
      : `I tried to look up a Facebook Marketplace listing at ${cleanUrl} but could not find the item details. Return this JSON:
{"item_title": null, "listed_price": null, "currency": "GBP", "estimated_min": null, "estimated_max": null, "confidence": "low", "sources": [], "valuation_summary": "Could not identify the item from the listing URL."}`;

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
            content: valuationPrompt,
          },
        ],
      }),
    });

    if (!valuationRes.ok) {
      const errText = await valuationRes.text().catch(() => "");
      console.error("Step 2 Anthropic error:", valuationRes.status, errText);

      // Return whatever we have from step 1
      return NextResponse.json({
        itemTitle,
        listedPrice,
        currency: "GBP",
        valuationMin: null,
        valuationMax: null,
        confidence: "low",
        valuationSummary: itemTitle
          ? "Found listing details but could not estimate market value."
          : "Could not access listing or estimate value.",
        sources: [],
      });
    }

    const valuationData = await valuationRes.json();
    const valBlocks = valuationData.content as Array<{ type: string; text?: string }>;

    let valText = "";
    for (let i = valBlocks.length - 1; i >= 0; i--) {
      if (valBlocks[i].type === "text" && valBlocks[i].text) {
        valText = valBlocks[i].text!;
        break;
      }
    }

    console.log("Step 2 raw response:", valText);

    let parsed;
    if (valText) {
      const cleaned = valText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      try {
        const match = cleaned.match(/\{[\s\S]*\}/);
        parsed = match ? JSON.parse(match[0]) : null;
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      return NextResponse.json({
        itemTitle,
        listedPrice,
        currency: "GBP",
        valuationMin: null,
        valuationMax: null,
        confidence: "low",
        valuationSummary: itemTitle
          ? "Found listing but valuation parsing failed."
          : "Could not determine item or valuation.",
        sources: [],
      });
    }

    console.log("Final marketplace result:", JSON.stringify(parsed));

    return NextResponse.json({
      itemTitle: parsed.item_title || itemTitle || null,
      listedPrice: parsed.listed_price ?? listedPrice ?? null,
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
