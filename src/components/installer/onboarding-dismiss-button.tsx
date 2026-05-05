"use client";

// Tiny client island: the X button on the onboarding checklist that
// permanently hides it. Lives next to the "N of 4 done" pill so it
// reads as a deliberate close action, not an accidental tap target.
//
// On click: POST /api/installer/onboarding/dismiss + router.refresh()
// to repaint the page server-side. The checklist's parent reads
// users.installer_onboarding_dismissed_at and conditionally renders.
//
// We optimistic-hide by tracking pending state — the button vanishes
// the instant the user clicks even if router.refresh() takes a beat.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

export function OnboardingDismissButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDismiss() {
    setPending(true);
    try {
      const res = await fetch("/api/installer/onboarding/dismiss", {
        method: "POST",
      });
      if (!res.ok) {
        // Bring the button back so the user can retry. The card
        // doesn't need to flash an error — failure here is rare and
        // a refresh would cure most cases.
        setPending(false);
        return;
      }
      router.refresh();
    } catch {
      setPending(false);
    }
  }

  if (pending) return null;

  return (
    <button
      type="button"
      onClick={() => void handleDismiss()}
      title="Hide this welcome card"
      aria-label="Hide welcome card"
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <X className="w-3.5 h-3.5" />
    </button>
  );
}
