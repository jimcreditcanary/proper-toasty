"use client";

// AutoRechargeEditor — client island for /installer/billing/auto-recharge.
//
// Renders three states:
//
//   1. "No card on file" — promote the onboarding card flow at
//      /installer/onboarding/card. Without a card we can't even
//      offer the mode picker because there's nothing to charge.
//
//   2. "Card on file" — full editor: mode picker (auto / manual /
//      off), threshold + pack dropdowns, plain-English summary,
//      save button. Posts to /api/installer/credits/auto-recharge.
//
//   3. "Last charge failed" — banner above the editor explaining
//      the decline. Re-saving the rule clears the flag.
//
// Settings are loaded from /api/installer/credits/auto-recharge GET
// on mount. All writes go through the same endpoint's POST.

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  Loader2,
  Lock,
  Save,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { CREDIT_PACKS, formatGbp } from "@/lib/billing/credit-packs";

type PackId = "starter" | "growth" | "scale" | "volume";
type Mode = "auto" | "manual" | "off";

const THRESHOLD_OPTIONS: readonly number[] = [5, 10, 25, 50];
const DEFAULT_THRESHOLD = 10;
const DEFAULT_PACK_ID: PackId = "growth";

interface SettingsState {
  mode: Mode;
  enabled: boolean;
  packId: PackId | null;
  thresholdCredits: number | null;
  effectiveThreshold: number;
  hasSavedCard: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
  failedAt: string | null;
  failureReason: string | null;
}

interface SettingsResponse {
  ok: boolean;
  mode?: Mode;
  enabled?: boolean;
  packId?: PackId | null;
  thresholdCredits?: number | null;
  effectiveThreshold?: number;
  hasSavedCard?: boolean;
  cardBrand?: string | null;
  cardLast4?: string | null;
  failedAt?: string | null;
  failureReason?: string | null;
  error?: string;
}

export function AutoRechargeEditor() {
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    try {
      const res = await fetch("/api/installer/credits/auto-recharge");
      const json = (await res.json()) as SettingsResponse;
      if (!json.ok) return;
      setSettings({
        mode: json.mode ?? "off",
        enabled: !!json.enabled,
        packId: (json.packId ?? null) as PackId | null,
        thresholdCredits: json.thresholdCredits ?? null,
        effectiveThreshold: json.effectiveThreshold ?? DEFAULT_THRESHOLD,
        hasSavedCard: !!json.hasSavedCard,
        cardBrand: json.cardBrand ?? null,
        cardLast4: json.cardLast4 ?? null,
        failedAt: json.failedAt ?? null,
        failureReason: json.failureReason ?? null,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  if (loading || !settings) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 flex items-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading current rule…
      </div>
    );
  }

  if (!settings.hasSavedCard) {
    return <NoCardOnFile />;
  }

  return <Editor settings={settings} onSaved={reload} />;
}

function NoCardOnFile() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4 mb-4">
        <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-coral-pale text-coral-dark shrink-0">
          <CreditCard className="w-5 h-5" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-navy">
            No card on file yet
          </h2>
          <p className="text-sm text-slate-600 mt-1 leading-relaxed">
            Save a card via Stripe first — then you can set up an
            auto-recharge rule here. We don&rsquo;t charge anything
            when you save it.
          </p>
        </div>
      </div>
      <Link
        href="/installer/onboarding/card"
        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
      >
        <CreditCard className="w-4 h-4" />
        Save a card via Stripe
      </Link>
    </div>
  );
}

