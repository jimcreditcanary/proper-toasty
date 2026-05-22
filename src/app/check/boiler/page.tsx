// /check/boiler — "new boiler or heat pump?" variant of the check
// wizard.
//
// Same wizard chrome + steps as /check, except:
//   - focus = "boiler" pre-seeded into wizard state, which:
//     * skips the floorplan upload step (this is a cost-decision
//       tool — the comparison keys off EPC property type + floor
//       area + the BUS eligibility gate, not a floorplan survey)
//     * filters the report tabs to Overview + Boiler-vs-heat-pump
//       comparison + Book, with the comparison as the default tab
//   - interests pre-set to ["heat_pump"] so the analysis pipeline
//     runs the heat-pump eligibility path the comparison depends on
//
// The marketing landing page (/replace-my-boiler) links here.
//
// Pre-survey hand-off (?presurvey=<token>) is intentionally NOT
// supported here — pre-surveys always go via /check (see the
// matching note on /check/solar).

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "New boiler or heat pump? — Propertoasty",
  description:
    "Replacing your gas boiler? Compare the all-in cost of a new boiler vs an air source heat pump with the £7,500 grant — both with monthly finance.",
};

export const dynamic = "force-dynamic";

export default function CheckBoilerPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  return (
    <CheckWizard
      initialState={{
        focus: "boiler",
        interests: ["heat_pump"],
      }}
    />
  );
}
