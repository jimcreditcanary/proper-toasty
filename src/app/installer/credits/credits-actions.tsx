"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CreditCard,
  Loader2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ChevronDown,
} from "lucide-react";
import {
  CREDIT_PACKS,
  formatGbp,
  type CreditPack,
} from "@/lib/billing/credit-packs";

// Combined client island for /installer/credits.
//
// Responsibilities:
//   - Render the balance card with auto top-up status baked in.
//   - Open a "Buy more credits" modal that pops the four pack tiles.
//   - Expand/collapse the auto top-up controls (toggle, pack picker)
//     inside the same balance card.
//
// Settings come from /api/installer/credits/auto-recharge GET; the
// modal hits /api/installer/credits/checkout on click and redirects
// to Stripe Checkout. All side-effects refresh the local state on
// completion.

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

interface Props {
  /** Server-fetched balance so we can render the headline number
   *  without flicker. We never re-fetch this on the client — Stripe
   *  webhook → Postgres → next page load is the canonical path. */
  balance: number;
  /** Initial flash banner from the magic-link enable flow. */
  enableFlash?: string | null;
}

export function CreditsActions({ balance, enableFlash }: Props) {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [showAutoControls, setShowAutoControls] = useState(false);
  const [flash, setFlash] = useState<string | null>(enableFlash ?? null);

  const reloadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/installer/credits/auto-recharge");
      const json = (await res.json()) as SettingsResponse;
      if (!json.ok) return;
      setSettings({
        enabled: !!json.enabled,
        packId: json.packId ?? null,
        hasSavedCard: !!json.hasSavedCard,
        cardBrand: json.cardBrand ?? null,
        cardLast4: json.cardLast4 ?? null,
        failedAt: json.failedAt ?? null,
        failureReason: json.failureReason ?? null,
      });
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  useEffect(() => {
    void reloadSettings();
  }, [reloadSettings]);

  const lowBalance = balance < 10;

  return (
    <>
      {/* Flash banners from the one-click email enable flow. */}
      {flash === "ok" && (
        <FlashBanner tone="success" onDismiss={() => setFlash(null)}>
          Auto top-up is now on. We&rsquo;ll keep your account funded
          automatically.
        </FlashBanner>
      )}
      {flash === "invalid" && (
        <FlashBanner tone="error" onDismiss={() => setFlash(null)}>
          That auto top-up link wasn&rsquo;t valid. Open it from the
          original email or use the toggle below.
        </FlashBanner>
      )}
      {flash === "no_card" && (
        <FlashBanner tone="warn" onDismiss={() => setFlash(null)}>
          We need a card on file before auto top-up can fire. Buy any
          pack manually below first.
        </FlashBanner>
      )}
      {flash === "missing_user" && (
        <FlashBanner tone="error" onDismiss={() => setFlash(null)}>
          Couldn&rsquo;t find your account. Sign in and try the toggle
          below instead.
        </FlashBanner>
      )}

      {/* Balance + auto top-up combo card. */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden mb-6">
        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <div className="flex items-start gap-4 flex-1">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-coral-pale text-coral-dark">
              <CreditCard className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Current balance
              </p>
              <p className="text-3xl sm:text-4xl font-bold text-navy leading-tight mt-0.5">
                {balance}{" "}
                <span className="text-base font-semibold text-slate-500">
                  credit{balance === 1 ? "" : "s"}
                </span>
              </p>
              {lowBalance && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900">
                  <Sparkles className="w-3 h-3" />
                  Low — top up to keep accepting leads
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowBuyModal(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            Buy more credits
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100" />

        {/* Auto top-up status row */}
        <div
          className={`px-5 sm:px-6 py-4 ${
            settings?.failedAt
              ? "bg-amber-50/60"
              : settings?.enabled
                ? "bg-emerald-50/40"
                : "bg-slate-50/40"
          }`}
        >
          {loadingSettings || !settings ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading auto top-up status…
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 flex-wrap">
                <span
                  className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl ${
                    settings.enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </span>
                <div className="flex-1 min-w-[200px]">
                  <p className="text-sm font-semibold text-navy">
                    Auto top-up{" "}
                    <span
                      className={`text-xs font-bold ${
                        settings.enabled ? "text-emerald-700" : "text-slate-500"
                      }`}
                    >
                      {settings.enabled ? "ON" : "OFF"}
                    </span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {renderStatusLine(settings)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAutoControls((v) => !v)}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:border-coral/40 text-slate-700 transition-colors shrink-0"
                >
                  Manage
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform ${
                      showAutoControls ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {settings.failedAt && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-100/40 p-3 text-xs flex items-start gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-700" />
                  <div>
                    <p className="font-semibold text-amber-900">
                      Last auto top-up didn&rsquo;t go through
                    </p>
                    {settings.failureReason && (
                      <p className="text-amber-900 mt-0.5 leading-relaxed">
                        {settings.failureReason}
                      </p>
                    )}
                    <p className="text-amber-800 mt-1">
                      Buy a pack with a working card to clear this and
                      re-enable.
                    </p>
                  </div>
                </div>
              )}

              {showAutoControls && (
                <AutoControls
                  settings={settings}
                  onChange={() => void reloadSettings()}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Buy modal */}
      {showBuyModal && (
        <BuyModal
          onClose={() => setShowBuyModal(false)}
        />
      )}
    </>
  );
}

function renderStatusLine(settings: SettingsState): string {
  if (!settings.hasSavedCard) {
    return "Buy a pack manually first to save a card. Then auto top-up unlocks.";
  }
  const cardLine =
    settings.cardBrand && settings.cardLast4
      ? `${capitalise(settings.cardBrand)} •••• ${settings.cardLast4}`
      : "saved card";
  if (settings.enabled) {
    const pack = settings.packId
      ? CREDIT_PACKS.find((p) => p.id === settings.packId)
      : null;
    if (pack) {
      return `Adds ${pack.credits} credits (${pack.label}) on ${cardLine} when you drop to 10 credits or below.`;
    }
    return `Charges ${cardLine} when you hit 10 credits.`;
  }
  return `Turn on to keep your balance topped up automatically with ${cardLine}.`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Auto-controls (expanded section) ──────────────────────────────

function AutoControls({
  settings,
  onChange,
}: {
  settings: SettingsState;
  onChange: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<
    "starter" | "growth" | "scale" | "volume"
  >(settings.packId ?? "growth");

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
        return;
      }
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  if (!settings.hasSavedCard) {
    return (
      <p className="mt-4 text-xs text-slate-600 leading-relaxed">
        Buy any pack via the Buy more credits button — the card you use
        gets saved by Stripe so we can charge it later. Then come back
        here to turn auto top-up on.
      </p>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3 mb-3">
        <p className="text-sm font-semibold text-navy">
          {settings.enabled ? "Pick the auto top-up pack" : "Choose a pack and turn it on"}
        </p>
        <button
          type="button"
          disabled={saving}
          onClick={() => update(settings.enabled ? null : draft)}
          className={`inline-flex items-center justify-center gap-1.5 h-9 px-4 rounded-full text-xs font-semibold transition-colors ${
            settings.enabled
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-coral hover:bg-coral-dark text-white"
          } disabled:opacity-60`}
        >
          {settings.enabled ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              On — turn off
            </>
          ) : (
            "Turn on"
          )}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {CREDIT_PACKS.map((p) => {
          const isActive = settings.enabled
            ? settings.packId === p.id
            : draft === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={saving}
              onClick={() => {
                if (settings.enabled) {
                  void update(p.id);
                } else {
                  setDraft(p.id);
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

      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {settings.enabled && (
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          Charges happen automatically — Stripe sends a receipt every
          time. Turn off any time.
        </p>
      )}
    </div>
  );
}

// ─── Buy modal ─────────────────────────────────────────────────────

function BuyModal({ onClose }: { onClose: () => void }) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Esc-to-close. Stripe Checkout opens in a new full redirect so
  // body-scroll-lock isn't strictly needed, but it keeps things tidy.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function buy(pack: CreditPack) {
    setPendingId(pack.id);
    setError(null);
    try {
      const res = await fetch("/api/installer/credits/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId: pack.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        url?: string;
        error?: string;
      };
      if (!json.ok || !json.url) {
        setError(json.error ?? "Couldn't start checkout");
        setPendingId(null);
        return;
      }
      window.location.href = json.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      setPendingId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-slate-900/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-5 border-b border-slate-100 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-navy">Buy more credits</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Five credits per accepted lead. Pick a pack — Stripe
              handles the card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {CREDIT_PACKS.map((p) => (
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
                onClick={() => buy(p)}
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

        {error && (
          <p className="px-5 pb-3 text-xs text-red-600">{error}</p>
        )}
        <p className="px-5 pb-5 text-[11px] text-slate-500 leading-relaxed text-center">
          Card payments handled by Stripe. We don&rsquo;t store card
          details. Receipts go to your account email.
        </p>
      </div>
    </div>
  );
}

// ─── Flash banner ──────────────────────────────────────────────────

function FlashBanner({
  children,
  tone,
  onDismiss,
}: {
  children: React.ReactNode;
  tone: "success" | "warn" | "error";
  onDismiss: () => void;
}) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-900";
  return (
    <div
      className={`rounded-xl border ${cls} p-4 mb-5 text-sm flex items-start gap-3`}
    >
      <p className="flex-1 leading-relaxed">{children}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-full hover:bg-white/40"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
