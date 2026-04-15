import { NextRequest, NextResponse } from "next/server";

/**
 * DVLA Vehicle Enquiry Service lookup.
 *
 * Calls the DVLA VES API server-side (UAT in dev, prod in prod) with the given
 * registration number. Returns the raw DVLA response on success, or a
 * user-friendly error message mapped from the upstream status code.
 *
 * The returned data is NOT yet persisted — the caller is expected to submit
 * it as part of the final verification record so it can be stored in
 * `vehicle_lookups` with a `verification_id` foreign key.
 */

const DVLA_BASE =
  process.env.DVLA_API_BASE_URL ??
  "https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles";

function cleanReg(input: string): string {
  return (input || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const registrationNumber = cleanReg(body?.registrationNumber ?? "");

    if (!registrationNumber || registrationNumber.length < 2 || registrationNumber.length > 7) {
      return NextResponse.json(
        { error: "Please enter a valid UK registration number" },
        { status: 400 }
      );
    }

    if (!process.env.DVLA_API_KEY) {
      console.error("DVLA_API_KEY not configured");
      return NextResponse.json(
        { error: "Vehicle lookup isn't configured on the server" },
        { status: 500 }
      );
    }

    const res = await fetch(DVLA_BASE, {
      method: "POST",
      headers: {
        "x-api-key": process.env.DVLA_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ registrationNumber }),
    });

    if (res.status === 404) {
      return NextResponse.json(
        {
          error:
            "We couldn't find a vehicle with that registration. Please check and try again.",
        },
        { status: 404 }
      );
    }

    if (res.status === 400) {
      return NextResponse.json(
        {
          error:
            "That doesn't look like a valid registration number. Please check the format.",
        },
        { status: 400 }
      );
    }

    if (res.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    if (res.status === 503 || res.status === 500) {
      return NextResponse.json(
        {
          error:
            "The DVLA service is temporarily unavailable. Please try again in a moment.",
        },
        { status: 503 }
      );
    }

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("DVLA lookup failed:", res.status, body);
      return NextResponse.json(
        { error: "Vehicle lookup failed. Please try again." },
        { status: 502 }
      );
    }

    const raw = await res.json();

    return NextResponse.json({
      vehicle: {
        registrationNumber: raw.registrationNumber ?? registrationNumber,
        make: raw.make ?? null,
        colour: raw.colour ?? null,
        fuelType: raw.fuelType ?? null,
        engineCapacity: raw.engineCapacity ?? null,
        yearOfManufacture: raw.yearOfManufacture ?? null,
        monthOfFirstRegistration: raw.monthOfFirstRegistration ?? null,
        taxStatus: raw.taxStatus ?? null,
        taxDueDate: raw.taxDueDate ?? null,
        motStatus: raw.motStatus ?? null,
        motExpiryDate: raw.motExpiryDate ?? null,
        co2Emissions: raw.co2Emissions ?? null,
        markedForExport: raw.markedForExport ?? null,
        typeApproval: raw.typeApproval ?? null,
        wheelplan: raw.wheelplan ?? null,
        revenueWeight: raw.revenueWeight ?? null,
        euroStatus: raw.euroStatus ?? null,
        dateOfLastV5CIssued: raw.dateOfLastV5CIssued ?? null,
        raw,
      },
    });
  } catch (err) {
    console.error("DVLA lookup error:", err);
    return NextResponse.json(
      { error: "Unable to look up that vehicle right now. Please try again." },
      { status: 500 }
    );
  }
}
