import { NextResponse } from "next/server";
import { z } from "zod";
import { lookupAddressesByPostcode } from "@/lib/services/postcoder";
import { validatePostcode } from "@/lib/services/postcodes";
import type { AddressLookupResponse } from "@/lib/schemas/postcoder";

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
    // Fan out to Postcoder (addresses + UPRN) and Postcodes.io (country gate)
    // in parallel — neither depends on the other.
    const [rawAddresses, postcodeMeta] = await Promise.all([
      lookupAddressesByPostcode(formatted).catch((err) => {
        console.warn("Postcoder failed:", err);
        throw err; // re-raise so the route returns 502
      }),
      validatePostcode(formatted).catch((err) => {
        console.warn("Postcodes.io failed (non-fatal):", err);
        return null;
      }),
    ]);

    // Postcode-level centroid from Postcodes.io — used when Postcoder's
    // addtags (latitude/longitude) aren't on the plan or happen to be blank.
    const centroidLat = postcodeMeta?.latitude ?? 0;
    const centroidLng = postcodeMeta?.longitude ?? 0;

    const addresses = rawAddresses.map((a) => {
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
          formatted,
        addressLine1: a.addressline1 || a.summaryline || "",
        addressLine2: a.addressline2 || null,
        postcode: a.postcode || formatted,
        postTown: a.posttown || "",
        latitude: lat,
        longitude: lng,
      };
    });

    // Diagnostics for the Postcoder UPRN addtag — only useful once
    // per postcode per process boot. After that, repeating the same
    // warning on every lookup is noise, and the underlying issue is
    // an account/plan config matter, not a code-path bug.
    const missingUprn = addresses.filter((a) => a.uprn === null).length;
    if (
      rawAddresses.length > 0 &&
      missingUprn / rawAddresses.length >= 0.5 &&
      !UPRN_WARNING_LOGGED.has(formatted)
    ) {
      UPRN_WARNING_LOGGED.add(formatted);
      console.warn(
        `[address-lookup] ${missingUprn}/${rawAddresses.length} Postcoder rows for ${formatted} are missing UPRN. EPC will fall back to postcode+address fuzzy match. To restore exact-UPRN lookups, ensure your Postcoder plan includes the OS AddressBase / UPRN addtag (PAF-only plans don't return it).`
      );
    }

    const response: AddressLookupResponse = {
      addresses,
      country: postcodeMeta?.country ?? null,
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
