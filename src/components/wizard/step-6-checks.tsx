"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  Landmark,
  Building2,
  Star,
  FileText,
  Loader2,
  Lock,
  Sparkles,
  Calendar,
  CheckCircle2,
  Search,
  Car,
  ShoppingCart,
  AlertCircle,
} from "lucide-react";
import {
  useWizard,
  clearPersistedWizard,
  trackStep,
} from "./context";
import { Button } from "@/components/ui/button";
import {
  availableChecksFor,
  checksForTier,
  type CheckId,
  type ReportTier,
} from "./types";

/** Pricing tiers — must match /api/wizard-checkout */
const PRICING = [
  { credits: 1 as const, price: "£2.50", note: null as string | null },
  { credits: 3 as const, price: "£5.00", note: "save £2.50" },
  { credits: 7 as const, price: "£10.00", note: "save £7.50" },
];

/** Mock preview content for each check — shown blurred to suggest the
 *  shape of the real report without leaking any data. */
const PREVIEW_CONTENT: Record<
  CheckId,
  { icon: typeof ShieldCheck; status: string; rows: string[] }
> = {
  cop: {
    icon: Landmark,
    status: "FULL MATCH",
    rows: [
      "Account holder name verified by Open Banking",
      "Sort code and account number active",
    ],
  },
  companies_house: {
    icon: Building2,
    status: "ACTIVE",
    rows: [
      "Acme Trading Limited \u2022 Company no. 12345678",
      "Incorporated 14 March 2018 \u2022 England & Wales",
    ],
  },
  vat: {
    icon: ShieldCheck,
    status: "REGISTERED",
    rows: [
      "GB123456789 \u2022 Acme Trading Limited",
      "VAT registered since 2019 \u2022 Active",
    ],
  },
  online_reviews: {
    icon: Star,
    status: "4.7 \u2605 (228)",
    rows: [
      "228 reviews on Trustpilot \u2022 87% 5-star",
      "Mostly positive \u2022 Quick service mentioned often",
    ],
  },
  dvla_vehicle_check: {
    icon: Car,
    status: "VERIFIED",
    rows: [
      "2019 Ford Focus \u2022 Petrol \u2022 1.0L",
      "Taxed \u2022 MOT valid until 2025",
    ],
  },
  vehicle_history: {
    icon: Search,
    status: "CLEAR",
    rows: [
      "No outstanding finance \u2022 Not recorded as stolen",
      "No write-off marker \u2022 No mileage discrepancy",
    ],
  },
  vehicle_valuation: {
    icon: Car,
    status: "FAIR PRICE",
    rows: [
      "Estimated value: \u00A39,200 \u2013 \u00A311,400",
      "Low mileage for year \u2022 Diesel discount applied",
    ],
  },
  marketplace_valuation: {
    icon: ShoppingCart,
    status: "FAIR PRICE",
    rows: [
      "Market value: \u00A3450 \u2013 \u00A3600 from UK comparables",
      "Listed at \u00A3500 \u2022 within expected range",
    ],
  },
};

