import { NextResponse } from "next/server";
import { z } from "zod";
import {
  lookupAddressesByPostcode as lookupViaOsPlaces,
  osPlacesConfigured,
} from "@/lib/services/os-places";
import { validatePostcode } from "@/lib/services/postcodes";
import {
  osCountryCodeToUkCountry,
} from "@/lib/schemas/os-places";
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
 * Resolve a postcode to a list of addresses via OS Places.
 *
 * OS Places is the only address provider — Postcoder was removed in
 * favour of OS Places' authoritative AddressBase data (real UPRN +
 * per-property WGS84 lat/lng + classification + parent UPRN, all
 * persisted as address_metadata for the installer brief).
 */
async function resolveAddresses(
  postcode: string
): Promise<{
  addresses: AddressLookupResponse["addresses"];
  rawCount: number;
  countryCodeOverride: "England" | "Wales" | "Scotland" | "Northern Ireland" | null;
}> {
  if (!osPlacesConfigured()) {
    throw new Error(
      "OS_PLACES_API_KEY is not set. The address lookup requires an OS DataHub Places API key."
    );
  }

  const rows = await lookupViaOsPlaces(postcode);

  // Filter out historical / closed entries (LOGICAL_STATUS_CODE 8)
  // before display. OS keeps demolished or split addresses in DPA
  // for delivery-history continuity but they shouldn't appear in
  // a homeowner picker.
  const liveRows = rows.filter((r) => {
    const status = typeof r.LOGICAL_STATUS_CODE === "number"
      ? r.LOGICAL_STATUS_CODE
      : Number(r.LOGICAL_STATUS_CODE ?? 1);
    return Number.isFinite(status) ? status === 1 : true;
  });

  const addresses: AddressLookupResponse["addresses"] = liveRows.map((r) => {
    const buildingNumber =
      r.BUILDING_NUMBER != null ? String(r.BUILDING_NUMBER) : "";
    const subBuilding = r.SUB_BUILDING_NAME ?? "";
    const buildingName = r.BUILDING_NAME ?? "";
    const thoroughfare = r.THOROUGHFARE_NAME ?? "";
    const dependentThoroughfare = r.DEPENDENT_THOROUGHFARE_NAME ?? "";
    const organisation = r.ORGANISATION_NAME ?? "";

    // Compose addressLine1 from the granular fields rather than the
    // ALL-CAPS comma-joined ADDRESS — easier for the EPC fuzzy
    // matcher to parse. The full ADDRESS still survives as `summary`.
    const line1Parts = [
      organisation,
      subBuilding,
      buildingName,
      [buildingNumber, thoroughfare].filter(Boolean).join(" "),
    ].filter(Boolean);
    const addressLine1 = line1Parts.join(", ");
    const addressLine2 = dependentThoroughfare || null;

    const logicalStatus = typeof r.LOGICAL_STATUS_CODE === "number"
      ? r.LOGICAL_STATUS_CODE
      : Number(r.LOGICAL_STATUS_CODE ?? NaN);
    const blpuState = typeof r.BLPU_STATE_CODE === "number"
      ? r.BLPU_STATE_CODE
      : Number(r.BLPU_STATE_CODE ?? NaN);

    const metadata: AddressMetadata = {
      source: "os-places",
      classificationCode: r.CLASSIFICATION_CODE ?? null,
      classificationDescription: r.CLASSIFICATION_CODE_DESCRIPTION ?? null,
      countryCode: r.COUNTRY_CODE ?? null,
      localCustodianCode: r.LOCAL_CUSTODIAN_CODE ?? null,
      wardCode: r.WARD_CODE ?? null,
      parishCode: r.PARISH_CODE ?? null,
      parentUprn: r.PARENT_UPRN != null ? String(r.PARENT_UPRN) : null,
      topographyLayerToid: r.TOPOGRAPHY_LAYER_TOID ?? null,
      logicalStatusCode: Number.isFinite(logicalStatus) ? logicalStatus : null,
      deliveryPointSuffix: r.DELIVERY_POINT_SUFFIX ?? null,
      blpuStateCode: Number.isFinite(blpuState) ? blpuState : null,
      lastUpdateDate: r.LAST_UPDATE_DATE ?? null,
      raw: r as unknown as Record<string, unknown>,
    };

    return {
      uprn: String(r.UPRN),
      udprn: r.UDPRN != null ? String(r.UDPRN) : null,
      summary: r.ADDRESS,
      addressLine1: addressLine1 || r.ADDRESS,
      addressLine2,
      postcode: r.POSTCODE,
      postTown: r.POST_TOWN,
      latitude: r.LAT,
      longitude: r.LNG,
      metadata,
    };
  });

  // Per-property COUNTRY_CODE beats the postcode-centroid country
  // — correctly handles the few hundred postcodes that straddle the
  // England/Wales border.
  const countryCodeOverride =
    addresses
      .map((a) => osCountryCodeToUkCountry(a.metadata?.countryCode ?? undefined))
      .find(
        (c): c is "England" | "Wales" | "Scotland" | "Northern Ireland" =>
          c !== null
      ) ?? null;

  return {
    addresses,
    rawCount: rows.length,
    countryCodeOverride,
  };
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
      { status: 400 }
    );
  }

  const formatted = formatPostcode(parsed.data.postcode);
  if (!UK_POSTCODE_REGEX.test(formatted)) {
    return NextResponse.json(
      { error: "That doesn't look like a UK postcode." },
      { status: 400 }
    );
  }

  try {
    // Resolve addresses + country gate (Postcodes.io) in parallel.
    // Postcodes.io is the cheap fallback for the country lookup when
    // OS Places' COUNTRY_CODE is absent — rare but seen on some
    // edge cases (e.g. brand-new builds).
    const [resolution, postcodeMeta] = await Promise.all([
      resolveAddresses(formatted),
      validatePostcode(formatted).catch((err) => {
        console.warn("Postcodes.io failed (non-fatal):", err);
        return null;
      }),
    ]);

    const response: AddressLookupResponse = {
      addresses: resolution.addresses,
      country: resolution.countryCodeOverride ?? postcodeMeta?.country ?? null,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("address lookup error", err);
    const msg =
      err instanceof Error && err.message.includes("429")
        ? "Too many address lookups right now — please wait a moment and try again."
        : "Address lookup failed.";
    const status =
      err instanceof Error && err.message.includes("429") ? 429 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
