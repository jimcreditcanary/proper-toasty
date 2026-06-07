// /check/octopus — Octopus Energy "instant report" screen.
//
// Was a multi-step wizard (focus="boiler", partner="octopus") routed
// through CheckWizard. Now bypasses every step — visitor came from
// the /octopus landing, the property is hard-coded (illustrative),
// and we show the simplified savings story straight away. The Order
// Now CTA lives at /check/octopus/order (Tesla-style booking flow).
//
// See src/components/octopus/instant-report.tsx for the layout.

import { notFound } from "next/navigation";
import { OctopusInstantReport } from "@/components/octopus/instant-report";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Your Octopus heat pump — £49.99 a month · Propertoasty",
  description:
    "Your monthly cost side by side with a new gas boiler. Everything in — service, callouts, 10-year warranty, £500 cashback.",
};

export const dynamic = "force-dynamic";

export default function CheckOctopusPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  return <OctopusInstantReport />;
}