function Editor({
  settings,
  onSaved,
}: {
  settings: SettingsState;
  onSaved: () => void;
}) {
  // Draft state — initialised from the persisted settings, then
  // mutated as the user edits.
  const [mode, setMode] = useState<Mode>(settings.mode);
  const [packId, setPackId] = useState<PackId>(
    settings.packId ?? DEFAULT_PACK_ID,
  );
  const [threshold, setThreshold] = useState<number>(
    settings.thresholdCredits ?? DEFAULT_THRESHOLD,
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const pack = useMemo(
    () => CREDIT_PACKS.find((p) => p.id === packId),
    [packId],
  );

  const isDirty =
    mode !== settings.mode ||
    (mode === "auto" &&
      (packId !== settings.packId ||
        threshold !== (settings.thresholdCredits ?? DEFAULT_THRESHOLD)));

  async function save() {
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      const body =
        mode === "auto"
          ? { mode: "auto" as const, packId, thresholdCredits: threshold }
          : mode === "manual"
            ? { mode: "manual" as const }
            : { mode: "off" as const };
      const res = await fetch("/api/installer/credits/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as SettingsResponse;
      if (!json.ok) {
        setError(json.error ?? "Couldn't save");
        return;
      }
      setSavedFlash(true);
      onSaved();
      // Drop the flash after a beat so the user sees a tick + then
      // the page settles.
      setTimeout(() => setSavedFlash(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {settings.failedAt && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">
              Last auto-recharge didn&rsquo;t go through
            </p>
            {settings.failureReason && (
              <p className="text-amber-900 mt-1 leading-relaxed text-xs">
                {settings.failureReason}
              </p>
            )}
            <p className="text-amber-900 mt-1 text-xs">
              Update the card below, then re-save the rule to clear
              this and resume.
            </p>
          </div>
        </div>
      )}

      <CurrentRuleSummary settings={settings} />

      <SavedCardCard settings={settings} />

      {/* Mode picker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Change the rule
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <ModeCard
            active={mode === "auto"}
            onClick={() => setMode("auto")}
            title="Auto-recharge"
            subtitle="Charge on a rule"
          />
          <ModeCard
            active={mode === "manual"}
            onClick={() => setMode("manual")}
            title="Manual only"
            subtitle="No auto-charge"
          />
          <ModeCard
            active={mode === "off"}
            onClick={() => setMode("off")}
            title="Off"
            subtitle="Disable temporarily"
          />
        </div>

        {mode === "auto" && (
          <div className="rounded-xl border border-coral/30 bg-coral-pale/30 p-4 sm:p-5 space-y-4">
            <div>
              <label
                htmlFor="threshold"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                When my balance drops below
              </label>
              <select
                id="threshold"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
              >
                {THRESHOLD_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t} credit{t === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="pack"
                className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
              >
                Top up by buying
              </label>
              <select
                id="pack"
                value={packId}
                onChange={(e) => setPackId(e.target.value as PackId)}
                className="w-full h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-coral"
              >
                {CREDIT_PACKS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label} — {p.credits} credits ·{" "}
                    {formatGbp(p.pricePence)}
                  </option>
                ))}
              </select>
            </div>

            {pack && (
              <p className="text-xs text-slate-700 leading-relaxed flex items-start gap-2 pt-1 border-t border-coral/20">
                <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0 text-coral" />
                <span>
                  When your balance drops below <strong>{threshold}</strong>{" "}
                  credit{threshold === 1 ? "" : "s"}, we&rsquo;ll charge{" "}
                  <strong>{formatGbp(pack.pricePence)}</strong> for{" "}
                  <strong>{pack.credits} more credits</strong> ({pack.label}).
                </span>
              </p>
            )}
          </div>
        )}

        {mode === "manual" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
            Your card stays saved. We never auto-charge it. Top up
            manually any time at{" "}
            <Link
              href="/installer/credits"
              className="text-coral hover:text-coral-dark underline"
            >
              /installer/credits
            </Link>
            .
          </div>
        )}

        {mode === "off" && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 leading-relaxed">
            Auto-recharge is off. Your card stays on file. Switch
            back to <strong>Auto-recharge</strong> any time without
            re-entering card details.
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={save}
            disabled={saving || !isDirty}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 text-white font-semibold text-sm transition-colors"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save rule
              </>
            )}
          </button>

          {savedFlash && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <CheckCircle2 className="w-4 h-4" />
              Saved
            </span>
          )}

          {!isDirty && !savedFlash && (
            <span className="text-xs text-slate-500">
              No changes to save
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CurrentRuleSummary({ settings }: { settings: SettingsState }) {
  const pack = settings.packId
    ? CREDIT_PACKS.find((p) => p.id === settings.packId)
    : null;
  const cardLine =
    settings.cardBrand && settings.cardLast4
      ? `${capitalise(settings.cardBrand)} •••• ${settings.cardLast4}`
      : "your saved card";

  let summary: string;
  if (settings.mode === "auto" && pack) {
    summary = `When your balance drops below ${settings.effectiveThreshold} credits, we charge ${cardLine} ${formatGbp(pack.pricePence)} for ${pack.credits} more credits (${pack.label}).`;
  } else if (settings.mode === "manual") {
    summary = `Auto-recharge is off — ${cardLine} is saved for manual top-ups only.`;
  } else {
    summary = `Auto-recharge is off. ${cardLine} stays on file.`;
  }

  return (
    <div
      className={`rounded-2xl border p-5 ${
        settings.mode === "auto"
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-slate-200 bg-slate-50/50"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
        Current rule
      </p>
      <p className="text-sm text-navy leading-relaxed">{summary}</p>
    </div>
  );
}

function SavedCardCard({ settings }: { settings: SettingsState }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 flex items-center gap-4 flex-wrap">
      <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 shrink-0">
        <Lock className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-[200px]">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Card on file
        </p>
        <p className="text-sm font-semibold text-navy mt-0.5">
          {settings.cardBrand && settings.cardLast4
            ? `${capitalise(settings.cardBrand)} •••• ${settings.cardLast4}`
            : "Saved with Stripe"}
        </p>
      </div>
      <Link
        href="/installer/onboarding/card"
        className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full text-xs font-semibold bg-white border border-slate-200 hover:border-coral/40 text-slate-700 transition-colors"
      >
        <CreditCard className="w-3.5 h-3.5" />
        Update card
      </Link>
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`text-left rounded-xl border p-4 transition-all ${
        active
          ? "border-coral bg-coral-pale/40 shadow-sm ring-1 ring-coral/30"
          : "border-slate-200 bg-white hover:border-coral/30"
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-navy">{title}</p>
        {active && <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{subtitle}</p>
    </button>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
