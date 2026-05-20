// /installer/billing/auto-recharge — dedicated settings page for
// the auto top-up rules. The user picks the trigger threshold + pack
// + can toggle the rule off entirely. Recent recharge history (last
// 5 attempts) renders below so they can sanity-check the system is
// behaving.

import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, CheckCircle2, CreditCard, XCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { PortalShell } from "@/components/portal-shell";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";
import { AUTO_RECHARGE_DEFAULT_THRESHOLD } from "@/lib/billing/auto-recharge-config";
import { AutoRechargeSettings } from "./settings-form";

export const dynamic = "force-dynamic";

interface AttemptRow {
  id: string;
  pack_id: string;
  pack_credits: number;
  price_pence: number;
  status: "succeeded" | "requires_action" | "failed";
  failure_message: string | null;
  created_at: string;
}

export default async function AutoRechargeSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/auth/login?redirect=/installer/billing/auto-recharge");
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select(
      "stripe_customer_id, auto_recharge_pack_id, auto_recharge_threshold_credits, auto_recharge_failed_at, auto_recharge_failure_reason",
    )
    .eq("id", user.id)
    .maybeSingle<{
      stripe_customer_id: string | null;
      auto_recharge_pack_id:
        | "starter"
        | "growth"
        | "scale"
        | "volume"
        | null;
      auto_recharge_threshold_credits: number | null;
      auto_recharge_failed_at: string | null;
      auto_recharge_failure_reason: string | null;
    }>();

  // Card-on-file lookup from Stripe (same shape the credits/auto-
  // recharge GET returns, but inlined here so the page server-renders
  // without a client-side fetch).
  let cardBrand: string | null = null;
  let cardLast4: string | null = null;
  let hasSavedCard = false;
  if (profile?.stripe_customer_id) {
    try {
      const list = await stripe.paymentMethods.list({
        customer: profile.stripe_customer_id,
        type: "card",
        limit: 1,
      });
      const pm = list.data[0];
      if (pm?.card) {
        hasSavedCard = true;
        cardBrand = pm.card.brand;
        cardLast4 = pm.card.last4;
      }
    } catch (e) {
      console.warn(
        "[billing/auto-recharge] payment method lookup failed",
        e instanceof Error ? e.message : e,
      );
    }
  }

  // Recent attempts (success + failure) for the history panel.
  const { data: attempts } = await admin
    .from("installer_auto_recharge_attempts")
    .select(
      "id, pack_id, pack_credits, price_pence, status, failure_message, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<AttemptRow[]>();

  return (
    <PortalShell
      portalName="Installer"
      pageTitle="Auto top-up rules"
      pageSubtitle="Decide when your saved card gets charged — or turn auto top-up off entirely."
      backLink={{ href: "/installer/billing", label: "Back to billing" }}
    >
      {profile?.auto_recharge_failed_at && profile.auto_recharge_failure_reason && (
        <FailureBanner reason={profile.auto_recharge_failure_reason} />
      )}

      <AutoRechargeSettings
        initial={{
          enabled: !!profile?.auto_recharge_pack_id,
          packId: profile?.auto_recharge_pack_id ?? null,
          thresholdCredits: profile?.auto_recharge_threshold_credits ?? null,
          hasSavedCard,
          cardBrand,
          cardLast4,
        }}
        packs={CREDIT_PACKS.map((p) => ({
          id: p.id,
          label: p.label,
          credits: p.credits,
          pricePence: p.pricePence,
          highlight: p.highlight ?? false,
        }))}
        defaultThreshold={AUTO_RECHARGE_DEFAULT_THRESHOLD}
      />

      <RecentAttempts rows={attempts ?? []} />

      <UpdateCardCard hasSavedCard={hasSavedCard} />
    </PortalShell>
  );
}

// ─── Failure banner ────────────────────────────────────────────────

function FailureBanner({ reason }: { reason: string }) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-5 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-amber-900">
          Last auto top-up failed
        </p>
        <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
          {reason}
        </p>
        <p className="text-xs text-amber-800 mt-1 leading-relaxed">
          Auto top-up is currently off. Save a fresh card below + turn it
          back on when ready.
        </p>
      </div>
    </div>
  );
}

// ─── Recent attempts ───────────────────────────────────────────────

function RecentAttempts({ rows }: { rows: AttemptRow[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mt-5">
      <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
        <h2 className="text-sm font-semibold text-navy">Recent auto top-ups</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Last 5 attempts — successful charges + declines.
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-slate-500">
            No auto top-ups have fired yet. They&rsquo;ll appear here once
            your balance hits the threshold.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li
              key={r.id}
              className="px-5 py-3 flex items-start gap-3"
            >
              <StatusIcon status={r.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-navy">
                  {r.status === "succeeded"
                    ? `+${r.pack_credits} credits — £${(r.price_pence / 100).toFixed(0)}`
                    : `Failed top-up — ${r.pack_credits} credits (£${(r.price_pence / 100).toFixed(0)})`}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {formatDateTime(r.created_at)}
                  {r.failure_message && (
                    <>
                      {" — "}
                      <span className="text-rose-700">{r.failure_message}</span>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: AttemptRow["status"] }) {
  if (status === "succeeded") {
    return <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />;
  }
  return <XCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />;
}

// ─── Update card card ─────────────────────────────────────────────

function UpdateCardCard({ hasSavedCard }: { hasSavedCard: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 mt-5 flex items-start gap-3 flex-wrap">
      <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-slate-100 text-slate-600 shrink-0">
        <CreditCard className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-[200px]">
        <h2 className="text-sm font-semibold text-navy">Card on file</h2>
        <p className="text-xs text-slate-500 leading-relaxed mt-0.5">
          {hasSavedCard
            ? "Replace the card we charge by saving a new one. The old card stays attached to your Stripe Customer until removed manually."
            : "Save a card so auto top-up has something to charge."}
        </p>
      </div>
      <Link
        href="/installer/onboarding/card"
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full font-semibold text-xs bg-coral hover:bg-coral-dark text-white shadow-sm transition-colors"
      >
        <CreditCard className="w-3.5 h-3.5" />
        {hasSavedCard ? "Replace card" : "Save card"}
      </Link>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

