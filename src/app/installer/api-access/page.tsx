// /installer/api-access — surface for the installer's programmatic
// API key. Server component fetches the current key + balance; the
// reveal/copy/regenerate interactions + the curl example live in
// the ApiKeyActions client island below the docs.
//
// Endpoint surface today:
//   POST /api/v1/pre-survey-requests
//
// Each call costs 1 credit (matches the UI flow). Rate-limiting is
// implicit — runs out of credits, calls 402.

import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, KeyRound, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { ApiKeyActions } from "./key-actions";

export const dynamic = "force-dynamic";

export default async function ApiAccessPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/api-access");
  }

  const admin = createAdminClient();
  const [installerRes, profileRes] = await Promise.all([
    admin
      .from("installers")
      .select("id, company_name")
      .eq("user_id", user.id)
      .maybeSingle<{ id: number; company_name: string }>(),
    admin
      .from("users")
      .select("api_key, credits")
      .eq("id", user.id)
      .maybeSingle<{ api_key: string | null; credits: number }>(),
  ]);

  if (!installerRes.data) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="API access"
        backLink={{ href: "/installer", label: "Back to installer portal" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Your account isn&rsquo;t linked to an installer profile yet.
            Claim your profile from the installer signup page first.
          </p>
        </div>
      </PortalShell>
    );
  }

  const apiKey = profileRes.data?.api_key ?? null;
  const balance = profileRes.data?.credits ?? 0;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="API access"
      pageSubtitle="Send pre-survey check links from your own CRM. 1 credit per call."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {/* Key panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <div>
            <h2 className="text-base font-semibold text-navy flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-coral" />
              Your API key
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Treat it like a password. Anyone with this key can spend
              your credits.
            </p>
          </div>
          <Link
            href="/installer/credits"
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            {balance} credit{balance === 1 ? "" : "s"}
          </Link>
        </div>

        <ApiKeyActions initialKey={apiKey} />

        <div className="mt-5 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Regenerating the key invalidates the old one immediately —
            any integration still using it will start returning 401s.
            Update your CRM with the new key before kicking off a fresh
            sync.
          </p>
        </div>
      </div>

      {/* Endpoint docs */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-5">
        <h2 className="text-base font-semibold text-navy mb-1">
          Endpoint
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Full reference for the one endpoint live today. More
          coming as we open up the rest of the surface.
        </p>

        <EndpointBlock
          method="POST"
          path="/api/v1/pre-survey-requests"
          description="Send a customer their personalised /check link. Charges 1 credit. Same pipeline as the dashboard form."
          requestBody={`{
  "contact_name":  "Sam Patel",
  "contact_email": "sam@example.com",
  "contact_postcode": "SW1A 1AA"
}`}
          responseBody={`{
  "ok": true,
  "id": "8f3c…-uuid",
  "status": "pending",
  "credits_charged": 1
}`}
          errorCodes={[
            { code: 400, body: "validation: name + email required" },
            { code: 401, body: "missing or invalid API key" },
            { code: 402, body: "insufficient credits — top up at /installer/credits" },
            { code: 403, body: "API key not linked to an installer profile" },
            { code: 502, body: "email send failed (credit refunded)" },
          ]}
        />
      </div>

      {/* Curl example */}
      <CurlExample />
    </PortalShell>
  );
}

function EndpointBlock({
  method,
  path,
  description,
  requestBody,
  responseBody,
  errorCodes,
}: {
  method: string;
  path: string;
  description: string;
  requestBody: string;
  responseBody: string;
  errorCodes: { code: number; body: string }[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center px-2 py-1 rounded text-[11px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-900">
          {method}
        </span>
        <code className="text-sm font-mono text-navy bg-slate-50 px-2 py-1 rounded border border-slate-200">
          {path}
        </code>
      </div>
      <p className="text-sm text-slate-600 leading-relaxed">{description}</p>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Request body
        </p>
        <pre className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
          {requestBody}
        </pre>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Response (200)
        </p>
        <pre className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto">
          {responseBody}
        </pre>
      </div>

      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
          Error codes
        </p>
        <ul className="text-xs space-y-1">
          {errorCodes.map((e) => (
            <li key={e.code} className="flex items-baseline gap-3">
              <span className="font-mono font-bold text-slate-700 w-10 shrink-0">
                {e.code}
              </span>
              <span className="text-slate-600">{e.body}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CurlExample() {
  // Display-only — uses an obvious placeholder so users know to swap
  // it for their real key. Keeps the docs page useful even before
  // they've generated one.
  const example = `curl -X POST https://propertoasty.com/api/v1/pre-survey-requests \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contact_name":  "Sam Patel",
    "contact_email": "sam@example.com",
    "contact_postcode": "SW1A 1AA"
  }'`;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="text-base font-semibold text-navy mb-1">
        Quick start
      </h2>
      <p className="text-xs text-slate-500 mb-3">
        Drop into your terminal — replace{" "}
        <code className="text-coral-dark">YOUR_API_KEY</code> with the
        key above.
      </p>
      <pre className="text-xs font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-x-auto whitespace-pre">
        {example}
      </pre>
    </div>
  );
}
