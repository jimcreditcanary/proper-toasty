// Proxy for the Companies House /search/companies endpoint. Lets the
// installer's "Confirm business" onboarding step search by name or
// number without exposing the API key to the browser.
//
// Auth: must be a signed-in installer bound to an installer row.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBoundInstallerId } from "@/lib/installer-auth/get-bound-installer";
import { searchCompaniesHouse } from "@/lib/services/companies-house";

export const runtime = "nodejs";

export async function GET(req: Request) {
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

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  if (q.trim().length < 2) {
    return NextResponse.json({ items: [] });
  }

  const res = await searchCompaniesHouse(q, 10);
  if (!res.ok) {
    if (res.reason === "no_api_key") {
      return NextResponse.json(
        { error: "Companies House lookup unavailable" },
        { status: 503 },
      );
    }
    if (res.reason === "rate_limited") {
      return NextResponse.json(
        { error: "Companies House rate-limited — try again shortly" },
        { status: 429 },
      );
    }
    return NextResponse.json({ error: "Lookup failed" }, { status: 502 });
  }
  return NextResponse.json({ items: res.items });
}
