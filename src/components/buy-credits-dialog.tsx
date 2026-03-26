"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { CreditCard, Loader2 } from "lucide-react";

const PLANS = [
  { credits: 10, label: "10 credits", price: "£5" },
  { credits: 50, label: "50 credits", price: "£20" },
  { credits: 200, label: "200 credits", price: "£60" },
];

export function BuyCreditsDialog() {
  const [selected, setSelected] = useState(50);
  const [loading, setLoading] = useState(false);

  async function handlePurchase() {
    setLoading(true);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: selected }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <CreditCard className="size-4 mr-1.5" />
        Buy credits
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Buy credits</DialogTitle>
          <DialogDescription>
            Each invoice verification uses 1 credit.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {PLANS.map((plan) => (
            <button
              key={plan.credits}
              type="button"
              onClick={() => setSelected(plan.credits)}
              className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-colors ${
                selected === plan.credits
                  ? "border-primary bg-primary/5"
                  : "hover:bg-muted"
              }`}
            >
              <span className="font-medium">{plan.label}</span>
              <span className="text-muted-foreground">{plan.price}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="outline" disabled={loading} />}>
            Cancel
          </DialogClose>
          <Button onClick={handlePurchase} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-1.5 animate-spin" />
                Redirecting...
              </>
            ) : (
              "Continue to payment"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
