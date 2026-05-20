"use client";

// Stripe Elements SetupIntent flow — collects a PaymentMethod
// WITHOUT charging. Three server round-trips:
//   1. POST /api/installer/onboarding/card/setup-intent — creates
//      SetupIntent + returns client_secret
//   2. POST /api/installer/onboarding/card/confirm — after browser
//      confirms with Stripe Elements; verify + stamp + grant
//   3. (Optional, when mode === "auto") POST
//      /api/installer/credits/auto-recharge — enable the rule
//
// Loading: we wait for the user to click Continue before creating
// the intent. Pre-creating on page mount would spam Stripe with
// abandoned intents.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import {
  Loader2,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Zap,
  Wallet,
} from "lucide-react";

type Mode = "auto" | "save_only" | "skip";

type PackId = "starter" | "growth" | "scale" | "volume";

const THRESHOLD_OPTIONS: ReadonlyArray<{ value: number; label: string }> = [
  { value: 5, label: "5 credits (≈ 1 lead left)" },
  { value: 10, label: "10 credits" },
  { value: 25, label: "25 credits" },
  { value: 50, label: "50 credits" },
] as const;

const DEFAULT_THRESHOLD = 10;
const DEFAULT_PACK: PackId = "growth";

interface PackOption {
  id: PackId;
  label: string;
  credits: number;
  pricePence: number;
  highlight: boolean;
}

interface Props {
  publishableKey: string;
  packs: PackOption[];
}

export function CardSetupForm({ publishableKey, packs }: Props) {
  const router = useRouter();
  // loadStripe is async + cached; resolves once per page.
  const [stripePromise] = useState<Promise<Stripe | null>>(() =>
    loadStripe(publishableKey),
  );
  const [mode, setMode] = useState<Mode>("auto");
  const [packId, setPackId] = useState<PackId>(DEFAULT_PACK);
  const [thresholdCredits, setThresholdCredits] =
    useState<number>(DEFAULT_THRESHOLD);

  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);

  const selectedPack = useMemo(
    () => packs.find((p) => p.id === packId) ?? packs[0],
    [packs, packId],
  );

  async function startIntent() {
    setIntentError(null);
    setIntentLoading(true);
    try {
      const res = await fetch("/api/installer/onboarding/card/setup-intent", {
        method: "POST",
      });
      const json = (await res.json()) as
        | { ok: true; clientSecret: string }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Stripe init failed");
      }
      setClientSecret(json.clientSecret);
    } catch (e) {
      setIntentError(e instanceof Error ? e.message : "Stripe init failed");
    } finally {
      setIntentLoading(false);
    }
  }

  function handleSkip() {
    router.push("/installer/onboarding");
  }

  if (clientSecret) {
    return (
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#ec6a4d",
              borderRadius: "12px",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
          },
        }}
      >
        <CardFormInner
          mode={mode}
          packId={packId}
          thresholdCredits={thresholdCredits}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-4">
      <ModeSelector
        mode={mode}
        onChange={setMode}
        selectedPack={selectedPack}
        threshold={thresholdCredits}
      />

      {mode === "auto" && (
        <AutoRechargeConfig
          packs={packs}
          packId={packId}
          onPackChange={setPackId}
          thresholdCredits={thresholdCredits}
          onThresholdChange={setThresholdCredits}
          selectedPack={selectedPack}
        />
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        {intentError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2 mb-3">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{intentError}</span>
          </div>
        )}
        {mode === "skip" ? (
          <button
            type="button"
            onClick={handleSkip}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-sm transition-colors"
          >
            Skip for now — back to onboarding
          </button>
        ) : (
          <button
            type="button"
            onClick={startIntent}
            disabled={intentLoading}
            className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 text-white font-semibold text-sm transition-colors"
          >
            {intentLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading Stripe…
              </>
            ) : (
              <>
                <CreditCard className="w-4 h-4" />
                Continue — enter card
              </>
            )}
          </button>
        )}
        <p className="mt-3 text-[11px] text-slate-500 text-center leading-relaxed">
          {mode === "skip"
            ? "You can save a card later from Billing → Auto top-up."
            : "Cards go straight to Stripe. We never see the full details."}
        </p>
      </div>
    </div>
  );
}

// ─── Mode selector ─────────────────────────────────────────────────

function ModeSelector({
  mode,
  onChange,
  selectedPack,
  threshold,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  selectedPack: PackOption;
  threshold: number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        How should we handle future charges?
      </p>
      <div className="space-y-2">
        <ModeOption
          mode="auto"
          activeMode={mode}
          onSelect={onChange}
          icon={<Zap className="w-4 h-4" />}
          title="Auto top-up (recommended)"
          subtitle={`When my balance drops below ${threshold} credits, charge £${(
            selectedPack.pricePence / 100
          ).toFixed(0)} for ${selectedPack.credits} more credits.`}
        />
        <ModeOption
          mode="save_only"
          activeMode={mode}
          onSelect={onChange}
          icon={<Wallet className="w-4 h-4" />}
          title="Save card only"
          subtitle="No auto-charge. I'll top up manually from the credits page when I want to."
        />
        <ModeOption
          mode="skip"
          activeMode={mode}
          onSelect={onChange}
          icon={null}
          title="Skip for now"
          subtitle="Come back to this step later. Your other onboarding credits stay granted."
        />
      </div>
    </div>
  );
}

