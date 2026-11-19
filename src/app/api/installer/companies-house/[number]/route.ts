// Proxy for the Companies House single-company lookup. Used by the
// "Confirm business" step to prefill address + status after the
// installer picks a search result.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundInstallerId } from "@/lib/installer-auth/get-bound-installer";
import {
  fetchCompaniesHouse,
  formatCompaniesHouseAddress,
} from "@/lib/services/companies-house";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ number: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();
  const installerId = await getBoundInstallerId(admin, user.id);
  if (!installerId) {
    return NextResponse.json({ error: "Not an installer" }, { status: 403 });
  }

  const { number } = await params;
  const res = await fetchCompaniesHouse(number);
  if (!res.ok) {
    const status =
      res.reason === "not_found"
        ? 404
        : res.reason === "rate_limited"
          ? 429
          : res.reason === "no_api_key"
            ? 503
            : 502;
    return NextResponse.json({ error: res.reason }, { status });
  }
  return NextResponse.json({
    company_number: res.data.company_number ?? null,
    company_name: res.data.company_name ?? null,
    company_status: res.data.company_status ?? null,
    date_of_creation: res.data.date_of_creation ?? null,
    registered_office: res.data.registered_office_address ?? null,
    registered_office_formatted: formatCompaniesHouseAddress(
      res.data.registered_office_address,
    ),
  });
}
