// /installer/credits — credit-purchase placeholder.
//
// Full Stripe wiring is part of C1. For now this page just shows the
// pricing table the user wants in production + a manual top-up
// instruction line for testing. When C1 lands, replace the
// placeholder buttons with calls to /api/credits/checkout.

import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PortalShell } from "@/components/portal-shell";

export const dynamic = "force-dynamic";

const PACKS = [
  { credits: 30, priceGbp: 95, perCredit: 3.17 },
  { credits: 100, priceGbp: 195, perCredit: 1.95 },
  { credits: 250, priceGbp: 395, perCredit: 1.58 },
  { credits: 1000, priceGbp: 995, perCredit: 1.0 },
] as const;

export default async function CreditsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let balance: number | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("credits")
      .eq("id", user.id)
      .maybeSingle<{ credits: number }>();
    balance = profile?.credits ?? 0;
  }

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Credits"
      pageSubtitle="One credit per pre-survey request, five credits per accepted lead."
    >
      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-6 flex items-center gap-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark">
          <CreditCard className="w-5 h-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current balance
          </p>
          <p className="text-2xl font-bold text-navy">
            {balance ?? "—"} credit{balance === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-6 mb-6 text-center">
        <p className="text-sm font-semibold text-navy">
          Stripe checkout coming soon
        </p>
        <p className="mt-2 text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
          Credit purchases will run through Stripe with auto-recharge
          when your balance drops below 10. Building this out now
          (PR&nbsp;C1).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {PACKS.map((p) => (
          <div
            key={p.credits}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-wider text-coral">
              {p.credits} credits
            </p>
            <p className="mt-2 text-2xl font-bold text-navy">
              £{p.priceGbp}
              <span className="text-sm font-normal text-slate-500 ml-2">
                inc. VAT
              </span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              £{p.perCredit.toFixed(2)} per credit
            </p>
            <button
              type="button"
              disabled
              className="mt-4 w-full inline-flex items-center justify-center h-11 rounded-full bg-slate-200 text-slate-500 font-semibold text-sm cursor-not-allowed"
            >
              Buy {p.credits}
            </button>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed">
        <p className="font-semibold text-amber-900">For testing only</p>
        <p className="text-amber-900 mt-1">
          Until Stripe checkout ships, your admin team can grant credits
          via Supabase SQL:
        </p>
        <pre className="mt-2 bg-white border border-amber-200 rounded-lg p-3 text-xs text-amber-900 overflow-x-auto">
{`update public.users set credits = 100 where email = 'you@example.com';`}
        </pre>
      </div>
    </PortalShell>
  );
}
