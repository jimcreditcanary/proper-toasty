"use client";

// Client island: the "Dismiss" button on the welcome card that
// permanently hides it. Lives in the card header next to the
// progress pills so it reads as a deliberate close action, not
// an accidental tap target.
//
// On click: POST /api/installer/onboarding/dismiss + router.refresh()
// to repaint the page server-side. The endpoint stamps
// installers.welcome_card_dismissed_at; the dashboard's render
// gate (shouldShowWelcomeCard) reads that column.
//
// History: was an X-only icon button. Re-styled with a visible
// "Dismiss" label after user research showed people weren't
// noticing the X — the affordance to close the WHOLE card needs
// to be obvious enough that they'll find it without hunting.
//
// We optimistic-hide by tracking pending state — the button
// vanishes the instant the user clicks even if router.refresh()
// takes a beat.

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
      title="Hide this welcome card. You won't see it again unless we add a new onboarding task."
      aria-label="Dismiss welcome card"
      className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-semibold text-slate-500 hover:text-slate-700 hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral"
    >
      <X className="w-3 h-3" />
      Dismiss
    </button>
  );
}
