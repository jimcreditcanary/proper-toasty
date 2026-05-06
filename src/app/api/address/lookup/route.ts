import { NextResponse } from "next/server";
import { z } from "zod";
import {
  lookupAddressesByPostcode as lookupViaPostcoder,
} from "@/lib/services/postcoder";
import {
  lookupAddressesByPostcode as lookupViaOsPlaces,
  osPlacesConfigured,
} from "@/lib/services/os-places";
import { validatePostcode } from "@/lib/services/postcodes";
import type { AddressLookupResponse, AddressMetadata } from "@/lib/schemas/postcoder";
import { osCountryCodeToUkCountry } from "@/lib/schemas/os-places";

export const runtime = "nodejs";

const RequestSchema = z.object({
  postcode: z.string().min(5).max(10),
});

// UK postcode regex — same as whoamipaying's, covers GIR 0AA + all variants.
const UK_POSTCODE_REGEX =
  /^(GIR 0AA|[A-PR-UWYZ]([0-9]{1,2}|([A-HK-Y][0-9]([0-9ABEHMNPRV-Y])?)|[0-9][A-HJKPS-UW]) ?[0-9][ABD-HJLNP-UW-Z]{2})$/i;

// In-memory dedupe for the "Postcoder is not returning UPRNs" warning.
// Cleared on cold-start; that's fine — it's an operations signal, not
// state we need to persist. Prevents a spammed log on a busy postcode.
const UPRN_WARNING_LOGGED = new Set<string>();

function formatPostcode(raw: string): string {
  const s = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (s.length < 5) return raw.trim();
  return `${s.slice(0, -3)} ${s.slice(-3)}`;
}

/** Pick OS Places when configured (real UPRNs + per-property lat/lng);
 *  otherwise fall back to Postcoder. The two providers map onto a
 *  single normalised shape downstream. */
