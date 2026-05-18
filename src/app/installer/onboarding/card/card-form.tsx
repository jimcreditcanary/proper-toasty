"use client";

// Stripe Elements SetupIntent flow — collects a PaymentMethod
// WITHOUT charging. Two server round-trips:
//   1. POST /api/installer/onboarding/card/setup-intent — creates
//      SetupIntent + returns client_secret
//   2. POST /api/installer/onboarding/card/confirm — after browser
//      confirms with Stripe Elements; we verify + stamp + grant
//
// Loading: we wait for the user to click Connect Card before
// creating the intent. Pre-creating on page mount would spam
// Stripe with abandoned intents (5,500 installers × even 30%
// abandon = 1650 wasted intents/wave).

import { useEffect, useState } from "react";
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
} from "lucide-react";

interface Props {
  publishableKey: string;
}

export function CardSetupForm({ publishableKey }: Props) {
  // loadStripe is async + cached; resolves once per page.
  const [stripePromise] = useState<Promise<Stripe | null>>(() =>
    loadStripe(publishableKey),
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [intentLoading, setIntentLoading] = useState(false);

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
              fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
          },
        }}
      >
        <CardFormInner />
      </Elements>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      <p className="text-sm text-slate-700 mb-5 leading-relaxed">
        Click below + we&rsquo;ll open Stripe&rsquo;s secure card form.
        Card details go straight to Stripe — we never touch them.
      </p>
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
            Connect a card
          </>
        )}
      </button>
    </div>
  );
}

function CardFormInner() {
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

      // Server-side confirm + grant.
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
        <h2 className="text-base font-semibold text-navy">Card saved</h2>
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
            Save card (no charge today)
          </>
        )}
      </button>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        Stored by Stripe under your Propertoasty Customer record.
        Used only when you opt into auto top-up or manually top up
        from the credits portal.
      </p>
    </form>
  );
}
