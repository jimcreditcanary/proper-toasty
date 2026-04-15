"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  ArrowLeft,
  ArrowRight,
  Landmark,
  Building2,
  Star,
  FileText,
  Loader2,
  Check,
  Sparkles,
} from "lucide-react";
import {
  useWizard,
  clearPersistedWizard,
  trackStep,
} from "./context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { availableChecksFor, type CheckId } from "./types";

export function Step6Checks() {
  const { state, update, setStep } = useWizard();
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(
    () => availableChecksFor(state.payeeType, state.purchaseCategory),
    [state.payeeType, state.purchaseCategory]
  );

  // Pre-select all default-on checks the first time we land here
  useEffect(() => {
    if (state.selectedChecks.length === 0) {
      const defaults = checks.filter((c) => c.defaultOn && !c.comingSoon).map((c) => c.id);
      update({ selectedChecks: defaults });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleCheck(id: CheckId) {
    const current = new Set(state.selectedChecks);
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    update({ selectedChecks: Array.from(current) });
  }

  const selectedCount = state.selectedChecks.length;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email.trim());
  const canSubmit =
    selectedCount > 0 && (state.isAuthenticated || emailValid) && !submitting;

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    setProgress(10);

    try {
      const formData = new FormData();

      // Flow type
      let flowType = "manual";
      if (state.marketplaceSource) {
        flowType = "marketplace";
      } else if (state.hasInvoice === true) {
        flowType = "invoice";
      }
      formData.append("flowType", flowType);

      // Payee + category
      formData.append("payeeType", state.payeeType || "unsure");
      formData.append("payeeName", state.payeeName || state.companyName);
      formData.append("companyNameInput", state.companyName);
      formData.append("companyNumberInput", state.companyNumber);
      formData.append("vatNumberInput", state.vatNumber);
      formData.append("sortCode", state.sortCode);
      formData.append("accountNumber", state.accountNumber);
      formData.append("invoiceAmount", state.paymentAmount);
      formData.append("purchaseCategory", state.purchaseCategory || "");

      // Vehicle
      if (state.vehicleReg) {
        formData.append("vehicleReg", state.vehicleReg);
      }
      if (state.dvlaData) {
        formData.append("dvlaData", JSON.stringify(state.dvlaData));
      }

      // Marketplace
      if (state.marketplaceSource) {
        formData.append("marketplaceSource", state.marketplaceSource);
        if (state.marketplaceSource === "other" && state.marketplaceOther) {
          formData.append("marketplaceOther", state.marketplaceOther);
        }
        if (state.marketplaceScreenshot) {
          formData.append("marketplaceScreenshot", state.marketplaceScreenshot);
        }
      }

      // Selected checks
      formData.append("selectedChecks", JSON.stringify(state.selectedChecks));

      // Invoice file
      if (state.invoiceFile) {
        formData.append("file", state.invoiceFile);
      }

      // Email for leads
      if (!state.isAuthenticated && state.email) {
        formData.append("email", state.email.trim());
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
      trackStep(6, true, data.id);
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

  // Smooth progress bar while waiting
  useEffect(() => {
    if (!submitting) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        return p + Math.random() * 3;
      });
    }, 400);
    return () => clearInterval(interval);
  }, [submitting]);

  if (submitting) {
    return <LoadingChecks progress={progress} />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900">
        Choose your checks
      </h2>
      <p className="text-sm text-slate-500">
        Every check runs at enhanced level. Pick what&apos;s relevant to your
        payment.
      </p>

      {/* Check cards */}
      <div className="space-y-2">
        {checks.map((check) => {
          const selected = state.selectedChecks.includes(check.id);
          const disabled = check.comingSoon;

          return (
            <button
              key={check.id}
              type="button"
              onClick={() => !disabled && toggleCheck(check.id)}
              disabled={disabled}
              className={`w-full rounded-xl border-2 p-4 flex items-start gap-3 text-left transition-colors ${
                disabled
                  ? "border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed"
                  : selected
                    ? "border-coral bg-coral/5 cursor-pointer"
                    : "border-slate-200 hover:border-coral/40 cursor-pointer"
              }`}
            >
              <div
                className={`flex size-6 shrink-0 items-center justify-center rounded-md border-2 mt-0.5 ${
                  selected
                    ? "border-coral bg-coral text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-slate-900">
                    {check.label}
                  </p>
                  {check.comingSoon && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold px-2 py-0.5">
                      Coming soon
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {check.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Email capture for lead flow */}
      {!state.isAuthenticated && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <Label
            htmlFor="lead-email"
            className="block text-sm font-medium text-slate-700"
          >
            Where should we send your results?
          </Label>
          <Input
            id="lead-email"
            type="email"
            value={state.email}
            onChange={(e) => update({ email: e.target.value })}
            placeholder="your@email.com"
            className="h-10 bg-white border-slate-300"
            required
          />
          <p className="text-xs text-slate-500">
            First check is free. We&apos;ll email you the full report.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => setStep(5)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="bg-coral hover:bg-coral-dark text-white font-semibold h-11 px-5"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Run {selectedCount} check{selectedCount === 1 ? "" : "s"}
          <ArrowRight className="h-4 w-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

const CHECK_STEPS = [
  { icon: Landmark, label: "Verifying bank account\u2026", delay: 0 },
  { icon: Building2, label: "Checking Companies House\u2026", delay: 1500 },
  { icon: FileText, label: "Validating VAT with HMRC\u2026", delay: 3000 },
  { icon: Star, label: "Searching online reviews\u2026", delay: 4500 },
  { icon: ShieldCheck, label: "Compiling your report\u2026", delay: 6000 },
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
