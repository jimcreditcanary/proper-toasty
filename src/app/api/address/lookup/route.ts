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

    const addresses = rawAddresses.map((a, i) => {
      const lat = Number(a.latitude) || centroidLat || 0;
      const lng = Number(a.longitude) || centroidLng || 0;
      const uprn = a.uprn || `row-${i}`; // synthetic key keeps React happy; the
      // EPC lookup will fall back to postcode+address when UPRN is missing.
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

    if (rawAddresses.length > 0 && addresses.every((a) => !a.uprn.startsWith("row-"))) {
      // all good
    } else if (rawAddresses.length > 0) {
      console.warn(
        `Postcoder returned ${rawAddresses.length} rows for ${formatted} but UPRN was missing on some — check the plan's addtags (uprn,udprn,latitude,longitude).`
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