async function resolveAddresses(
  postcode: string,
  centroidLat: number,
  centroidLng: number
): Promise<{
  addresses: AddressLookupResponse["addresses"];
  source: "os-places" | "postcoder";
  rawCount: number;
  // OS Places gives us a per-property COUNTRY_CODE; when present we
  // prefer it over the Postcodes.io centroid country.
  countryCodeOverride: "England" | "Wales" | "Scotland" | "Northern Ireland" | null;
}> {
  if (osPlacesConfigured()) {
    try {
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
        // OS Places gives us a real UPRN for every row plus per-property
        // WGS84 coords. Build the same shape Postcoder produces so the
        // wizard doesn't need to know which provider answered.
        const buildingNumber =
          r.BUILDING_NUMBER != null ? String(r.BUILDING_NUMBER) : "";
        const subBuilding = r.SUB_BUILDING_NAME ?? "";
        const buildingName = r.BUILDING_NAME ?? "";
        const thoroughfare = r.THOROUGHFARE_NAME ?? "";
        const dependentThoroughfare = r.DEPENDENT_THOROUGHFARE_NAME ?? "";
        const organisation = r.ORGANISATION_NAME ?? "";

        // Compose addressLine1 favouring the granular fields over ADDRESS
        // (which is uppercase + comma-joined and harder for the EPC fuzzy
        // matcher to parse). Mirrors the convention Postcoder uses for line1.
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
          // The full row, preserved verbatim. Lets the installer report
          // and admin tooling pivot into fields we haven't typed without
          // a schema bump.
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

      // Use the OS-supplied country code (per-property) when available.
      // All rows in a postcode resolve to the same country; sample the
      // first one with a code.
      const countryCodeOverride =
        addresses
          .map((a) => osCountryCodeToUkCountry(a.metadata?.countryCode ?? undefined))
          .find((c): c is "England" | "Wales" | "Scotland" | "Northern Ireland" => c !== null) ?? null;

      return {
        addresses,
        source: "os-places",
        rawCount: rows.length,
        countryCodeOverride,
      };
    } catch (err) {
      console.warn(
        "[address-lookup] OS Places failed, falling back to Postcoder:",
        err
      );
      // Fall through to Postcoder.
    }
  }

  const rawAddresses = await lookupViaPostcoder(postcode);
  const addresses: AddressLookupResponse["addresses"] = rawAddresses.map((a) => {
    const lat = Number(a.latitude) || centroidLat || 0;
    const lng = Number(a.longitude) || centroidLng || 0;
    // CRITICAL: never synthesise a UPRN. A real UPRN is a 1-12 digit
    // integer; downstream (EPC, OS) services try to look it up. If we
    // make one up ("row-12"), the EPC service can't parse it, silently
    // skips the UPRN-first path, and falls back to a fuzzy postcode+
    // address match — which is lossy in multi-flat blocks like HX3 7DG.
    // Pass `null` instead so the EPC route hits postcode+address with
    // the FULL address summary (see step-2-preview + analyse routes).
    const uprn = a.uprn && /^\d{1,12}$/.test(a.uprn.trim()) ? a.uprn.trim() : null;
    return {
      uprn,
      udprn: a.udprn || null,
      summary:
        a.summaryline ||
        [a.addressline1, a.addressline2].filter(Boolean).join(", ") ||
        postcode,
      addressLine1: a.addressline1 || a.summaryline || "",
      addressLine2: a.addressline2 || null,
      postcode: a.postcode || postcode,
      postTown: a.posttown || "",
      latitude: lat,
      longitude: lng,
      // Postcoder doesn't have OS-equivalent rich fields; stash the raw
      // row so admin tooling can still see what came back.
      metadata: {
        source: "postcoder",
        raw: a as unknown as Record<string, unknown>,
      },
    };
  });
  return {
    addresses,
    source: "postcoder",
    rawCount: rawAddresses.length,
    countryCodeOverride: null,
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
    // Postcodes.io for the country gate (free) — runs in parallel with the
    // address provider, neither depends on the other.
    const postcodeMetaPromise = validatePostcode(formatted).catch((err) => {
      console.warn("Postcodes.io failed (non-fatal):", err);
      return null;
    });

    // Resolve addresses (OS Places primary, Postcoder fallback). Postcodes.io
    // centroid is only used when the Postcoder path is taken — OS Places
    // returns per-property WGS84 lat/lng directly.
    const postcodeMeta = await postcodeMetaPromise;
    const centroidLat = postcodeMeta?.latitude ?? 0;
    const centroidLng = postcodeMeta?.longitude ?? 0;

    const { addresses, source, rawCount, countryCodeOverride } =
      await resolveAddresses(formatted, centroidLat, centroidLng);

    // UPRN-coverage diagnostics. With OS Places we expect 100% UPRN
    // coverage; with Postcoder it depends on the plan's addtags. Log
    // once per postcode per process boot when half or more rows are
    // missing — the underlying issue is operational, not request-level.
    const missingUprn = addresses.filter((a) => a.uprn === null).length;
    if (
      rawCount > 0 &&
      missingUprn / rawCount >= 0.5 &&
      !UPRN_WARNING_LOGGED.has(`${source}:${formatted}`)
    ) {
      UPRN_WARNING_LOGGED.add(`${source}:${formatted}`);
      const advice =
        source === "os-places"
          ? "OS Places returned rows without UPRN — unexpected; check the API response shape."
          : "Postcoder is on a PAF-only plan. Either enable the AddressBase/UPRN addtag on the Postcoder plan, or set OS_PLACES_API_KEY to switch to OS Places.";
      console.warn(
        `[address-lookup] ${missingUprn}/${rawCount} ${source} rows for ${formatted} are missing UPRN. ${advice}`
      );
    }

    const response: AddressLookupResponse = {
      addresses,
      // Per-property OS country code beats the postcode-centroid lookup
      // when available — it correctly handles a few hundred edge cases
      // where a postcode straddles the England/Wales border.
      country: countryCodeOverride ?? postcodeMeta?.country ?? null,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("address lookup error", err);
    const msg = err instanceof Error && err.message.includes("429")
      ? "Too many address lookups right now — please wait a moment and try again."
      : "Address lookup failed.";
    const status = err instanceof Error && err.message.includes("429") ? 429 : 502;
    return NextResponse.json({ error: msg }, { status });
  }
}
