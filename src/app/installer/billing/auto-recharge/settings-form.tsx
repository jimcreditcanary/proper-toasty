"use client";

// Client-side toggle + threshold + pack picker for the
// /installer/billing/auto-recharge page. Writes go through
// /api/installer/credits/auto-recharge (same endpoint the credits
// page uses).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Loader2,
  AlertCircle,
  Zap,
} from "lucide-react";

type PackId = "starter" | "growth" | "scale" | "volume";

interface PackOption {
  id: PackId;
  label: string;
  credits: number;
  pricePence: number;
  highlight: boolean;
}

interface InitialState {
  enabled: boolean;
  packId: PackId | null;
  thresholdCredits: number | null;
  hasSavedCard: boolean;
  cardBrand: string | null;
  cardLast4: string | null;
}

interface Props {
  initial: InitialState;
  packs: PackOption[];
  defaultThreshold: number;
}

const THRESHOLD_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 5, label: "5 credits" },
  { value: 10, label: "10 credits" },
  { value: 25, label: "25 credits" },
  { value: 50, label: "50 credits" },
] as const;

export function AutoRechargeSettings({ initial, packs, defaultThreshold }: Props) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [packId, setPackId] = useState<PackId>(
    initial.packId ?? "growth",
  );
  const [thresholdCredits, setThresholdCredits] = useState<number>(
    initial.thresholdCredits ?? defaultThreshold,
  );
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [isPending, startTransition] = useTransition();

  const selectedPack =
    packs.find((p) => p.id === packId) ?? packs[0];

  async function persist(opts: {
    nextEnabled: boolean;
    nextPackId: PackId;
    nextThreshold: number;
  }): Promise<boolean> {
    setError(null);
    try {
      const body = opts.nextEnabled
        ? { packId: opts.nextPackId, thresholdCredits: opts.nextThreshold }
        : { packId: null };
      const res = await fetch("/api/installer/credits/auto-recharge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        setError(
          ("error" in json && json.error) || "Couldn't save settings",
        );
        return false;
      }
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
      return false;
    }
  }

  function flashSaved() {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  function handleToggle() {
    if (!initial.hasSavedCard && !enabled) return; // can't enable without card
    const nextEnabled = !enabled;
    startTransition(async () => {
      const ok = await persist({
        nextEnabled,
        nextPackId: packId,
        nextThreshold: thresholdCredits,
      });
      if (ok) {
        setEnabled(nextEnabled);
        flashSaved();
        router.refresh();
      }
    });
  }

  function handlePackChange(next: PackId) {
    setPackId(next);
    if (!enabled) return;
    startTransition(async () => {
      const ok = await persist({
        nextEnabled: true,
        nextPackId: next,
        nextThreshold: thresholdCredits,
      });
      if (ok) {
        flashSaved();
        router.refresh();
      }
    });
  }

  function handleThresholdChange(next: number) {
    setThresholdCredits(next);
    if (!enabled) return;
    startTransition(async () => {
      const ok = await persist({
        nextEnabled: true,
        nextPackId: packId,
        nextThreshold: next,
      });
      if (ok) {
        flashSaved();
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="p-5 sm:p-6 border-b border-slate-100">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center justify-center w-11 h-11 rounded-2xl ${
                enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              <Zap className="w-5 h-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-navy">
                Auto top-up is{" "}
                <span className={enabled ? "text-emerald-700" : "text-slate-500"}>
                  {enabled ? "ON" : "OFF"}
                </span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {enabled ? (
                  <>
                    Charges{" "}
                    {initial.cardBrand && initial.cardLast4 ? (
                      <>
                        {capitalise(initial.cardBrand)} •••• {initial.cardLast4}
                      </>
                    ) : (
                      "your saved card"
                    )}{" "}
                    when balance drops below {thresholdCredits} credits.
                  </>
                ) : initial.hasSavedCard ? (
                  "Turn on to keep your balance topped up automatically."
                ) : (
                  "Save a card first — see below."
                )}
              </p>
            </div>
          </div>
          <ToggleSwitch
            checked={enabled}
            disabled={isPending || (!initial.hasSavedCard && !enabled)}
            onChange={handleToggle}
            ariaLabel={enabled ? "Turn off auto top-up" : "Turn on auto top-up"}
          />
        </div>

        {savedFlash && (
          <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="w-3 h-3" />
            Saved
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        <div>
          <label
            htmlFor="threshold"
            className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5"
          >
            Trigger when balance drops below
          </label>
          <select
            id="threshold"
            value={thresholdCredits}
            onChange={(e) => handleThresholdChange(Number(e.target.value))}
            disabled={isPending}
            className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-coral disabled:opacity-60"
          >
            {THRESHOLD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
            Recharge with
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {packs.map((p) => {
              const active = p.id === packId;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isPending}
                  onClick={() => handlePackChange(p.id)}
                  className={`relative text-left rounded-lg border p-3 transition-colors ${
                    active
                      ? "border-coral bg-coral-pale/40 shadow-sm"
                      : "border-slate-200 bg-white hover:border-coral/30"
                  } disabled:opacity-60`}
                >
                  {p.highlight && (
                    <span className="absolute -top-2 right-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-coral text-white">
                      Popular
                    </span>
                  )}
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
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700 leading-relaxed flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-slate-500" />
          <p>
            <strong className="text-navy">Rule:</strong> when your balance
            drops below{" "}
            <strong>
              {thresholdCredits} credit{thresholdCredits === 1 ? "" : "s"}
            </strong>
            , {enabled ? "we'll" : "we'd"} charge{" "}
            <strong>£{(selectedPack.pricePence / 100).toFixed(0)}</strong> for{" "}
            <strong>{selectedPack.credits} credits</strong>. Receipt by email
            each time.
          </p>
        </div>
      </div>

      {isPending && (
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 inline-flex items-center gap-1.5 w-full">
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving…
        </div>
      )}
    </div>
  );
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Toggle switch ─────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex items-center w-12 h-7 rounded-full transition-colors shrink-0 ${
        checked ? "bg-emerald-500" : "bg-slate-300"
      } disabled:opacity-50`}
    >
      <span
        className={`inline-block w-5 h-5 rounded-full bg-white shadow transform transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}
