import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Coins, Key, BookOpen, Activity } from "lucide-react";
import { ApiKeyManager } from "@/components/api-key-manager";
import { BuyCreditsDialog } from "@/components/buy-credits-dialog";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ApiPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  const [profileResult, logsResult] = await Promise.all([
    admin.from("users").select("credits, api_key").eq("id", user.id).single(),
    admin
      .from("api_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const credits = profileResult.data?.credits ?? 0;
  const apiKey = profileResult.data?.api_key ?? null;
  const logs = logsResult.data ?? [];
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
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {[
          { icon: Coins, label: "Credits remaining", value: credits },
          { icon: Activity, label: "API calls (total)", value: logs.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl bg-navy-card border border-white/[0.06] p-5">
            <div className="flex items-center gap-1.5 text-brand-muted text-sm mb-2">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
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

      {/* API Logs */}
      <div className="mt-6 rounded-2xl bg-navy-card border border-white/[0.06] overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-coral" />
            <h2 className="font-semibold text-white">Usage Logs</h2>
          </div>
          <p className="text-sm text-brand-muted mt-0.5">Recent API requests</p>
        </div>
        <div className="p-6">
          {logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="mb-3 size-10 text-brand-muted/50" />
              <p className="text-sm font-medium text-white">No API calls yet</p>
              <p className="mt-1 text-xs text-brand-muted">
                Generate an API key and make your first request
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Endpoint</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Credits</th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Duration</th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-brand-muted uppercase tracking-wider">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log: { id: string; method: string; endpoint: string; status_code: number; credits_used: number; duration_ms: number | null; created_at: string }) => (
                    <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 px-2 font-mono text-xs text-brand-muted-light">
                        {log.method} {log.endpoint}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          log.status_code >= 200 && log.status_code < 300
                            ? "bg-pass/10 border border-pass/20 text-pass"
                            : "bg-fail/10 border border-fail/20 text-fail"
                        }`}>
                          {log.status_code}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-brand-muted-light">{log.credits_used}</td>
                      <td className="py-3 px-2 text-brand-muted">
                        {log.duration_ms ? `${log.duration_ms}ms` : "\u2014"}
                      </td>
                      <td className="py-3 px-2 text-right text-brand-muted-light">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
