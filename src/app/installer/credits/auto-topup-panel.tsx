"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/billing/credit-packs";

// Settings panel that lets the installer toggle auto top-up on/off
// + pick which pack to auto-buy. Lives below the manual buy buttons
// on /installer/credits.
//
// On mount we GET /api/installer/credits/auto-recharge to read the
// current state. The panel's behaviour depends on three signals:
//
//   - hasSavedCard: false → render disabled tile with "buy a pack
//     manually first" copy. We can't enable without a card on file.
//
//   - failedAt set → render an amber banner with the failure reason
//     (the dashboard banner shows this at /installer level too; this
//     one's contextual).
//
//   - enabled true/false → toggle plus pack selector.

interface SettingsState {
  enabled: boolean;
  packId: "starter" | "growth" | "scale" | "volume" | null;
  hasSavedCard: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

interface SettingsResponse {
  ok: boolean;
  enabled?: boolean;
  packId?: "starter" | "growth" | "scale" | "volume" | null;
  hasSavedCard?: boolean;
  cardBrand?: string | null;
  cardLast4?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  error?: string;
}

export function AutoTopUpPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SettingsState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftPackId, setDraftPackId] = useState<
    "starter" | "growth" | "scale" | "volume"
  >("growth");

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/installer/credits/auto-recharge");
      const json = (await res.json()) as SettingsResponse;
      if (!json.ok) {
        setError(json.error ?? "Couldn't load settings");
        return;
      }
      const next: SettingsState = {
        enabled: !!json.enabled,
        packId: json.packId ?? null,
        hasSavedCard: !!json.hasSavedCard,
        cardBrand: json.cardBrand ?? null,
        cardLast4: json.cardLast4 ?? null,
        failedAt: json.failedAt ?? null,
        failureReason: json.failureReason ?? null,
      };
      setState(next);
      if (next.packId) setDraftPackId(next.packId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function update(packId: SettingsState["packId"]) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/installer/credits/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const json = (await res.json()) as SettingsResponse;
      if (!json.ok) {
        setError(json.error ?? "Couldn't save");
        setSaving(false);
        return;
      }
      // Reload — the API doesn't return card info on POST.
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PanelShell>
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 py-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading auto top-up settings…
        </div>
      </PanelShell>
    );
  }

  if (!state) {
    return (
      <PanelShell>
        <p className="text-sm text-red-600">{error ?? "Couldn't load settings"}</p>
      </PanelShell>
    );
  }

  if (!state.hasSavedCard) {
    return (
      <PanelShell>
        <p className="text-sm text-slate-600 leading-relaxed">
          Auto top-up uses a card we&rsquo;ve already got on file. Buy
          any pack manually above, then come back to enable auto
          top-up — Stripe saves the card during the first purchase.
        </p>
      </PanelShell>
    );
  }

  return (
    <PanelShell>
      {state.failedAt && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-4 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
          <div>
            <p className="font-semibold text-amber-900">
              Last auto top-up didn&rsquo;t go through
            </p>
            {state.failureReason && (
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                {state.failureReason}
              </p>
            )}
            <p className="text-xs text-amber-800 mt-1">
              Buy a pack manually with a working card to clear this
              alert + re-enable auto top-up.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 text-sm">
        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-pale/40 text-coral border border-coral/30">
          <Sparkles className="w-4 h-4" />
        </span>
        <div className="flex-1">
          <p className="font-semibold text-navy">Auto top-up</p>
          <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
            When your balance drops to 10 credits or below, we&rsquo;ll
            automatically charge your saved card{" "}
            {state.cardBrand && state.cardLast4 ? (
              <span className="text-slate-700 font-medium">
                ({state.cardBrand} •••• {state.cardLast4})
              </span>
            ) : (
              "on file"
            )}{" "}
            for your chosen pack.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => update(state.enabled ? null : draftPackId)}
          className={`shrink-0 inline-flex items-center justify-center h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
            state.enabled
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-white border border-slate-200 hover:border-coral/40 text-slate-700"
          } disabled:opacity-60`}
        >
          {state.enabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              On
            </>
          ) : (
            "Turn on"
          )}
        </button>
      </div>

      {/* Pack picker — visible whenever enabled or about to enable. */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CREDIT_PACKS.map((p) => {
          const isActive = state.enabled
            ? state.packId === p.id
            : draftPackId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={saving}
              onClick={() => {
                if (state.enabled) {
                  void update(p.id);
                } else {
                  setDraftPackId(p.id);
                }
              }}
              className={`text-left rounded-lg border p-3 transition-colors ${
                isActive
                  ? "border-coral bg-coral-pale/40 shadow-sm"
                  : "border-slate-200 bg-white hover:border-coral/30"
              } disabled:opacity-60`}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-coral">
                {p.label}
              </p>
              <p className="mt-1 text-base font-bold text-navy">
                {p.credits}{" "}
                <span className="text-xs font-normal text-slate-500">
                  credits
                </span>
              </p>
              <p className="text-[11px] text-slate-500">
                £{(p.pricePence / 100).toFixed(0)}
              </p>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="mt-3 text-xs text-red-600">{error}</p>
      )}

      {state.enabled && (
        <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
          Charges happen automatically — Stripe sends a receipt each
          time. Turn off any time.
        </p>
      )}
    </PanelShell>
  );
}

function PanelShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-coral" />
        <h2 className="text-sm font-semibold text-navy">Auto top-up</h2>
      </div>
      {children}
    </div>
  );
}
