import { NextResponse } from "next/server";
import { z } from "zod";
import {
  lookupAddressesByPostcode as lookupViaPostcoder,
  postcoderConfigured,
  postcoderCountryToUkCountry,
  type PostcoderNgdAddress,
} from "@/lib/services/postcoder";
import { validatePostcode } from "@/lib/services/postcodes";
import type {
  AddressLookupResponse,
  AddressMetadata,
} from "@/lib/schemas/address-lookup";

export const runtime = "nodejs";

const RequestSchema = z.object({
  postcode: z.string().min(5).max(10),
});

// UK postcode regex — covers GIR 0AA + all variants.
const UK_POSTCODE_REGEX =
  /^(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

function formatPostcode(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s.length < 5) return raw.trim();
  return `${s.slice(0, -3)} ${s.slice(-3)}`;
}

/**
 * Resolve a postcode to a list of addresses via Postcoder NGD.
 *
 * Postcoder replaced OS Places in Aug 2026 — OS revoked our Places
 * access, Postcoder gives us the same PAF + AddressBase-equivalent
 * data (real UPRN + per-property WGS84 + classification + local
 * custodian) plus a friendlier per-postcode caching story
 * (see src/lib/services/postcoder.ts — 30-day cache, 3.5 credits
 * per miss, 0 credits per hit).
 */
async function resolveAddresses(
  postcode: string,
  centroidLat: number,
  centroidLng: number,
): Promise<{
  addresses: AddressLookupResponse["addresses"];
  rawCount: number;
  countryCodeOverride:
    | "England"
    | "Wales"
    | "Scotland"
    | "Northern Ireland"
    | null;
}> {
  if (!postcoderConfigured()) {
    throw new Error(
      "POSTCODER_API_KEY is not set. The address lookup requires a Postcoder NGD API key.",
    );
  }

  const rows = await lookupViaPostcoder(postcode);

  const addresses: AddressLookupResponse["addresses"] = rows.map((r) =>
    mapPostcoderRow(r, postcode, centroidLat, centroidLng),
  );

  // Per-property country beats the postcode-centroid country —
  // straddled-border postcodes end up in the wrong country
  // otherwise. Postcoder's NGD default response returns `country`
  // as human-readable text ("England" / "Wales" / …) at the
  // top level of each row, so we pull it from raw directly.
  const countryCodeOverride =
    rows
      .map((r) =>
        postcoderCountryToUkCountry(
          typeof r.country === "string" ? r.country : null,
        ),
      )
      .find(
        (c): c is "England" | "Wales" | "Scotland" | "Northern Ireland" =>
          c !== null,
      ) ?? null;

  return {
    addresses,
    rawCount: rows.length,
    countryCodeOverride,
  };
}

/**
 * Map one Postcoder NGD row → the shape the wizard expects.
 *
 * Postcoder NGD's DEFAULT response uses these field names for the
 * address parts (not the Royal Mail names in the addtag block):
 *   - number     → building number ("10")
 *   - name       → building name ("York Buildings", "The Old Rectory")
 *   - subname    → sub-building name ("Flat 3")
 *   - streetname → thoroughfare
 *   - locality   → dependent locality (usually the district)
 *   - townname   → post town
 *   - postcode, country, latitude, longitude, uprn, udprn — as named
 *
 * lat/lng come back as STRINGS not numbers in the NGD response —
 * we coerce with Number() and fall back to the postcode centroid
 * if the coerce fails.
 *
 * addressLine1 is composed from the granular parts (not fulladdress)
 * because the EPC fuzzy matcher parses "10 Downing Street" more
 * reliably than "10, Downing Street, London, SW1A 2AA".
 */
