// /check/solar — solar-only marketing variant of the check wizard.
//
// Same wizard chrome + steps as /check, except:
//   - focus = "solar" pre-seeded into wizard state, which:
//     * causes the floorplan upload step to be skipped (solar
//       doesn't need it — the Google Solar API + satellite imagery
//       are the canonical inputs)
//     * filters the report tabs to Overview + Savings + Solar
//       (Heat pump tab hidden)
//   - interests pre-set to ["solar_battery"] so the analysis
//     pipeline + report toggles match
//
// Marketing landing pages link here directly so the user lands
// on the focused experience rather than the kitchen-sink default.
//
// Pre-survey hand-off (?presurvey=<token>) is intentionally NOT
// supported on this route — pre-surveys always go via /check
// because the installer's request flow assumes the full
// heat-pump + solar context. If we ever want focus-aware
// pre-surveys, add it as a separate query param.

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Solar check — Propertoasty",
  description:
    "Find out if your UK roof is suited to solar PV + battery. We use Google Solar imagery + your address — no floorplan needed.",
};

export const dynamic = "force-dynamic";

export default function CheckSolarPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  return (
    <CheckWizard
      initialState={{
        focus: "solar",
        interests: ["solar_battery"],
      }}
    />
  );
}
