"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogOverlay,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Info,
  CreditCard,
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

export function PaymentSection({ data }: { data: PaymentData }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarningDialog, setShowWarningDialog] = useState(false);

  const risk = data.overallRisk ?? "UNKNOWN";
  const amount = data.amount;
  const hasPaymentData =
    amount != null && data.payeeName && data.sortCode && data.accountNumber;

  async function initiatePayment() {
    if (!hasPaymentData) return;
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

      // Redirect to OBConnect auth (or mock callback)
      if (result.authUrl) {
        router.push(result.authUrl);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  function handlePayClick() {
    if (risk === "MEDIUM") {
      setShowWarningDialog(true);
    } else {
      initiatePayment();
    }
  }

  if (!hasPaymentData) {
    return (
      <Card className="mt-6 border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Payment details are incomplete. Upload an invoice or enter payment
          details to enable payments.
        </CardContent>
      </Card>
    );
  }

  const formatSortCode = (sc: string) => {
    const clean = sc.replace(/[-\s]/g, "");
    if (clean.length === 6) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 4)}-${clean.slice(4, 6)}`;
    }
    return sc;
  };

  return (
    <>
      <div className="mt-8 space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Payment
        </h2>

        {data.sandboxMode && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
            <span className="font-medium">&#9888; Payment sandbox</span> —
            OBConnect not connected
          </div>
        )}

        {/* Payment summary card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="size-4 text-muted-foreground" />
              <CardTitle className="text-sm">Payment summary</CardTitle>
            </div>
            <CardDescription>Review before proceeding</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="divide-y text-sm">
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Paying</span>
                <span className="font-medium">{data.payeeName}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Amount</span>
                <span className="font-mono font-medium">
                  &pound;
                  {Number(amount).toLocaleString("en-GB", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Sort Code</span>
                <span className="font-mono">{formatSortCode(data.sortCode)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Account</span>
                <span className="font-mono">{data.accountNumber}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{data.reference}</span>
              </div>
            </div>

            <Separator />

            {/* Credit notice */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info className="size-3.5 mt-0.5 shrink-0" />
              <span>This payment will use 1 credit</span>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                {error}
                {error.includes("credits") && (
                  <a
                    href="/dashboard"
                    className="ml-1 underline underline-offset-2"
                  >
                    Buy credits
                  </a>
                )}
              </div>
            )}

            {/* Risk-gated button */}
            {risk === "HIGH" ? (
              <div className="space-y-2">
                <Button
                  disabled
                  className="w-full bg-red-600 hover:bg-red-600 opacity-60 cursor-not-allowed"
                >
                  <ShieldX className="size-4 mr-1.5" />
                  Payment Not Recommended
                </Button>
                <p className="text-xs text-red-600 text-center">
                  This payment has failed one or more verification checks. We
                  recommend you do not proceed.
                </p>
              </div>
            ) : risk === "MEDIUM" ? (
              <Button
                onClick={handlePayClick}
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-700"
                title="1 credit will be used to initiate this payment"
              >
                {loading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <ShieldAlert className="size-4 mr-1.5" />
                )}
                {loading ? "Initiating..." : "Pay with Caution"}
              </Button>
            ) : (
              <Button
                onClick={handlePayClick}
                disabled={loading}
                className="w-full"
                title="1 credit will be used to initiate this payment"
              >
                {loading ? (
                  <Loader2 className="size-4 mr-1.5 animate-spin" />
                ) : (
                  <ShieldCheck className="size-4 mr-1.5" />
                )}
                {loading ? "Initiating..." : "Pay Now"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Medium risk warning dialog */}
      <Dialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <DialogOverlay />
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-100">
              <ShieldAlert className="size-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle>Proceed with caution</DialogTitle>
              <DialogDescription className="mt-0.5">
                One or more checks returned a warning
              </DialogDescription>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            One or more verification checks returned a warning. Are you sure you
            want to proceed with this payment?
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Proceeding will use 1 credit.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <DialogClose
              render={<Button variant="outline">Cancel</Button>}
            />
            <Button
              className="bg-amber-600 hover:bg-amber-700"
              disabled={loading}
              onClick={() => {
                setShowWarningDialog(false);
                initiatePayment();
              }}
            >
              {loading ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <ShieldAlert className="size-4 mr-1.5" />
              )}
              Proceed with Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
