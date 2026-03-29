import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Fetch the Facebook Marketplace page HTML directly and extract
 * item title + price from the page structure, then use Claude
 * (with web search) to estimate market valuation.
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
    console.log("Marketplace lookup for URL:", cleanUrl);

    // ── Step 1: Fetch the Facebook page HTML directly ──────────────────
    let itemTitle: string | null = null;
    let listedPrice: number | null = null;

    try {
      const pageRes = await fetch(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
        },
        redirect: "follow",
      });

      if (pageRes.ok) {
        const html = await pageRes.text();

        // Extract title from <title> tag or og:title meta
        const ogTitleMatch = html.match(
          /property="og:title"\s+content="([^"]+)"/
        ) ?? html.match(
          /content="([^"]+)"\s+property="og:title"/
        );
        if (ogTitleMatch) {
          // Facebook og:title format is usually "Item Title - Price - Facebook Marketplace"
          const rawTitle = ogTitleMatch[1];
          // Remove " - Facebook Marketplace" suffix and price
          const cleaned = rawTitle.replace(/ [-–] Facebook Marketplace$/i, "");
          itemTitle = cleaned;
        }

        if (!itemTitle) {
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) {
            itemTitle = titleMatch[1]
              .replace(/ [-–|] Facebook Marketplace$/i, "")
              .replace(/ [-–|] Facebook$/i, "")
              .trim();
          }
        }

        // Extract price from og:title (format: "Item - £X,XXX - Facebook Marketplace")
        const priceFromTitle = (ogTitleMatch?.[1] ?? "").match(
          /[£$€]\s?([\d,]+(?:\.\d{2})?)/
        );
        if (priceFromTitle) {
          listedPrice = parseFloat(priceFromTitle[1].replace(/,/g, ""));
        }

        // Try extracting price from meta description or structured data
        if (listedPrice === null) {
          const priceMatch =
            html.match(/\"amount\":\"?([\d.]+)\"?/) ??
            html.match(/\"price\":\"?([\d.]+)\"?/) ??
            html.match(/data-testid="[^"]*price[^"]*"[^>]*>[^<]*[£$€]\s?([\d,]+(?:\.\d{2})?)/);
          if (priceMatch) {
            listedPrice = parseFloat(priceMatch[1].replace(/,/g, ""));
          }
        }

        // Also try to extract from JSON-LD structured data
        const jsonLdRegex = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi;
        let jsonLdMatch;
        while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
          try {
            const ld = JSON.parse(jsonLdMatch[1]);
            if (ld.name && !itemTitle) itemTitle = ld.name;
            if (ld.offers?.price && listedPrice === null) {
              listedPrice = parseFloat(ld.offers.price);
            }
          } catch {
            // ignore parse errors
          }
        }

        // Clean up the title - separate item name from price if combined
        if (itemTitle && listedPrice === null) {
          const titlePriceMatch = itemTitle.match(
            /^(.+?)\s*[-–]\s*[£$€]\s?([\d,]+(?:\.\d{2})?)/
          );
          if (titlePriceMatch) {
            itemTitle = titlePriceMatch[1].trim();
            listedPrice = parseFloat(titlePriceMatch[2].replace(/,/g, ""));
          }
        }

        console.log("Extracted from HTML:", { itemTitle, listedPrice });
      } else {
        console.warn("Facebook page fetch failed:", pageRes.status);
      }
    } catch (fetchErr) {
      console.warn("Failed to fetch Facebook page:", fetchErr);
    }

    // ── Step 2: Use Claude with web search to estimate valuation ────────
    const searchQuery = itemTitle
      ? `What is the current UK market value for: ${itemTitle}? Search for recent UK sale prices.`
      : `Search for the Facebook Marketplace listing at ${cleanUrl} and determine what the item is and its UK market value.`;

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
            content: `${searchQuery}

${itemTitle ? `The item is listed on Facebook Marketplace as: "${itemTitle}"` : ""}
${listedPrice ? `The listed price is: £${listedPrice}` : ""}

Return JSON only with no markdown fences:
{
  "item_title": "${itemTitle ?? "the item name you found"}",
  "listed_price": ${listedPrice ?? "null"},
  "currency": "GBP",
  "estimated_min": <number - low end of market value in GBP>,
  "estimated_max": <number - high end of market value in GBP>,
  "confidence": "high" | "medium" | "low",
  "sources": ["urls of sources used"],
  "valuation_summary": "brief explanation of the valuation"
}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => "");
      console.error("Anthropic API error:", anthropicRes.status, errText);

      // If Claude fails but we have extracted data, return what we have
      if (itemTitle || listedPrice) {
        return NextResponse.json({
          itemTitle,
          listedPrice,
          currency: "GBP",
          valuationMin: null,
          valuationMax: null,
          confidence: "low",
          valuationSummary:
            "Could not estimate market value. Listing details were extracted from the page.",
          sources: [],
        });
      }

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
      // Return extracted data even if Claude gave no text response
      if (itemTitle || listedPrice) {
        return NextResponse.json({
          itemTitle,
          listedPrice,
          currency: "GBP",
          valuationMin: null,
          valuationMax: null,
          confidence: "low",
          valuationSummary: "Listing details extracted but valuation unavailable.",
          sources: [],
        });
      }
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
      // Still return extracted data
      if (itemTitle || listedPrice) {
        return NextResponse.json({
          itemTitle,
          listedPrice,
          currency: "GBP",
          valuationMin: null,
          valuationMax: null,
          confidence: "low",
          valuationSummary: cleaned || "Listing found but valuation parsing failed.",
          sources: [],
        });
      }
      return NextResponse.json(
        { error: "Failed to parse valuation response" },
        { status: 422 }
      );
    }

    console.log("Marketplace lookup result:", JSON.stringify(parsed));

    // Use extracted data as fallback if Claude didn't find them
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
