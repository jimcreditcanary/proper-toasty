"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, X, Landmark } from "lucide-react";

function MockCallbackContent() {
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId") ?? "";
  const ref = searchParams.get("ref") ?? "";
  const amount = searchParams.get("amount") ?? "";
  const payee = searchParams.get("payee") ?? "";

  const callbackBase = "/api/payment/callback";

  function buildUrl(status: string) {
    return `${callbackBase}?paymentId=${encodeURIComponent(paymentId)}&status=${status}`;
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sandbox banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
        <span className="font-medium">&#9888; Payment sandbox</span> — OBConnect
        not connected. This simulates the bank authorisation screen.
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-full bg-muted">
              <Landmark className="size-7 text-muted-foreground" />
            </div>
            <CardTitle>Bank Authorisation</CardTitle>
            <CardDescription>
              Approve or cancel this Open Banking payment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Payment details */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Paying</span>
                <span className="font-medium">{payee}</span>
              </div>
              {amount && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount</span>
                  <span className="font-medium font-mono">
                    &pound;{Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              {ref && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Reference</span>
                  <span className="font-mono text-xs">{ref}</span>
                </div>
              )}
            </div>

            <Badge variant="outline" className="w-full justify-center py-1.5">
              Mock Mode — No real payment will be made
            </Badge>

            {/* Action buttons */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  window.location.href = buildUrl("CANCELLED");
                }}
              >
                <X className="mr-1.5 size-4" />
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  window.location.href = buildUrl("COMPLETED");
                }}
              >
                <ShieldCheck className="mr-1.5 size-4" />
                Approve Payment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MockCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading...
        </div>
      }
    >
      <MockCallbackContent />
    </Suspense>
  );
}
