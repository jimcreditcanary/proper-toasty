// /check/octopus — Octopus Energy co-branded boiler-vs-heat-pump flow.
//
// Same wizard as /check/boiler (focus="boiler" → skips floorplan, lands
// on the comparison), plus partner="octopus", which makes the
// comparison use Octopus's commercials:
//   - Octopus's own heat-pump price (~£10.5k → £3k net after grant)
//   - the household put on the Octopus Cosy tariff post-install
//   - 0% finance over 10 years
//   - a more aggressive gas-vs-electricity price projection
//   - a "do you pay for boiler cover?" question, whose cost is added
//     to the gas-boiler side as an overage a heat pump avoids
//
// Reached from the /octopus partner landing page.

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "New boiler or an Octopus heat pump? — Propertoasty",
  description:
    "Compare a new gas boiler against an Octopus Energy heat pump — Octopus pricing, the Cosy tariff, 0% finance over 10 years, and your costs over time.",
};

export const dynamic = "force-dynamic";

export default function CheckOctopusPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  return (
    <CheckWizard
      initialState={{
        focus: "boiler",
        partner: "octopus",
        interests: ["heat_pump"],
      }}
    />
  );
}
