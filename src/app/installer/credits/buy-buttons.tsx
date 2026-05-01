"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { formatGbp, type CreditPack } from "@/lib/billing/credit-packs";

interface Props {
  packs: readonly CreditPack[];
}

// Renders the four pack tiles + handles the click → POST checkout
// → window.location to Stripe redirect. We deliberately don't use
// router.push because the destination is a different domain.

export function BuyButtons({ packs }: Props) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function buy(packId: string) {
    setPendingId(packId);
    setError(null);
    try {
      const res = await fetch("/api/installer/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!json.ok || !json.url) {
        setError(json.error ?? "Couldn't start checkout");
        setPendingId(null);
        return;
      }
      // Hard-redirect to Stripe.
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setPendingId(null);
    }
  }

  return (
    <>
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 mb-4 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {packs.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-5 flex flex-col ${
              p.highlight
                ? "border-coral/40 bg-coral-pale/30 shadow-sm"
                : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-baseline gap-2 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-coral">
                {p.label}
              </p>
              {p.highlight && (
                <span className="ml-auto inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-coral text-white">
                  Most popular
                </span>
              )}
            </div>
            <p className="text-2xl font-bold text-navy">
              {p.credits}{" "}
              <span className="text-base font-semibold text-slate-500">
                credits
              </span>
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              {p.tagline}
            </p>
            <div className="mt-4 flex items-baseline gap-2">
              <p className="text-xl font-bold text-navy">
                {formatGbp(p.pricePence)}
              </p>
              <p className="text-[11px] text-slate-500">
                inc. VAT · £{p.perCreditGbp.toFixed(2)} per credit
              </p>
            </div>
            <button
              type="button"
              disabled={pendingId !== null}
              onClick={() => buy(p.id)}
              className={`mt-5 w-full inline-flex items-center justify-center gap-2 h-11 rounded-full font-semibold text-sm transition-colors ${
                p.highlight
                  ? "bg-coral hover:bg-coral-dark text-white"
                  : "bg-navy hover:bg-navy/90 text-white"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {pendingId === p.id ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting…
                </>
              ) : (
                `Buy ${p.label}`
              )}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