export function Step6Checks() {
  const { state, setStep } = useWizard();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedPack, setSelectedPack] = useState<1 | 3 | 7>(3);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // All checks relevant to this payee + context
  const allChecks = useMemo(
    () =>
      availableChecksFor(
        state.payeeType,
        state.purchaseCategory,
        !!state.dvlaData,
        !!state.marketplaceScreenshot
      ),
    [
      state.payeeType,
      state.purchaseCategory,
      state.dvlaData,
      state.marketplaceScreenshot,
    ]
  );

  // Which tiers would actually add something to this payee's report?
  // We always offer tier 1. Higher tiers are only offered if they add new
  // non-coming-soon checks.
  const tier1Checks = useMemo(() => checksForTier(allChecks, 1), [allChecks]);
  const tier2Checks = useMemo(() => checksForTier(allChecks, 2), [allChecks]);
  const tier3Checks = useMemo(() => checksForTier(allChecks, 3), [allChecks]);
  const offerTier2 = tier2Checks.length > tier1Checks.length;
  const offerTier3 = tier3Checks.length > tier2Checks.length;

  const [selectedTier, setSelectedTier] = useState<ReportTier>(1);

  // If a tier becomes unavailable (context changed), clamp down
  useEffect(() => {
    if (selectedTier === 3 && !offerTier3) setSelectedTier(offerTier2 ? 2 : 1);
    if (selectedTier === 2 && !offerTier2) setSelectedTier(1);
  }, [offerTier2, offerTier3, selectedTier]);

  // Visible preview cards for the currently selected tier
  const visibleChecks = useMemo(
    () => checksForTier(allChecks, selectedTier),
    [allChecks, selectedTier]
  );

  const subjectName =
    state.companyName.trim() || state.payeeName.trim() || "this payee";

  // ── Auto-run triggers ───────────────────────────────────────────────
  // Two triggers, both require the user to be signed in with enough
  // credits for the currently selected tier:
  //   1. ?payment=success  — returning from Stripe
  //   2. ?auto=1           — "Continue & run check" from the dashboard
  useEffect(() => {
    const payment = searchParams.get("payment");
    const auto = searchParams.get("auto");
    const shouldAutoRun =
      (payment === "success" || auto === "1") &&
      state.isAuthenticated &&
      state.userCredits >= selectedTier;

    if (shouldAutoRun) {
      const url = new URL(window.location.href);
      url.searchParams.delete("payment");
      url.searchParams.delete("auto");
      window.history.replaceState({}, "", url.toString());
      runChecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Run verification ────────────────────────────────────────────────
  async function runChecks() {
    setSubmitting(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();

      let flowType = "manual";
      if (state.marketplaceSource) flowType = "marketplace";
      else if (state.hasInvoice === true) flowType = "invoice";
      formData.append("flowType", flowType);

      formData.append("payeeType", state.payeeType || "unsure");
      formData.append("payeeName", state.payeeName || state.companyName);
      formData.append("companyNameInput", state.companyName);
      formData.append("companyNumberInput", state.companyNumber);
      formData.append("vatNumberInput", state.vatNumber);
      formData.append("sortCode", state.sortCode);
      formData.append("accountNumber", state.accountNumber);
      formData.append("invoiceAmount", state.paymentAmount);
      formData.append("purchaseCategory", state.purchaseCategory || "");

      if (state.vehicleReg) formData.append("vehicleReg", state.vehicleReg);
      if (state.dvlaData)
        formData.append("dvlaData", JSON.stringify(state.dvlaData));
      if (state.vehicleMileage && state.vehicleMileage.trim())
        formData.append("vehicleMileage", state.vehicleMileage.trim());

      if (state.selectedProperty) {
        formData.append(
          "propertyData",
          JSON.stringify(state.selectedProperty)
        );
      }

      if (state.marketplaceSource) {
        formData.append("marketplaceSource", state.marketplaceSource);
        if (state.marketplaceSource === "other" && state.marketplaceOther)
          formData.append("marketplaceOther", state.marketplaceOther);
        if (state.marketplaceScreenshot)
          formData.append("marketplaceScreenshot", state.marketplaceScreenshot);
      }

      // Tier-filtered check list + credit cost
      formData.append(
        "selectedChecks",
        JSON.stringify(visibleChecks.map((c) => c.id))
      );
      formData.append("creditsToUse", String(selectedTier));

      if (state.invoiceFile) formData.append("file", state.invoiceFile);

      setProgress(30);

      // Anonymous users no longer reach this point — every check requires
      // an authenticated user with at least 1 credit.
      const res = await fetch("/api/verify-full", {
        method: "POST",
        body: formData,
      });

      setProgress(70);

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setProgress(100);
      trackStep(6, true, data.id);
      clearPersistedWizard();

      router.push(`/dashboard/results/${data.id}`);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  // ── Buy credits via Stripe ──────────────────────────────────────────
  async function buyCredits(credits: 1 | 3 | 7) {
    setCheckoutLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/wizard-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits,
          email: state.email?.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Couldn't start checkout");
        setCheckoutLoading(false);
        return;
      }
      if (data.url) window.location.href = data.url;
    } catch {
      setError("Couldn't start checkout. Please try again.");
      setCheckoutLoading(false);
    }
  }

  // Smooth progress while waiting
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 3));
    }, 400);
    return () => clearInterval(interval);
  }, [submitting]);

  if (submitting)
    return (
      <LoadingChecks progress={progress} steps={buildLoadingSteps(state)} />
    );

  // ── Auth state branches ────────────────────────────────────────────
  const hasEnoughCredits =
    state.isAuthenticated && state.userCredits >= selectedTier;
  const authedNoCredits =
    state.isAuthenticated && state.userCredits < selectedTier;
  const isAnon = !state.isAuthenticated;

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
          Your verification report
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {visibleChecks.length} check{visibleChecks.length === 1 ? "" : "s"} ready
          to run on{" "}
          <span className="font-semibold text-slate-900">{subjectName}</span>
        </p>
      </div>

      {/* ── Tier selector ────────────────────────────────────────── */}
      {(offerTier2 || offerTier3) && (
        <TierSelector
          selected={selectedTier}
          onSelect={setSelectedTier}
          tier1Count={tier1Checks.length}
          tier2Count={tier2Checks.length}
          tier3Count={tier3Checks.length}
          offerTier2={offerTier2}
          offerTier3={offerTier3}
        />
      )}

      {/* ── Paywall hero card ────────────────────────────────────── */}
      <div className="rounded-2xl border-2 border-coral/20 bg-gradient-to-br from-coral/5 to-coral/10 p-5 sm:p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-coral text-white">
            <Lock className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Unlock your report
            </h3>
            <p className="text-sm text-slate-600">
              {hasEnoughCredits
                ? `You have ${state.userCredits} credit${state.userCredits === 1 ? "" : "s"} \u2014 use ${selectedTier} to run all ${visibleChecks.length} checks.`
                : state.isAuthenticated
                  ? `This report costs ${selectedTier} credit${selectedTier === 1 ? "" : "s"}. You have ${state.userCredits}. Top up below.`
                  : "Pay once, no subscription."}
            </p>
          </div>
        </div>

        {/* State A: signed in with enough credits */}
        {hasEnoughCredits && (
          <Button
            onClick={runChecks}
            className="w-full h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg text-base shadow-sm"
          >
            <Sparkles className="size-4 mr-2" />
            Use {selectedTier} credit{selectedTier === 1 ? "" : "s"} to unlock
          </Button>
        )}

        {/* State B: signed in, 0 credits */}
        {authedNoCredits && (
          <BuyPanel
            selected={selectedPack}
            onSelect={setSelectedPack}
            onBuy={() => buyCredits(selectedPack)}
            loading={checkoutLoading}
          />
        )}

        {/* State C: not signed in — must create an account / sign in to buy */}
        {isAnon && (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Create a free account or sign in to buy your first check from
              &pound;2.50.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={() =>
                  router.push("/auth/login?tab=signup&redirect=/verify")
                }
                className="h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
              >
                Create account
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/auth/login?redirect=/verify")}
                className="h-12 border-coral/30 text-coral hover:bg-coral/5"
              >
                Sign in
              </Button>
            </div>
            <p className="text-xs text-slate-500 text-center pt-1">
              Account is free. You only pay when you run a check.
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
            <AlertCircle className="size-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
      </div>

      {/* ── Blurred preview report ─────────────────────────────── */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold px-1">
          What you&apos;ll see
        </p>
        {visibleChecks.map((check) => (
          <PreviewCard key={check.id} id={check.id} label={check.label} />
        ))}
      </div>

      {/* ── Back nav ───────────────────────────────────────────── */}
      <div className="flex items-center pt-2">
        <button
          type="button"
          onClick={() => setStep(5)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    </div>
  );
}

// ── Tier selector ───────────────────────────────────────────────────

function TierSelector({
  selected,
  onSelect,
  tier1Count,
  tier2Count,
  tier3Count,
  offerTier2,
  offerTier3,
}: {
  selected: ReportTier;
  onSelect: (t: ReportTier) => void;
  tier1Count: number;
  tier2Count: number;
  tier3Count: number;
  offerTier2: boolean;
  offerTier3: boolean;
}) {
  const tiers: {
    tier: ReportTier;
    label: string;
    description: string;
    count: number;
    show: boolean;
  }[] = [
    {
      tier: 1,
      label: "Essential",
      description: "API checks",
      count: tier1Count,
      show: true,
    },
    {
      tier: 2,
      label: "+ Valuation",
      description: "Vehicle / marketplace",
      count: tier2Count,
      show: offerTier2,
    },
    {
      tier: 3,
      label: "+ Reputation",
      description: "Seller reviews",
      count: tier3Count,
      show: offerTier3,
    },
  ];
  const visible = tiers.filter((t) => t.show);
  const gridCols =
    visible.length === 3
      ? "grid-cols-3"
      : visible.length === 2
        ? "grid-cols-2"
        : "grid-cols-1";

  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-slate-400 font-semibold px-1 mb-2">
        Choose your report
      </p>
      <div className={`grid ${gridCols} gap-2`}>
        {visible.map((t) => {
          const active = selected === t.tier;
          return (
            <button
              key={t.tier}
              type="button"
              onClick={() => onSelect(t.tier)}
              className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                active
                  ? "border-coral bg-coral/5 shadow-sm"
                  : "border-slate-200 bg-white hover:border-coral/40"
              }`}
            >
              <p className="text-sm font-semibold text-slate-900">{t.label}</p>
              <p className="text-[11px] text-slate-500">{t.description}</p>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-base font-bold text-coral">
                  {t.tier} credit{t.tier === 1 ? "" : "s"}
                </span>
                <span className="text-[11px] text-slate-400">
                  {"\u00B7"} {t.count} checks
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Buy 1/3/7 credits panel ─────────────────────────────────────────
function BuyPanel({
  selected,
  onSelect,
  onBuy,
  loading,
}: {
  selected: 1 | 3 | 7;
  onSelect: (n: 1 | 3 | 7) => void;
  onBuy: () => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {PRICING.map(({ credits, price, note }) => {
          const active = selected === credits;
          return (
            <button
              key={credits}
              type="button"
              onClick={() => onSelect(credits)}
              className={`rounded-xl border-2 p-3 text-center transition-all cursor-pointer ${
                active
                  ? "border-coral bg-white shadow-sm"
                  : "border-slate-200 bg-white/60 hover:border-coral/40"
              }`}
            >
              <p className="text-base sm:text-lg font-bold text-slate-900">
                {credits}
              </p>
              <p className="text-[11px] text-slate-500">
                check{credits === 1 ? "" : "s"}
              </p>
              <p className="text-sm font-semibold text-coral mt-1">{price}</p>
              {note && (
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                  {note}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Button
        onClick={onBuy}
        disabled={loading}
        className="w-full h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg text-base shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="size-4 mr-2 animate-spin" />
            Redirecting to checkout&hellip;
          </>
        ) : (
          <>
            <Lock className="size-4 mr-2" />
            Buy &amp; unlock
          </>
        )}
      </Button>
    </div>
  );
}

// ── Single preview row — compact, one-line with blurred teaser ────────
function PreviewCard({ id, label }: { id: CheckId; label: string }) {
  const preview = PREVIEW_CONTENT[id];
  const Icon = preview.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex items-center gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-coral/10 text-coral">
        <Icon className="size-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-900 truncate">
          {label}
        </p>
        <p
          className="text-xs text-slate-500 blur-[3.5px] select-none truncate"
          aria-hidden="true"
        >
          {preview.rows[0]}
        </p>
      </div>
      <Lock className="size-3.5 text-slate-400 shrink-0" />
    </div>
  );
}

// ── Loading state during verification ───────────────────────────────

type LoadingStep = {
  icon: typeof ShieldCheck;
  label: string;
  delay: number;
};

/**
 * Build the loading animation steps that actually correspond to the checks
 * the server will run for this payee. Mirrors the branching in
 * runVerification.ts so we don't show "Validating VAT…" when no VAT number
 * was entered, etc.
 */
function buildLoadingSteps(state: {
  payeeType: "business" | "person" | "unsure" | null;
  purchaseCategory: string | null;
  companyName: string;
  companyNumber: string;
  vatNumber: string;
  sortCode: string;
  accountNumber: string;
  dvlaData: unknown;
  marketplaceScreenshot: unknown;
}): LoadingStep[] {
  const out: LoadingStep[] = [];
  let delay = 0;
  const push = (icon: typeof ShieldCheck, label: string) => {
    out.push({ icon, label, delay });
    delay += 1500;
  };

  const isBusiness =
    state.payeeType === "business" ||
    state.companyNumber.trim().length > 0 ||
    state.vatNumber.trim().length > 0;

  const sort = state.sortCode.replace(/\D/g, "");
  const acc = state.accountNumber.replace(/\D/g, "");

  // CoP — runs whenever bank details are present (nearly always)
  if (sort.length === 6 && acc.length === 8) {
    push(Landmark, "Verifying bank account\u2026");
  }

  // Business-only checks
  if (isBusiness && state.companyNumber.trim()) {
    push(Building2, "Checking Companies House\u2026");
  }
  if (isBusiness && state.vatNumber.trim()) {
    push(FileText, "Validating VAT with HMRC\u2026");
  }
  if (isBusiness && state.companyName.trim()) {
    push(Star, "Checking seller reviews\u2026");
  }

  // Vehicle info — DVLA data was captured up front, this just represents
  // it being folded into the final report
  const hasVehicle = state.purchaseCategory === "vehicle" && state.dvlaData;
  if (hasVehicle) {
    push(Car, "Checking vehicle information\u2026");
  }

  // AI valuation — covers vehicle (DVLA → Claude) and/or marketplace
  // (screenshot → Claude vision + web search)
  const hasMarketplace = !!state.marketplaceScreenshot;
  if (hasVehicle || hasMarketplace) {
    push(Sparkles, "Compiling AI valuation\u2026");
  }

  // Final compile step — always last
  push(ShieldCheck, "Compiling your report\u2026");

  return out;
}

function LoadingChecks({
  progress,
  steps,
}: {
  progress: number;
  steps: LoadingStep[];
}) {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setVisibleSteps(i + 1), steps[i].delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [steps]);

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-col items-center gap-2">
        <div className="relative">
          <ShieldCheck className="h-12 w-12 text-coral" />
          <Loader2 className="absolute -top-1 -right-1 h-5 w-5 text-coral animate-spin" />
        </div>
        <p className="text-base font-semibold text-slate-900 mt-1">
          Running your checks
        </p>
        <p className="text-sm text-slate-500">This usually takes 10-15 seconds</p>
      </div>

      <div className="space-y-2.5">
        {steps.map((step, i) => {
          const visible = i < visibleSteps;
          const active = i === visibleSteps - 1;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-500 ${
                visible
                  ? active
                    ? "bg-coral/5 border border-coral/20"
                    : "bg-emerald-50 border border-emerald-200"
                  : "bg-slate-50 border border-transparent opacity-40"
              }`}
            >
              <step.icon
                className={`size-4.5 shrink-0 ${
                  visible
                    ? active
                      ? "text-coral animate-pulse"
                      : "text-emerald-600"
                    : "text-slate-300"
                }`}
              />
              <span
                className={`text-sm font-medium ${
                  visible
                    ? active
                      ? "text-slate-900"
                      : "text-emerald-700"
                    : "text-slate-400"
                }`}
              >
                {!active && visible
                  ? step.label.replace("\u2026", " \u2713")
                  : step.label}
              </span>
              {active && (
                <Loader2 className="size-3.5 text-coral animate-spin ml-auto" />
              )}
            </div>
          );
        })}
      </div>

      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-coral h-2 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
