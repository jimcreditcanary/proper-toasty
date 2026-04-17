import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * UK address lookup via Postcoder.
 *
 *   GET https://ws.postcoder.com/pcw/{API_KEY}/address/UK/{POSTCODE}
 *     ?format=json
 *     &lines=2
 *     &addtags=latitude,longitude,uprn,udprn
 *
 * We proxy this server-side so the key isn't exposed to the browser,
 * and we gate the call on an authenticated session. Returns a cleaned
 * array of addresses.
 */

const UK_POSTCODE_REGEX =
  /^(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

function normalisePostcode(input: string): string {
  const stripped = input.replace(/\s+/g, "").toUpperCase();
  if (stripped.length < 5 || stripped.length > 8) return stripped;
  return `${stripped.slice(0, stripped.length - 3)} ${stripped.slice(-3)}`;
}

export async function POST(request: NextRequest) {
  try {
    // Require an authenticated user — this is a paid upstream API,
    // don't let anonymous traffic hit it.
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "You need to be signed in to look up an address." },
        { status: 401 }
      );
    }

    const apiKey = process.env.POSTCODER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Address lookup isn't configured on the server. Please try again shortly.",
        },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawPostcode = typeof body?.postcode === "string" ? body.postcode : "";
    const sessionId =
      typeof body?.sessionId === "string" ? body.sessionId : null;
    const postcode = normalisePostcode(rawPostcode);
    if (!UK_POSTCODE_REGEX.test(postcode)) {
      return NextResponse.json(
        { error: "Please enter a valid UK postcode." },
        { status: 400 }
      );
    }

    const url = `https://ws.postcoder.com/pcw/${encodeURIComponent(
      apiKey
    )}/address/UK/${encodeURIComponent(postcode)}?format=json&lines=2&addtags=uprn,udprn,latitude,longitude`;

    const upstream = await fetch(url);

    if (upstream.status === 404) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any addresses for that postcode. Please check and try again.",
        },
        { status: 404 }
      );
    }
    if (upstream.status === 401 || upstream.status === 403) {
      console.error("Postcoder auth error:", await upstream.text());
      return NextResponse.json(
        {
          error:
            "The address lookup service rejected our request. Please try again later.",
        },
        { status: 502 }
      );
    }
    if (upstream.status === 429) {
      return NextResponse.json(
        {
          error: "Too many address lookups. Please wait a moment and try again.",
        },
        { status: 429 }
      );
    }
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => "");
      console.error("Postcoder error:", upstream.status, text);
      return NextResponse.json(
        {
          error:
            "The address lookup service is temporarily unavailable. Please try again shortly.",
        },
        { status: 502 }
      );
    }

    const raw = await upstream.json();
    if (!Array.isArray(raw) || raw.length === 0) {
      return NextResponse.json(
        {
          error:
            "We couldn't find any addresses for that postcode. Please check and try again.",
        },
        { status: 404 }
      );
    }

    // Pass through the useful fields; client can always query the full
    // record on confirm.
    type RawAddress = Record<string, unknown>;
    const addresses = (raw as RawAddress[]).map((a) => ({
      summaryline: typeof a.summaryline === "string" ? a.summaryline : "",
      addressline1: typeof a.addressline1 === "string" ? a.addressline1 : "",
      addressline2: typeof a.addressline2 === "string" ? a.addressline2 : "",
      organisation: typeof a.organisation === "string" ? a.organisation : "",
      buildingname: typeof a.buildingname === "string" ? a.buildingname : "",
      subbuildingname:
        typeof a.subbuildingname === "string" ? a.subbuildingname : "",
      premise: typeof a.premise === "string" ? a.premise : "",
      street: typeof a.street === "string" ? a.street : "",
      dependentlocality:
        typeof a.dependentlocality === "string" ? a.dependentlocality : "",
      posttown: typeof a.posttown === "string" ? a.posttown : "",
      county: typeof a.county === "string" ? a.county : "",
      postcode: typeof a.postcode === "string" ? a.postcode : postcode,
      uprn: typeof a.uprn === "string" ? a.uprn : "",
      udprn: typeof a.udprn === "string" ? a.udprn : "",
      latitude: typeof a.latitude === "string" ? a.latitude : "",
      longitude: typeof a.longitude === "string" ? a.longitude : "",
    }));

    // Attribute the upstream spend to this wizard session. Pull the
    // admin-configurable unit price (seeded to 0.07 in migration 019)
    // and fire-and-forget a PATCH to track-wizard-start.
    if (sessionId) {
      (async () => {
        try {
          const admin = createAdminClient();
          const { data: settingRow } = await admin
            .from("admin_settings")
            .select("value")
            .eq("key", "address_lookup_cost")
            .single();
          const unitPrice = Number(
            (settingRow as { value?: number | string } | null)?.value
          );
          if (!Number.isFinite(unitPrice) || unitPrice <= 0) return;
          await fetch(new URL("/api/track-wizard-start", request.url).toString(), {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId,
              propertyLookupCost: unitPrice,
            }),
          });
        } catch {
          /* fire-and-forget */
        }
      })();
    }

    return NextResponse.json({ postcode, addresses });
  } catch (err) {
    console.error("property-lookup error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
