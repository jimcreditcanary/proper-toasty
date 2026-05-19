"use client";

// Stripe Elements SetupIntent flow with auto-recharge mode picker.
//
// Three modes the installer can pick BEFORE collecting the card
// (matches the Twilio pattern from spec F):
//
//   auto    — "When my balance drops below X credits, charge £Y"
//             Saves card + enables auto-recharge in one step.
//
//   manual  — Save card, never auto-charge. The user tops up by
//             clicking Buy more credits on the credits page.
//
// "Skip" (no card) is handled by the parent onboarding page — the
// user just clicks Back without engaging this form, so it's not a
// mode we render inline.
//
// Server round-trips:
//   1. POST /api/installer/onboarding/card/setup-intent — creates
//      SetupIntent + returns client_secret.
//   2. POST /api/installer/onboarding/card/confirm — after browser
//      confirms with Stripe Elements. The confirm body now carries
//      the chosen mode + threshold + pack so the server persists
//      everything in a single round-trip.
//
// Why we wait for click before creating the intent: pre-creating
// on mount would spam Stripe with abandoned intents at directory-
// import scale (5,500 installers × 30% abandon = 1,650 wasted).

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
  Sparkles,
  Lock,
} from "lucide-react";
import { CREDIT_PACKS, formatGbp } from "@/lib/billing/credit-packs";

interface Props {
  publishableKey: string;
}

type Mode = "auto" | "manual";
type PackId = "starter" | "growth" | "scale" | "volume";

const THRESHOLD_OPTIONS: readonly number[] = [5, 10, 25, 50];
const DEFAULT_THRESHOLD = 10;
const DEFAULT_PACK_ID: PackId = "growth";

export function CardSetupForm({ publishableKey }: Props) {
  // loadStripe is async + cached; resolves once per page.
  const [stripePromise] = useState<Promise<Stripe | null>>(() =>
    loadStripe(publishableKey),
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);

  // Mode picker state — selected BEFORE the SetupIntent is created
  // so the user knows exactly what's about to happen.
  const [mode, setMode] = useState<Mode>("auto");
  const [packId, setPackId] = useState<PackId>(DEFAULT_PACK_ID);
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);

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
          thresholdCredits={threshold}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-5">
      <ModePicker
        mode={mode}
        onModeChange={setMode}
        packId={packId}
        onPackChange={setPackId}
        threshold={threshold}
        onThresholdChange={setThreshold}
      />

      <TrustPanel mode={mode} threshold={threshold} packId={packId} />

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        {intentError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{intentError}</span>
          </div>
        )}
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
              Continue to card details
            </>
          )}
        </button>
        <p className="mt-3 text-[11px] text-slate-500 text-center leading-relaxed">
          <Lock className="w-3 h-3 inline-block mr-1 -mt-0.5" />
          Card details go straight to Stripe — Proper Toasty never
          sees the full number.
        </p>
      </div>
    </div>
  );
}

// ─── Mode picker ───────────────────────────────────────────────────

function ModePicker({
  mode,
  onModeChange,
  packId,
  onPackChange,
  threshold,
  onThresholdChange,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  packId: PackId;
  onPackChange: (p: PackId) => void;
  threshold: number;
  onThresholdChange: (t: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
        How should we handle top-ups?
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        <ModeCard
          active={mode === "auto"}
          onClick={() => onModeChange("auto")}
          title="Auto-recharge"
          subtitle="Never run out mid-week. Top up on a rule."
          highlight
        />
        <ModeCard
          active={mode === "manual"}
          onClick={() => onModeChange("manual")}
          title="Manual only"
          subtitle="Save the card, top up when you want."
        />
      </div>

      {mode === "auto" && (
        <div className="rounded-xl border border-coral/30 bg-coral-pale/30 p-4 sm:p-5">
          <div className="space-y-4">
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
                onChange={(e) => onThresholdChange(Number(e.target.value))}
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
                onChange={(e) => onPackChange(e.target.value as PackId)}
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
          </div>
        </div>
      )}
    </div>
  );
}

function ModeCard({
  active,
  onClick,
  title,
  subtitle,
  highlight,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  subtitle: string;
  highlight?: boolean;
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
        {highlight && !active && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-coral text-white">
            Recommended
          </span>
        )}
        {active && (
          <CheckCircle2 className="w-4 h-4 text-coral shrink-0" />
        )}
      </div>
      <p className="text-xs text-slate-600 leading-relaxed">{subtitle}</p>
    </button>
  );
}

