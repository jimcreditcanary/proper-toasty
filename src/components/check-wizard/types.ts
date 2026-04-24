import type { UkCountry } from "@/lib/postcode/region";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";

export type CheckStep =
  | "address"
  | "preview"
  | "questions"
  | "floorplan"
  | "analysis"
  | "lead_capture"
  | "report";

export const STEP_ORDER: CheckStep[] = [
  "address",
  "preview",
  "questions",
  "floorplan",
  "analysis",
  "lead_capture",
  "report",
];

export type Tenure = "owner" | "landlord" | "tenant" | "social";
export type Interest = "heat_pump" | "solar_battery";
export type HeatingFuel = "gas" | "electric" | "other";
export type YesNoUnsure = "yes" | "no" | "unsure";

export interface SelectedAddress {
  uprn: string;
  formattedAddress: string;
  line1: string;
  line2: string | null;
  postcode: string;
  postTown: string;
  latitude: number;
  longitude: number;
}

export interface CheckWizardState {
  // Step 1 — address
  address: SelectedAddress | null;
  country: UkCountry | null;

  // Step 3 — questions.
  // Kept deliberately minimal: we only ask what we CAN'T infer from EPC,
  // Postcoder, satellite imagery, or the Claude floorplan analysis.
  //   - existing boiler? → EPC.mainFuel + floorplan.boilerLocation
  //   - need new radiators? → EPC age band + floorplan.radiatorsVisible
  //   - hot water tank? → floorplan.hotWaterCylinderSpace
  //   - 1m² outdoor space? → floorplan.outdoorSpace + heatPumpInstallationConcerns
  // All of those are surfaced in Step 6 directly from the floorplan analysis.
  //
  // Interests is no longer asked up-front — the report covers heat pump +
  // solar + battery as a combined recommendation, and the user can toggle
  // technologies on/off on the results page. We default to both so the
  // analysis runs across the full set.
  interests: Interest[];
  tenure: Tenure | null;
  currentHeatingFuel: HeatingFuel | null; // future: pre-fill from EPC main fuel
  priorHeatPumpFunding: YesNoUnsure | null; // Ofgem BUS: no double funding

  // Energy tariff details — required for cost-savings calc later.
  // Electricity always required; gas required when currentHeatingFuel === "gas".
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;

  // Step 4 — floorplan
  floorplanObjectKey: string | null;
  // Pre-computed floorplan analysis from /api/floorplan/analyse, edited by the
  // user in the in-step editor. Step 5 sends this to /api/analyse so we
  // don't run Claude floorplan vision twice.
  floorplanAnalysis: FloorplanAnalysis | null;
  floorplanDegraded: boolean;
  floorplanDegradedReason: string | null;
  // Satellite verdict from the same endpoint — drives whether the editor
  // asks the "do you have outdoor space?" question.
  satelliteOutdoorVerdict: "yes" | "no" | "unsure" | null;

  // Step 5 — analysis output (stitched)
  analysis: AnalyseResponse | null;

  // Step 6 — lead capture (email gate before the report).
  // Persisted so users who hit Back on the report don't have to re-enter
  // their email, and so the report tab knows if it's been captured.
  leadEmail: string | null;
  leadName: string | null;
  leadConsentMarketing: boolean;
  leadConsentInstallerMatching: boolean;
  leadCapturedAt: string | null; // ISO timestamp
  leadId: string | null;         // server-returned id once saved
}

export const INITIAL_STATE: CheckWizardState = {
  address: null,
  country: null,
  interests: ["heat_pump", "solar_battery"],
  tenure: null,
  currentHeatingFuel: null,
  priorHeatPumpFunding: null,
  electricityTariff: null,
  gasTariff: null,
  floorplanObjectKey: null,
  floorplanAnalysis: null,
  floorplanDegraded: false,
  floorplanDegradedReason: null,
  satelliteOutdoorVerdict: null,
  analysis: null,
  leadEmail: null,
  leadName: null,
  leadConsentMarketing: false,
  leadConsentInstallerMatching: true, // opt-in by default (matches business model)
  leadCapturedAt: null,
  leadId: null,
};

export type CheckWizardAction =
  | { type: "UPDATE"; patch: Partial<CheckWizardState> }
  | { type: "RESET" };