function mapPostcoderRow(
  r: PostcoderNgdAddress,
  fallbackPostcode: string,
  centroidLat: number,
  centroidLng: number,
): AddressLookupResponse["addresses"][number] {
  const buildingNumber = r.number != null ? String(r.number) : "";
  const subName = strOrEmpty(r.subname);
  const buildingName = strOrEmpty(r.name);
  const streetName = strOrEmpty(r.streetname);
  const locality = strOrEmpty(r.locality);
  const townName = strOrEmpty(r.townname);
  const organisation = strOrEmpty(r.organisationname);

  // Compose addressLine1 from the parts we have. Order:
  //   organisation, subname, name (buildingname), "<number> <street>"
  // Each part is only added when non-empty so we never end up with
  // ", , , 10 Downing Street".
  const line1Parts = [
    organisation,
    subName,
    buildingName,
    [buildingNumber, streetName].filter(Boolean).join(" "),
  ].filter(Boolean);
  const addressLine1 =
    line1Parts.join(", ") ||
    (typeof r.fulladdress === "string" ? r.fulladdress : "");
  // addressLine2: locality when it's a distinct dependent locality
  // (not the same as the post town — Postcoder sometimes echoes the
  // town into locality when there's no genuine dependent locality).
  const addressLine2 =
    locality && locality.toLowerCase() !== townName.toLowerCase()
      ? locality
      : null;

  const uprn = r.uprn != null ? String(r.uprn) : null;
  const udprn = r.udprn != null ? String(r.udprn) : null;

  const latitude = numberOrNull(r.latitude) ?? centroidLat;
  const longitude = numberOrNull(r.longitude) ?? centroidLng;

  const metadata: AddressMetadata = {
    source: "postcoder",
    classificationCode: strOrNull(r.classificationcode),
    classificationDescription: strOrNull(r.classificationdescription),
    // Postcoder returns `country` as free text ("England"), not a
    // GSS code. The UkCountry mapping happens above at the
    // resolveAddresses level; we don't try to fake a GSS code here.
    countryCode: null,
    localCustodianCode: numberOrNull(r.localcustodiancode),
    wardCode: null,
    parishCode: null,
    parentUprn: r.parentuprn != null ? String(r.parentuprn) : null,
    topographyLayerToid: null,
    logicalStatusCode: null,
    deliveryPointSuffix: strOrNull(r.deliverypointsuffix),
    blpuStateCode: null,
    lastUpdateDate: null,
    raw: r as unknown as Record<string, unknown>,
  };

  const postcodeOut = strOrEmpty(r.postcode) || fallbackPostcode;
  const summary =
    strOrEmpty(r.summaryline) ||
    strOrEmpty(r.fulladdress) ||
    [addressLine1, townName, postcodeOut].filter(Boolean).join(", ");

  return {
    uprn,
    udprn,
    summary,
    addressLine1,
    addressLine2,
    postcode: postcodeOut,
    postTown: townName,
    latitude,
    longitude,
    metadata,
  };
}

// ─── field coercion helpers ─────────────────────────────────────
//
// Postcoder NGD is inconsistent about numeric vs string encoding
// (latitude comes back quoted, uprn sometimes quoted, sometimes
// not). These normalise once so the mapper stays readable.

function strOrEmpty(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function strOrNull(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
function numberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const formatted = formatPostcode(parsed.data.postcode);
  if (!UK_POSTCODE_REGEX.test(formatted)) {
    return NextResponse.json(
      { error: "That doesn't look like a UK postcode." },
      { status: 400 },
    );
  }

  try {
    // Postcodes.io — cheap country lookup + centroid fallback when
    // Postcoder omits per-property lat/lng (rare, on new builds).
    const postcodeMeta = await validatePostcode(formatted).catch((err) => {
      console.warn("Postcodes.io failed (non-fatal):", err);
      return null;
    });
    const centroidLat = postcodeMeta?.latitude ?? 0;
    const centroidLng = postcodeMeta?.longitude ?? 0;

    const resolution = await resolveAddresses(
      formatted,
      centroidLat,
      centroidLng,
    );

    const response: AddressLookupResponse = {
      addresses: resolution.addresses,
      country:
        resolution.countryCodeOverride ?? postcodeMeta?.country ?? null,
    };
    return NextResponse.json(response);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error("[address-lookup] error", detail);
    const msg = detail.includes("429")
      ? "Too many address lookups right now — please wait a moment and try again."
      : "Address lookup failed.";
    const status = detail.includes("429") ? 429 : 502;
    // The Postcoder service already scrubs the API key from any
    // error string it throws — safe to echo the detail so DevTools
    // shows the cause without needing Vercel logs.
    return NextResponse.json({ error: msg, detail }, { status });
  }
}
