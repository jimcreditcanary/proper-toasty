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
  title: "Heat pump check",
  description:
    "Find out if your UK home suits a heat pump — BUS grant value + sizing. Pre-survey indication in minutes.",
  alternates: { canonical: "https://www.propertoasty.com/check/heatpump" },
};

export const dynamic = "force-dynamic";

export default async function CheckHeatpumpPage({
  searchParams,
}: {
  // Next 16: searchParams is a Promise. `?postcode=` comes from the
  // hero mini-wizard when the user picks Heat pump + submits.
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  const params = await searchParams;
  const raw = params.postcode;
  const prefill = typeof raw === "string" && raw.trim().length >= 5 ? raw.trim() : null;
  return (
    <CheckWizard
      initialState={{
        focus: "heatpump",
        interests: ["heat_pump"],
        prefillPostcode: prefill,
      }}
    />
  );
}
