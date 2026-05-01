import { NextResponse } from "next/server";
import {
  ChLookupRequestSchema,
  type ChLookupResponse,
} from "@/lib/schemas/installer-signup-request";
import {
  fetchCompaniesHouse,
  formatCompaniesHouseAddress,
} from "@/lib/services/companies-house";

// POST /api/installer-signup/companies-house
//
// Body: { number: string }
//
// Looks up the company on the public Companies House API and returns
// the bits we need to prefill the F3 request form (name, address,
// incorporation date, status). Anonymous endpoint — used by
// not-yet-registered installers, no auth required.
//
// We don't dispense the user's CH lookup back to them in any
// machine-readable form unless it actually matches — saves a thin
// data harvest path.

export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<ChLookupResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = ChLookupRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ChLookupResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }
  const result = await fetchCompaniesHouse(parsed.data.number);
  if (!result.ok) {
    const message =
      result.reason === "not_found"
        ? "We couldn't find a company with that number on Companies House. Double-check the digits or fill the form in manually."
        : result.reason === "rate_limited"
          ? "Companies House is rate-limiting us. Try again in a minute."
          : result.reason === "no_api_key"
            ? "Companies House lookup is unavailable right now — fill the form in manually."
            : "Couldn't reach Companies House. Try again or fill the form in manually.";
    return NextResponse.json<ChLookupResponse>({
      ok: false,
      reason: result.reason,
      error: message,
    });
  }
  const data = result.data;
  return NextResponse.json<ChLookupResponse>({
    ok: true,
    prefill: {
      companyNumber: data.company_number ?? parsed.data.number.toUpperCase(),
      companyName: data.company_name ?? "",
      address: formatCompaniesHouseAddress(data.registered_office_address),
      incorporationDate: data.date_of_creation ?? null,
      companyStatus: data.company_status ?? null,
    },
  });
}
