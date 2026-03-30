import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Coins, Key, BookOpen } from "lucide-react";
import { ApiKeyManager } from "@/components/api-key-manager";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";

export default async function ApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  const profileResult = await admin.from("users").select("credits, api_key").eq("id", user.id).single();

  const credits = profileResult.data?.credits ?? 0;
  const apiKey = profileResult.data?.api_key ?? null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.whoamipaying.co.uk";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">API</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Verify invoices programmatically
          </p>
        </div>
        <div className="flex gap-2">
          <BuyCreditsDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="mt-6">
        <div className="rounded-2xl bg-navy-card border border-white/[0.06] p-5 max-w-xs">
          <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2">
            <Coins className="size-3.5" />
            Credits remaining
          </div>
          <div className="text-2xl font-bold text-white">{credits}</div>
        </div>
      </div>

      {/* API Key */}
      <div className="mt-6 rounded-2xl bg-navy-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Key className="size-4 text-coral" />
            <h2 className="font-semibold text-white">API Key</h2>
          </div>
          <p className="text-sm text-brand-muted mt-0.5">
            Use this key in the Authorization header to authenticate API requests
          </p>
        </div>
        <div className="p-6">
          <ApiKeyManager initialKey={apiKey} />
        </div>
      </div>

      {/* Documentation */}
      <div className="mt-6 rounded-2xl bg-navy-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-coral" />
            <h2 className="font-semibold text-white">Documentation</h2>
          </div>
          <p className="text-sm text-brand-muted mt-0.5">
            How to use the WhoAmIPaying verification API
          </p>
        </div>
        <div className="p-6 space-y-6">
          {/* Endpoint */}
          <div>
            <h3 className="text-sm font-semibold text-white">Endpoint</h3>
            <code className="mt-1 block rounded-xl bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-sm text-brand-muted-light font-mono">
              POST {appUrl}/api/v1/verify
            </code>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Auth */}
          <div>
            <h3 className="text-sm font-semibold text-white">Authentication</h3>
            <p className="mt-1 text-sm text-brand-muted-light">
              Include your API key in the Authorization header:
            </p>
            <code className="mt-1 block rounded-xl bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-sm text-brand-muted-light font-mono">
              Authorization: Bearer your_api_key
            </code>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Request */}
          <div>
            <h3 className="text-sm font-semibold text-white">Request Body</h3>
            <p className="mt-1 text-sm text-brand-muted-light">
              Send a JSON body with the fields you want to verify. At least one field is required.
              Each request costs 1 credit.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-sm text-brand-muted-light font-mono">
{`{
  "company_name": "Acme Ltd",
  "vat_number": "417589169",
  "company_number": "11300735",
  "account_number": "32474465",
  "sort_code": "040003"
}`}
            </pre>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Fields */}
          <div>
            <h3 className="text-sm font-semibold text-white">Fields</h3>
            <div className="mt-2 space-y-2 text-sm">
              {[
                { field: "company_name", desc: "Company or business name (required for bank verification)" },
                { field: "vat_number", desc: "UK VAT registration number — triggers HMRC lookup" },
                { field: "company_number", desc: "Companies House registration number — triggers CH lookup" },
                { field: "account_number", desc: "Bank account number — triggers bank verification (requires sort_code and company_name)" },
                { field: "sort_code", desc: "Bank sort code (with or without dashes)" },
              ].map((f) => (
                <div key={f.field} className="flex gap-3">
                  <code className="shrink-0 text-coral font-mono text-xs">{f.field}</code>
                  <span className="text-brand-muted-light">{f.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Example curl */}
          <div>
            <h3 className="text-sm font-semibold text-white">Example</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-sm text-brand-muted-light font-mono">
{`curl -X POST ${appUrl}/api/v1/verify \\
  -H "Authorization: Bearer your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "company_name": "Acme Ltd",
    "vat_number": "417589169",
    "company_number": "11300735",
    "account_number": "32474465",
    "sort_code": "04-00-03"
  }'`}
            </pre>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Response */}
          <div>
            <h3 className="text-sm font-semibold text-white">Response</h3>
            <pre className="mt-2 overflow-x-auto rounded-xl bg-white/[0.05] border border-white/[0.06] px-3 py-2 text-sm text-brand-muted-light font-mono">
{`{
  "reference_id": "uuid",
  "credits_remaining": 9,
  "duration_ms": 1234,
  "results": {
    "companies_house": {
      "found": true,
      "data": { ... }
    },
    "hmrc_vat": {
      "found": true,
      "data": { ... }
    },
    "bank_verification": {
      "verified": true,
      "data": { ... }
    }
  }
}`}
            </pre>
          </div>

          <div className="border-t border-white/[0.06]" />

          {/* Errors */}
          <div>
            <h3 className="text-sm font-semibold text-white">Error Codes</h3>
            <div className="mt-2 space-y-1 text-sm">
              {[
                { code: "401", desc: "Invalid or missing API key" },
                { code: "402", desc: "Insufficient credits" },
                { code: "400", desc: "No fields provided in request body" },
                { code: "500", desc: "Internal server error" },
              ].map((e) => (
                <div key={e.code} className="flex gap-3 items-center">
                  <Badge variant="outline" className="border-white/10 text-brand-muted-light">{e.code}</Badge>
                  <span className="text-brand-muted-light">{e.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
