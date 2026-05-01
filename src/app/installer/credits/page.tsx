// /installer/credits — Stripe-wired credit purchase + history.
//
// Server component fetches the user's balance + recent purchases.
// The pack tiles are a client island that hits
// /api/installer/credits/checkout and redirects to Stripe.

import Link from "next/link";
import { CreditCard, Receipt, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { CREDIT_PACKS, formatGbp } from "@/lib/billing/credit-packs";
import { BuyButtons } from "./buy-buttons";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type PurchaseRow = Database["public"]["Tables"]["installer_credit_purchases"]["Row"];

interface PageProps {
  searchParams: Promise<{ cancelled?: string }>;
}

export default async function CreditsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const cancelled = params.cancelled === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let balance: number | null = null;
  let purchases: PurchaseRow[] = [];
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle<{ credits: number }>();
    balance = profile?.credits ?? 0;

    // Purchase history — service role read because RLS on the table
    // is service-only. Filter by user_id so we never leak across
    // accounts.
    const admin = createAdminClient();
    const { data } = await admin
      .from("installer_credit_purchases")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    purchases = (data ?? []) as PurchaseRow[];
  }

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Credits"
      pageSubtitle="One credit per pre-survey request, five credits per accepted lead."
    >
      {cancelled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5 text-sm">
          <p className="font-semibold text-amber-900">Checkout cancelled.</p>
          <p className="text-amber-900 text-xs mt-1">
            No charge was made. Pick a pack below if you change your mind.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 flex items-center gap-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark">
          <CreditCard className="w-5 h-5" />
        </span>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current balance
          </p>
          <p className="text-2xl font-bold text-navy">
            {balance ?? "—"} credit{balance === 1 ? "" : "s"}
          </p>
        </div>
        {balance != null && balance < 10 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
            <Sparkles className="w-3 h-3" />
            Low — top up to keep accepting leads
          </span>
        )}
      </div>

      <BuyButtons packs={CREDIT_PACKS} />

      <p className="text-[11px] text-slate-500 text-center leading-relaxed mt-4 mb-8">
        Card payments handled by Stripe. We don&rsquo;t store card
        details. Receipts go to your account email.
      </p>

      {/* Purchase history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-navy">Recent purchases</h2>
        </div>
        {purchases.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            No purchases yet. Pick a pack above to top up.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {purchases.map((p) => (
              <li key={p.id} className="py-3 flex items-center gap-3 text-sm">
                <div className="flex-1">
                  <p className="font-semibold text-navy">
                    +{p.pack_credits} credits
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDate(p.created_at)}
                  </p>
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {formatGbp(p.price_pence)}
                </span>
                {p.status === "refunded" && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500">
                    Refunded
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-[11px] text-slate-500 mt-6 leading-relaxed text-center">
        Need a VAT receipt or invoice for a previous purchase?{" "}
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
