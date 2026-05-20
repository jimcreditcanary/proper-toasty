// /installer/billing/auto-recharge — permanent settings page for the
// auto-recharge feature (spec F). Lets the installer:
//
//   - See the current rule in plain English ("When balance drops
//     below 10 credits, charge £95 for 30 more credits via Visa ••5678")
//   - Change threshold + pack
//   - Switch between auto, manual-only, and off
//   - Replace their saved card (links to a fresh SetupIntent flow)
//   - See the last 5 auto-recharge events from installer_credit_purchases
//
// All state writes go through /api/installer/credits/auto-recharge so
// the validation + Stripe sanity checks stay in one place.
//
// Server component reads the current rule + last 5 purchases so the
// page renders without flicker. The client island handles edits.

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Receipt, ExternalLink } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { formatGbp } from "@/lib/billing/credit-packs";
import { AutoRechargeEditor } from "./editor";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type PurchaseRow = Database["public"]["Tables"]["installer_credit_purchases"]["Row"];

export default async function AutoRechargeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/billing/auto-recharge");
  }

  const admin = createAdminClient();
  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Auto-recharge"
        backLink={{ href: "/installer/billing", label: "Back to billing" }}
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

  // Pre-fetch the last 5 successful purchases (any source) so the
  // "Recent top-ups" panel renders without a client round-trip.
  // Auto-recharge rows have stripe_session_id IS NULL — we use that
  // as the cheap distinguishing filter rather than wiring a new
  // column.
  const { data: recentPurchases } = await admin
    .from("installer_credit_purchases")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Auto-recharge"
      pageSubtitle="Set the rule. We'll keep your credit balance topped up so you never miss a lead."
      backLink={{ href: "/installer/billing", label: "Back to billing" }}
    >
      <AutoRechargeEditor />

      <RecentPurchases purchases={(recentPurchases ?? []) as PurchaseRow[]} />

      <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
        <p>
          <strong className="text-navy">Heads up:</strong> if a charge
          ever gets declined (expired card, insufficient funds), we
          email you, turn auto-recharge off, and stop trying. You
          come back here to fix the card and re-enable.
        </p>
        <p className="mt-2">
          <Link
            href="/installer/credits"
            className="text-coral hover:text-coral-dark underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" />
            Buy more credits manually
          </Link>
        </p>
      </div>
    </PortalShell>
  );
}

function RecentPurchases({ purchases }: { purchases: PurchaseRow[] }) {
  if (purchases.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-navy">Recent top-ups</h2>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          No top-ups yet. Once auto-recharge fires, the last five
          events appear here.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-navy">Recent top-ups</h2>
      </div>
      <ul className="divide-y divide-slate-100">
        {purchases.map((p) => {
          const isAuto = p.stripe_session_id === null;
          return (
            <li
              key={p.id}
              className="py-2.5 flex items-center gap-3 text-sm flex-wrap"
            >
              <div className="flex-1 min-w-[160px]">
                <p className="font-semibold text-navy">
                  +{p.pack_credits} credits
                  <span
                    className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                      isAuto
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600 border border-slate-200"
                    }`}
                  >
                    {isAuto ? "Auto" : "Manual"}
                  </span>
                  {p.status === "refunded" && (
                    <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                      Refunded
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-500">
                  {formatDate(p.created_at)}
                </p>
              </div>
              <span className="text-sm font-medium text-slate-700">
                {formatGbp(p.price_pence)}
              </span>
              {p.stripe_receipt_url && (
                <a
                  href={p.stripe_receipt_url}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                >
                  Receipt
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
