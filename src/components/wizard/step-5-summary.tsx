"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowLeft, ArrowRight, Landmark, Building2, Star, FileText, Loader2 } from "lucide-react";
import { useWizard, clearPersistedWizard, trackStep } from "./context";
import { Button } from "@/components/ui/button";
import type { PurchaseCategory } from "./types";

const CATEGORY_LABELS: Record<PurchaseCategory, string> = {
  vehicle: "Vehicle",
  property: "Property",
  investment: "Investment",
  building_work: "Building work",
  services: "Paying for services",
  other: "Something else",
};

function maskSortCode(sc: string): string {
  const digits = sc.replace(/\D/g, "");
  if (digits.length < 2) return sc;
  return `**-**-${digits.slice(-2)}`;
}

function maskAccountNumber(an: string): string {
  const digits = an.replace(/\D/g, "");
  if (digits.length < 4) return an;
  return `****${digits.slice(-4)}`;
}

export function Step5Summary() {
  const { state, setStep } = useWizard();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const payeeTypeLabel =
    state.payeeType === "business"
      ? "Business"
      : state.payeeType === "person"
        ? "Person"
        : "I don't know";

  const displayName = state.companyName || state.payeeName || "-";

  const categoryLabel = state.purchaseCategory
    ? CATEGORY_LABELS[state.purchaseCategory]
    : "-";

  const checkTypeLabel =
    state.checkTier === "enhanced" ? "Enhanced" : "Basic (Free)";

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();

      // Determine flow type
      let flowType = "manual";
      if (state.isMarketplace === true) {
        flowType = "marketplace";
      } else if (state.hasInvoice === true) {
        flowType = "invoice";
      }
      formData.append("flowType", flowType);

      // Core fields
      formData.append("payeeType", state.payeeType || "unknown");
      formData.append("payeeName", state.payeeName || state.companyName);
      formData.append("companyNameInput", state.companyName);
      formData.append("companyNumberInput", state.companyNumber);
      formData.append("vatNumberInput", state.vatNumber);
      formData.append("sortCode", state.sortCode);
      formData.append("accountNumber", state.accountNumber);
      formData.append("invoiceAmount", state.paymentAmount);
      formData.append("purchaseCategory", state.purchaseCategory || "");
      formData.append("checkTier", state.checkTier || "basic");

      // Marketplace fields
      if (state.marketplaceResult) {
        formData.append("marketplaceItemTitle", state.marketplaceResult.itemTitle);
        formData.append(
          "marketplaceListedPrice",
          state.marketplaceResult.listedPrice?.toString() || ""
        );
        formData.append(
          "valuationMin",
          state.marketplaceResult.valuationMin.toString()
        );
        formData.append(
          "valuationMax",
          state.marketplaceResult.valuationMax.toString()
        );
        formData.append("valuationSummary", state.marketplaceResult.valuationSummary);
      }
      if (state.marketplaceUrl) {
        formData.append("marketplaceUrl", state.marketplaceUrl);
      }

      // Invoice file
      if (state.invoiceFile) {
        formData.append("file", state.invoiceFile);
      }

      // Email for unauthenticated
      if (!state.isAuthenticated && state.email) {
        formData.append("email", state.email);
      }

      setProgress(30);

      const endpoint = state.isAuthenticated
        ? "/api/verify-full"
        : "/api/verify-lead";

      const res = await fetch(endpoint, {
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
      trackStep(5, true, data.id);
      clearPersistedWizard();

      const resultPath = state.isAuthenticated
        ? `/dashboard/results/${data.id}`
        : `/results/${data.id}`;

      router.push(resultPath);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setSubmitting(false);
    }
  }

  const rows: { label: string; value: string }[] = [
    { label: "Payee type", value: payeeTypeLabel },
    { label: "Name", value: displayName },
    { label: "Sort code", value: maskSortCode(state.sortCode) },
    { label: "Account number", value: maskAccountNumber(state.accountNumber) },
  ];

  if (state.paymentAmount) {
    rows.push({
      label: "Payment amount",
      value: `\u00A3${parseFloat(state.paymentAmount).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    });
  }

  rows.push({ label: "Buying", value: categoryLabel });

  if (state.isMarketplace !== null) {
    rows.push({
      label: "Facebook Marketplace",
      value: state.isMarketplace ? "Yes" : "No",
    });
    if (state.isMarketplace && state.marketplaceResult) {
      rows.push({
        label: "Item",
        value: state.marketplaceResult.itemTitle,
      });
      if (state.marketplaceResult.listedPrice !== null) {
        rows.push({
          label: "Listed price",
          value: `\u00A3${state.marketplaceResult.listedPrice.toFixed(2)}`,
        });
      }
    }
  }

  rows.push({ label: "Check type", value: checkTypeLabel });

  // Smoother progress: tick up gradually while waiting
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p; // Don't go past 90 until real completion
        return p + Math.random() * 3;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [submitting]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        Review &amp; submit
      </h2>

      {/* Summary card */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-3">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-slate-500">{label}</span>
            <span className="text-slate-900 font-medium text-right">
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submitting state */}
      {submitting ? (
        <LoadingChecks progress={progress} />
      ) : (
        <>
          {/* CTA */}
          <Button
            onClick={handleSubmit}
            className="w-full h-12 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg"
          >
            Run Checks
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          {/* Back */}
          <div className="flex items-center">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const CHECK_STEPS = [
  { icon: Landmark, label: "Verifying bank account...", delay: 0 },
  { icon: Building2, label: "Checking Companies House...", delay: 1500 },
  { icon: FileText, label: "Validating VAT with HMRC...", delay: 3000 },
  { icon: Star, label: "Searching online reviews...", delay: 4500 },
  { icon: ShieldCheck, label: "Compiling your report...", delay: 6000 },
];

function LoadingChecks({ progress }: { progress: number }) {
  const [visibleSteps, setVisibleSteps] = useState(0);

  useEffect(() => {
    const timers = CHECK_STEPS.map((_, i) =>
      setTimeout(() => setVisibleSteps(i + 1), CHECK_STEPS[i].delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

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
        {CHECK_STEPS.map((step, i) => {
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
              <step.icon className={`size-4.5 shrink-0 ${
                visible
                  ? active
                    ? "text-coral animate-pulse"
                    : "text-emerald-600"
                  : "text-slate-300"
              }`} />
              <span className={`text-sm font-medium ${
                visible
                  ? active ? "text-slate-900" : "text-emerald-700"
                  : "text-slate-400"
              }`}>
                {!active && visible ? step.label.replace("...", " ✓") : step.label}
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
