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
  const [error, setError] = useState<string | null>(null);

  async function handlePurchase() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credits: selected }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError("No checkout URL returned");
        setLoading(false);
      }
    } catch {
      setError("Failed to connect. Please try again.");
      setLoading(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="h-12 px-6 bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12] rounded-xl text-[15px] font-bold" />
        }
      >
        <CreditCard className="size-5 mr-2" />
        Buy credits
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm bg-navy-card border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Buy credits</DialogTitle>
          <DialogDescription className="text-brand-muted-light">
            Each invoice verification uses 1 credit.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-2">
          {PLANS.map((plan) => (
            <button
              key={plan.credits}
              type="button"
              onClick={() => setSelected(plan.credits)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                selected === plan.credits
                  ? "border-coral bg-coral/10 text-white"
                  : "border-white/10 hover:bg-white/[0.05] text-brand-muted-light"
              }`}
            >
              <span className="font-medium">{plan.label}</span>
              <span className={selected === plan.credits ? "text-coral" : "text-brand-muted"}>{plan.price}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="rounded-xl bg-fail/10 border border-fail/20 px-3 py-2 text-sm text-fail">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <DialogClose
            render={
              <Button
                className="bg-white/[0.07] border border-white/10 text-brand-muted-light hover:text-white hover:bg-white/[0.12] rounded-xl"
                disabled={loading}
              />
            }
          >
            Cancel
          </DialogClose>
          <Button
            onClick={handlePurchase}
            disabled={loading}
            className="bg-coral hover:bg-coral-dark text-white font-bold rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
          >
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
