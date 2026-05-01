// Thin wrapper around the Companies House public API.
//
// Used by the F3 installer signup request form to prefill company
// name + address from a CH number. The enrichment script
// (`scripts/enrich-installers-companies-house.ts`) does its own
// minimal fetch — keep that, since it's a one-shot offline job that
// doesn't need the full schema.
//
// API:
//   GET https://api.company-information.service.gov.uk/company/{number}
//   Auth: HTTP Basic (API key as username, blank password)
//   Rate limit: 600 reqs / 5 min — way more than we'll burn through
//   on the request form, but we surface the 429 cleanly anyway.
//
// API key: free signup at
//   https://developer.company-information.service.gov.uk/

const ENDPOINT = "https://api.company-information.service.gov.uk/company";

export interface CompaniesHouseAddress {
  premises?: string;
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  postal_code?: string;
  country?: string;
}

export interface CompaniesHouseResponse {
  company_number?: string;
  company_name?: string;
  company_status?: string;
  date_of_creation?: string; // YYYY-MM-DD
  registered_office_address?: CompaniesHouseAddress;
  type?: string;
}

export type CompaniesHouseLookupResult =
  | { ok: true; data: CompaniesHouseResponse }
  | { ok: false; reason: "not_found" | "rate_limited" | "no_api_key" | "error"; detail?: string };

export async function fetchCompaniesHouse(
  number: string,
): Promise<CompaniesHouseLookupResult> {
  const apiKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!apiKey) {
    return { ok: false, reason: "no_api_key" };
  }
  const cleaned = number.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) {
    return { ok: false, reason: "not_found", detail: "empty number" };
  }
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/${encodeURIComponent(cleaned)}`, {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
      },
      // No caching — the form is an interactive one-shot lookup.
      cache: "no-store",
    });
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      detail: e instanceof Error ? e.message : "network",
    };
  }
  if (res.status === 404) return { ok: false, reason: "not_found" };
  if (res.status === 429) return { ok: false, reason: "rate_limited" };
  if (!res.ok) {
    return { ok: false, reason: "error", detail: `http_${res.status}` };
  }
  try {
    const data = (await res.json()) as CompaniesHouseResponse;
    return { ok: true, data };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      detail: e instanceof Error ? e.message : "parse",
    };
  }
}

// Format a CH registered_office_address into a single human-readable
// line for the form prefill + admin queue.
export function formatCompaniesHouseAddress(
  addr: CompaniesHouseAddress | undefined | null,
): string | null {
  if (!addr) return null;
  const parts = [
    addr.premises,
    addr.address_line_1,
    addr.address_line_2,
    addr.locality,
    addr.region,
    addr.postal_code,
    addr.country,
  ]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter((s) => s.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}
