"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Info,
  CreditCard,
  Banknote,
} from "lucide-react";

type PaymentData = {
  verificationId: string;
  amount: number | null;
  payeeName: string;
  sortCode: string;
  accountNumber: string;
  reference: string;
  overallRisk: string | null;
  sandboxMode: boolean;
};

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `\u00A3${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export function PaymentButton({ data }: { data: PaymentData }) {
  const [open, setOpen] = useState(false);
  const risk = data.overallRisk ?? "UNKNOWN";
  const amount = data.amount;
  const hasPaymentData =
    amount != null && data.payeeName && data.sortCode && data.accountNumber;

  if (!hasPaymentData) return null;

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={`h-12 px-6 text-[15px] font-bold rounded-xl transition-all ${
          risk === "HIGH"
            ? "bg-fail/20 border border-fail/30 text-fail cursor-not-allowed opacity-70"
            : "bg-coral hover:bg-coral-dark text-white hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)]"
        }`}
        disabled={risk === "HIGH"}
      >
        <Banknote className="size-5 mr-2" />
        {risk === "HIGH"
          ? "Payment not recommended"
          : `Pay ${fmt(amount)} with Pay by Bank`}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[480px] bg-navy-card border-white/10">
          <PaymentModalContent data={data} onClose={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}

function PaymentModalContent({
  data,
  onClose,
}: {
  data: PaymentData;
  onClose: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarningConfirm, setShowWarningConfirm] = useState(false);

  const risk = data.overallRisk ?? "UNKNOWN";
  const amount = data.amount;

  const formatSortCode = (sc: string) => {
    const clean = sc.replace(/[-\s]/g, "");
    if (clean.length === 6) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
    }
    return sc;
  };

  async function initiatePayment() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          verificationId: data.verificationId,
          amount: data.amount,
          payeeName: data.payeeName,
          sortCode: data.sortCode,
          accountNumber: data.accountNumber,
          reference: data.reference,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        if (result.error === "INSUFFICIENT_CREDITS") {
          setError(
            "You don't have enough credits to send this payment. Top up your credits to continue."
          );
        } else {
          setError(result.error || "Payment initiation failed");
        }
        setLoading(false);
        return;
      }

      if (result.authUrl) {
        router.push(result.authUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handlePayClick() {
    if (risk === "MEDIUM" && !showWarningConfirm) {
      setShowWarningConfirm(true);
    } else {
      initiatePayment();
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className="flex size-10 items-center justify-center rounded-full bg-coral/10">
          <CreditCard className="size-5 text-coral" />
        </div>
        <div>
          <DialogTitle className="text-white">Payment summary</DialogTitle>
          <DialogDescription className="text-brand-muted-light mt-0.5">
            Review details before proceeding
          </DialogDescription>
        </div>
      </div>

      {data.sandboxMode && (
        <div className="rounded-xl bg-warn/[0.08] border border-warn/20 px-4 py-2 text-sm text-warn mb-4">
          <span className="font-medium">&#9888; Payment sandbox</span> — OBConnect not connected
        </div>
      )}

      <div className="divide-y divide-white/[0.06] text-sm">
        <div className="flex justify-between py-3">
          <span className="text-brand-muted-light">Paying</span>
          <span className="font-medium text-white">{data.payeeName}</span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-brand-muted-light">Amount</span>
          <span className="font-mono font-semibold text-white text-base">
            {fmt(amount)}
          </span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-brand-muted-light">Sort Code</span>
          <span className="font-mono text-white">{formatSortCode(data.sortCode)}</span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-brand-muted-light">Account</span>
          <span className="font-mono text-white">{data.accountNumber}</span>
        </div>
        <div className="flex justify-between py-3">
          <span className="text-brand-muted-light">Reference</span>
          <span className="font-mono text-xs text-white">{data.reference}</span>
        </div>
      </div>

      <Separator className="my-4 bg-white/[0.06]" />

      <div className="flex items-start gap-2 text-xs text-brand-muted-light mb-4">
        <Info className="size-3.5 mt-0.5 shrink-0" />
        <span>This payment will use 1 credit</span>
      </div>

      {error && (
        <div className="rounded-xl bg-fail/10 border border-fail/20 px-3 py-2 text-sm text-fail mb-4">
          {error}
          {error.includes("credits") && (
            <a href="/dashboard" className="ml-1 underline underline-offset-2">
              Buy credits
            </a>
          )}
        </div>
      )}

      {showWarningConfirm && risk === "MEDIUM" && (
        <div className="rounded-xl bg-warn/[0.08] border border-warn/20 p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="size-4 text-warn" />
            <span className="text-sm font-semibold text-warn">Proceed with caution</span>
          </div>
          <p className="text-xs text-brand-muted-light">
            One or more verification checks returned a warning. Are you sure you want to proceed?
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <DialogClose
          render={
            <Button
              variant="outline"
              className="flex-1 h-12 text-[15px] font-bold rounded-xl border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.07]"
            >
              Cancel
            </Button>
          }
        />
        {risk === "HIGH" ? (
          <Button
            disabled
            className="flex-1 h-12 text-[15px] font-bold rounded-xl bg-fail/20 text-fail opacity-60 cursor-not-allowed"
          >
            <ShieldX className="size-5 mr-2" />
            Not Recommended
          </Button>
        ) : risk === "MEDIUM" ? (
          <Button
            onClick={handlePayClick}
            disabled={loading}
            className="flex-1 h-12 text-[15px] font-bold rounded-xl bg-warn hover:bg-warn/90 text-navy"
          >
            {loading ? (
              <Loader2 className="size-5 mr-2 animate-spin" />
            ) : (
              <ShieldAlert className="size-5 mr-2" />
            )}
            {loading ? "Initiating..." : showWarningConfirm ? "Confirm Payment" : "Pay with Caution"}
          </Button>
        ) : (
          <Button
            onClick={handlePayClick}
            disabled={loading}
            className="flex-1 h-12 text-[15px] font-bold rounded-xl bg-coral hover:bg-coral-dark text-white hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)]"
          >
            {loading ? (
              <Loader2 className="size-5 mr-2 animate-spin" />
            ) : (
              <ShieldCheck className="size-5 mr-2" />
            )}
            {loading ? "Initiating..." : "Confirm Payment"}
          </Button>
        )}
      </div>
    </div>
  );
}

// Keep old export for backwards compat if used elsewhere
export function PaymentSection({ data }: { data: PaymentData }) {
  return (
    <div className="mt-6">
      <PaymentButton data={data} />
    </div>
  );
}
