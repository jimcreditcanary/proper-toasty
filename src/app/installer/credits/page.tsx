// /installer/credits — Stripe-wired credit portal.
//
// Server component fetches balance + recent purchase history. The
// balance card + auto top-up controls + buy-credits modal all live
// in the CreditsActions client island. History rows are
// server-rendered and include a "Receipt" link per row pointing at
// Stripe's hosted receipt URL.

import Link from "next/link";
import { Receipt, Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { formatGbp } from "@/lib/billing/credit-packs";
import { CreditsActions } from "./credits-actions";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type PurchaseRow = Database["public"]["Tables"]["installer_credit_purchases"]["Row"];

interface PageProps {
  searchParams: Promise<{
    cancelled?: string;
    autoRechargeEnabled?: string;
  }>;
}

export default async function CreditsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cancelled = params.cancelled === "1";
  const enableFlash = params.autoRechargeEnabled ?? null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance = 0;
  let purchases: PurchaseRow[] = [];
  let starterGrantedAt: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("credits, installer_starter_credits_granted_at")
      .eq("id", user.id)
      .maybeSingle<{
        credits: number;
        installer_starter_credits_granted_at: string | null;
      }>();
    balance = profile?.credits ?? 0;
    starterGrantedAt = profile?.installer_starter_credits_granted_at ?? null;

    // Purchase history — service role read because RLS on the table
    // is service-only. Filter by user_id so we never leak across
    // accounts.
    const admin = createAdminClient();
    const { data } = await admin
      .from("installer_credit_purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    purchases = (data ?? []) as PurchaseRow[];
  }
  // Show the starter-credit "freebie" banner when the grant was
  // applied AND the user hasn't yet bought a paid pack — so once
  // they top up themselves the banner gracefully fades away.
  const showStarterBanner = !!starterGrantedAt && purchases.length === 0;

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Credits"
      pageSubtitle="One credit per pre-survey request, five credits per accepted lead."
      backLink={{ href: "/installer", label: "Back to installer portal" }}
    >
      {cancelled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 text-sm">
          <p className="font-semibold text-amber-900">Checkout cancelled.</p>
          <p className="text-amber-900 text-xs mt-1">
            No charge was made. Pick a pack any time from the Buy more
            credits button.
          </p>
        </div>
      )}

      {showStarterBanner && (
        <div className="rounded-xl border border-coral/30 bg-coral-pale/40 p-4 mb-5 flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-coral-dark shrink-0 text-base">
            🎁
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-navy">
              You&rsquo;ve got 30 free starter credits — on us
            </p>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Enough for ~30 pre-survey sends or 6 lead accepts. Try
              the platform end-to-end before topping up — the banner
              hides as soon as you make your first purchase.
            </p>
          </div>
        </div>
      )}

      <CreditsActions balance={balance} enableFlash={enableFlash} />

      {/* Purchase history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-navy">
            Recent purchases
          </h2>
        </div>
        {purchases.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No purchases yet. Click Buy more credits above to top up.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {purchases.map((p) => (
              <li
                key={p.id}
                className="py-3 flex items-center gap-3 text-sm flex-wrap"
              >
                <div className="flex-1 min-w-[160px]">
                  <p className="font-semibold text-navy">
                    +{p.pack_credits} credits
                    {p.stripe_session_id === null && (
                      <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Auto
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
                {p.status === "refunded" ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                    Refunded
                  </span>
                ) : p.stripe_receipt_url ? (
                  <a
                    href={p.stripe_receipt_url}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1 px-3 h-8 rounded-full text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    Receipt
                  </a>
                ) : (
                  <span className="text-[11px] text-slate-400 italic">
                    Receipt landing
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mt-6 leading-relaxed text-center">
        Need a different invoice format or got a VAT question?{" "}
        <Link
          href="mailto:hello@propertoasty.com"
          className="text-coral hover:text-coral-dark underline"
        >
          Email us
        </Link>{" "}
        and we&rsquo;ll sort it.
      </p>
    </PortalShell>
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
