"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Lock, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "wap_wizard_state";
const TTL_MS = 24 * 60 * 60 * 1000;

type PendingWizard = {
  wizard: {
    payeeType?: string | null;
    purchaseCategory?: string | null;
    companyName?: string;
    payeeName?: string;
    sortCode?: string;
    accountNumber?: string;
    vehicleReg?: string;
    propertyPostcode?: string;
  };
  step?: number | string;
  savedAt?: number;
};

/**
 * If the user started a wizard journey but didn't complete it (e.g. signed
 * up and was redirected to the dashboard before paying), show a card that
 * lets them resume from where they left off.
 */
export function PendingCheckCard({ credits }: { credits: number }) {
  const [pending, setPending] = useState<PendingWizard | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as PendingWizard;

      // TTL check — match the wizard context
      if (parsed.savedAt && Date.now() - parsed.savedAt > TTL_MS) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Show the card if the user has ANY real progress — past the
      // payee-type step, or any substantive field filled in.
      const w = parsed.wizard ?? {};
      const stepNum =
        typeof parsed.step === "number" ? parsed.step : parseInt(String(parsed.step ?? 1), 10) || 1;
      const hasProgress =
        stepNum >= 2 ||
        !!w.payeeType ||
        !!w.purchaseCategory ||
        !!w.companyName?.trim() ||
        !!w.payeeName?.trim() ||
        !!w.sortCode?.trim() ||
        !!w.accountNumber?.trim() ||
        !!w.vehicleReg?.trim() ||
        !!w.propertyPostcode?.trim();
      if (hasProgress) {
        setPending(parsed);
      }
    } catch {
      /* ignore parse / storage errors */
    }
  }, []);

  if (!pending) return null;

  const w = pending.wizard;
  const name =
    w.companyName?.trim() ||
    w.payeeName?.trim() ||
    w.vehicleReg?.trim() ||
    w.propertyPostcode?.trim() ||
    "an in-progress check";

  const stepNum =
    typeof pending.step === "number"
      ? pending.step
      : parseInt(String(pending.step ?? 1), 10) || 1;
  const atFinalStep = stepNum >= 6;

  function dismiss() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPending(null);
  }

  // /verify?auto=1 triggers an auto-run on step 6 IF the user has credits.
  // For earlier steps the auto param is harmless — they just land where
  // they left off and carry on filling in.
  const continueHref = "/verify?auto=1";

  const cta = atFinalStep && credits > 0 ? "Continue & run check" : "Pick up where you left off";
  const subCopy = atFinalStep
    ? credits > 0
      ? "You\u2019ve already entered the details. Continue and we\u2019ll use 1 credit to run the report."
      : "You\u2019ve already entered the details. Buy credits to unlock your report."
    : "You started a check but didn\u2019t finish it. Carry on from where you left off.";

  return (
    <div className="mt-6 rounded-2xl border-2 border-coral/30 bg-gradient-to-br from-coral/5 to-coral/10 p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="size-10 rounded-lg bg-coral text-white flex items-center justify-center shrink-0">
          <Lock className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-coral font-bold">
            Pending check
          </p>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 truncate">
            {name}
          </h3>
          <p className="text-sm text-slate-600 mt-1">{subCopy}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Button
              className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold rounded-lg shadow-sm"
              render={<Link href={continueHref} />}
            >
              {cta}
              <ArrowRight className="size-4 ml-2" />
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm text-slate-500 hover:text-slate-700 inline-flex items-center gap-1"
            >
              <X className="size-3" />
              Discard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