// ─── Trust + plain-English summary ─────────────────────────────────

function TrustPanel({
  mode,
  threshold,
  packId,
}: {
  mode: Mode;
  threshold: number;
  packId: PackId;
}) {
  const pack = useMemo(
    () => CREDIT_PACKS.find((p) => p.id === packId),
    [packId],
  );

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 leading-relaxed space-y-1.5">
      <p className="flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          Card stored by <strong>Stripe</strong> — Proper Toasty
          never sees the full card details.
        </span>
      </p>
      <p className="flex items-start gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          <strong>No charge today.</strong> Future charges only
          happen when YOU set a rule.
        </span>
      </p>
      <p className="flex items-start gap-2 pt-1 border-t border-emerald-200/60 mt-1">
        <Sparkles className="w-3.5 h-3.5 mt-0.5 shrink-0" />
        <span>
          {mode === "auto" && pack ? (
            <>
              <strong>What you&rsquo;re setting up:</strong> when
              your balance drops below {threshold} credit
              {threshold === 1 ? "" : "s"}, we&rsquo;ll charge{" "}
              <strong>{formatGbp(pack.pricePence)}</strong> for{" "}
              <strong>{pack.credits} more credits</strong> ({pack.label}).
            </>
          ) : (
            <>
              <strong>What you&rsquo;re setting up:</strong> we
              save your card for one-click top-ups. We
              won&rsquo;t auto-charge anything.
            </>
          )}
        </span>
      </p>
      <p className="text-[10px] text-emerald-800/80 pt-1">
        Change any time at{" "}
        <a
          href="/installer/billing/auto-recharge"
          className="underline"
        >
          /installer/billing/auto-recharge
        </a>
        .
      </p>
    </div>
  );
}

// ─── Stripe Elements form ──────────────────────────────────────────

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
  const [success, setSuccess] = useState<{ creditsGranted: number } | null>(
    null,
  );

  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => {
      router.push("/installer/onboarding");
      router.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [success, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: stripeError, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/installer/onboarding/card`,
        },
        // Don't redirect — handle the confirmation result in-page so
        // we can fire the /confirm endpoint without losing browser
        // state.
        redirect: "if_required",
      });
      if (stripeError) {
        throw new Error(stripeError.message ?? "Stripe declined the card");
      }
      if (!setupIntent || setupIntent.status !== "succeeded") {
        throw new Error(`SetupIntent ended in status ${setupIntent?.status}`);
      }

      // Server-side confirm + grant + persist auto-recharge choice.
      const autoRecharge =
        mode === "auto"
          ? { mode: "auto" as const, packId, thresholdCredits }
          : { mode: "manual" as const };

      const res = await fetch("/api/installer/onboarding/card/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupIntentId: setupIntent.id,
          autoRecharge,
        }),
      });
      const json = (await res.json()) as
        | { ok: true; creditsGranted: number }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Confirm failed");
      }
      setSuccess({ creditsGranted: json.creditsGranted });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Card setup failed");
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-6 text-center">
        <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
        <h2 className="text-base font-semibold text-navy">
          {mode === "auto" ? "Auto-recharge on" : "Card saved"}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {success.creditsGranted > 0
            ? `+${success.creditsGranted} credits landed.`
            : "Card saved."}{" "}
          Taking you back to onboarding…
        </p>
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
              ? "Save card & enable auto-recharge"
              : "Save card (no charge today)"}
          </>
        )}
      </button>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Stored by Stripe under your Proper Toasty Customer record.
        Change auto-recharge rules any time at{" "}
        <a
          href="/installer/billing/auto-recharge"
          className="text-coral hover:text-coral-dark underline"
        >
          /installer/billing/auto-recharge
        </a>
        .
      </p>
    </form>
  );
}
