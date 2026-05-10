// /check/heatpump — heat-pump-only marketing variant of the check
// wizard.
//
// Same wizard chrome + steps as /check, except:
//   - focus = "heatpump" pre-seeded into wizard state, which:
//     * KEEPS every step — the floorplan IS the canonical
//       heat-pump survey input, can't skip it
//     * filters the report tabs to Overview + Heat pump
//       (Solar + Savings tabs hidden — the Savings tab leans on
//       the solar finance block which we're not surfacing here)
//   - interests pre-set to ["heat_pump"] so the analysis pipeline
//     + report toggles match
//
// Marketing landing pages link here directly. See /check/solar
// for the parallel variant.

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Heat pump check — Propertoasty",
  description:
    "Upload your floorplan and find out if your UK home is suited to a heat pump — including BUS grant value + recommended capacity. Pre-survey indication in minutes.",
};

export const dynamic = "force-dynamic";

export default function CheckHeatpumpPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  return (
    <CheckWizard
      initialState={{
        focus: "heatpump",
        interests: ["heat_pump"],
      }}
    />
  );
}