function ModeOption({
  mode,
  activeMode,
  onSelect,
  icon,
  title,
  subtitle,
}: {
  mode: Mode;
  activeMode: Mode;
  onSelect: (m: Mode) => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  const active = mode === activeMode;
  return (
    <button
      type="button"
      onClick={() => onSelect(mode)}
      className={`w-full text-left rounded-xl border p-3 transition-colors flex items-start gap-3 ${
        active
          ? "border-coral bg-coral-pale/40 shadow-sm"
          : "border-slate-200 bg-white hover:border-coral/40"
      }`}
    >
      <span
        className={`mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full border-2 shrink-0 ${
          active ? "border-coral bg-coral" : "border-slate-300"
        }`}
      >
        {active && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          {icon && (
            <span
              className={`inline-flex items-center justify-center w-5 h-5 rounded ${
                active ? "text-coral-dark" : "text-slate-500"
              }`}
            >
              {icon}
            </span>
          )}
          <p
            className={`text-sm font-semibold ${
              active ? "text-navy" : "text-slate-700"
            }`}
          >
            {title}
          </p>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mt-0.5">
          {subtitle}
        </p>
      </div>
    </button>
  );
}

// ─── Auto-recharge config block ────────────────────────────────────

function AutoRechargeConfig({
  packs,
  packId,
  onPackChange,
  thresholdCredits,
  onThresholdChange,
  selectedPack,
}: {
  packs: PackOption[];
  packId: PackId;
  onPackChange: (id: PackId) => void;
  thresholdCredits: number;
  onThresholdChange: (n: number) => void;
  selectedPack: PackOption;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
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
          onChange={(e) => onThresholdChange(Number(e.target.value))}
          className="w-full h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:outline-none focus:border-coral"
        >
          {THRESHOLD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Recharge with
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {packs.map((p) => {
            const active = p.id === packId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onPackChange(p.id)}
                className={`relative text-left rounded-lg border p-3 transition-colors ${
                  active
                    ? "border-coral bg-coral-pale/40 shadow-sm"
                    : "border-slate-200 bg-white hover:border-coral/30"
                }`}
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

      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-600" />
        <p>
          When your balance drops below{" "}
          <strong>
            {thresholdCredits} credit{thresholdCredits === 1 ? "" : "s"}
          </strong>
          , we&rsquo;ll charge{" "}
          <strong>£{(selectedPack.pricePence / 100).toFixed(0)}</strong> for{" "}
          <strong>{selectedPack.credits} more credits</strong> on the card you
          enter next. Receipt by email each time.
        </p>
      </div>
    </div>
  );
}

// ─── Stripe Elements inner form ────────────────────────────────────

function CardFormInner({
  mode,
  packId,
  thresholdCredits,
}: {
  mode: Mode;
  packId: PackId;
  thresholdCredits: number;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRechargeWarning, setAutoRechargeWarning] = useState<string | null>(
    null,
  );
  const [success, setSuccess] = useState<{
    creditsGranted: number;
    autoEnabled: boolean;
  } | null>(null);

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      router.push("/installer/onboarding");
      router.refresh();
    }, 1800);
    return () => clearTimeout(t);
  }, [success, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    setAutoRechargeWarning(null);
    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/installer/onboarding/card`,
        },
        redirect: "if_required",
      });
      if (stripeError) {
        throw new Error(stripeError.message ?? "Stripe declined the card");
      }
      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error(`SetupIntent ended in status ${setupIntent?.status}`);
      }

      const res = await fetch("/api/installer/onboarding/card/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupIntentId: setupIntent.id }),
      });
      const json = (await res.json()) as
        | { ok: true; creditsGranted: number }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Confirm failed");
      }

      // Card is now on file. Enable auto top-up if that's what the
      // user picked. We treat a failure here as non-blocking — the
      // card is saved either way, and the user can flip auto top-up
      // on later from settings.
      let autoEnabled = false;
      if (mode === "auto") {
        try {
          const ar = await fetch("/api/installer/credits/auto-recharge", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ packId, thresholdCredits }),
          });
          const arJson = (await ar.json()) as
            | { ok: true }
            | { ok: false; error: string };
          if (!ar.ok || !arJson.ok) {
            setAutoRechargeWarning(
              ("error" in arJson && arJson.error) ||
                "Card saved, but we couldn't turn on auto top-up. You can enable it from Billing → Auto top-up.",
            );
          } else {
            autoEnabled = true;
          }
        } catch {
          setAutoRechargeWarning(
            "Card saved, but we couldn't turn on auto top-up. You can enable it from Billing → Auto top-up.",
          );
        }
      }

      setSuccess({ creditsGranted: json.creditsGranted, autoEnabled });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Card setup failed");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-navy">Card saved</h2>
        <p className="text-sm text-slate-600 mt-1">
          {success.autoEnabled
            ? "Auto top-up is on. "
            : "Card on file. "}
          {success.creditsGranted > 0 && `+${success.creditsGranted} credits. `}
          Taking you back to onboarding…
        </p>
        {autoRechargeWarning && (
          <p className="mt-2 text-xs text-amber-800 leading-relaxed">
            {autoRechargeWarning}
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
    >
      <PaymentElement />
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 text-white font-semibold text-sm transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving card…
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            {mode === "auto"
              ? "Save card + turn on auto top-up"
              : "Save card (no charge today)"}
          </>
        )}
      </button>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Stored by Stripe under your Propertoasty Customer record.
      </p>
    </form>
  );
}
