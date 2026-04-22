import type { UkCountry } from "@/lib/postcode/region";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";

export type CheckStep =
  | "address"
  | "preview"
  | "questions"
  | "floorplan"
  | "analysis"
  | "report";

export const STEP_ORDER: CheckStep[] = [
  "address",
  "preview",
  "questions",
  "floorplan",
  "analysis",
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
  interests: Interest[]; // multi-select: heat_pump, solar_battery, or both
  tenure: Tenure | null;
  currentHeatingFuel: HeatingFuel | null; // future: pre-fill from EPC main fuel
  priorHeatPumpFunding: YesNoUnsure | null; // Ofgem BUS: no double funding

  // Energy tariff details — required for cost-savings calc later.
  // Electricity always required; gas required when currentHeatingFuel === "gas".
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;

  // Step 4 — floorplan
  floorplanObjectKey: string | null;

  // Step 5 — analysis output (stitched)
  analysis: AnalyseResponse | null;
}

export const INITIAL_STATE: CheckWizardState = {
  address: null,
  country: null,
  interests: [],
  tenure: null,
  currentHeatingFuel: null,
  priorHeatPumpFunding: null,
  electricityTariff: null,
  gasTariff: null,
  floorplanObjectKey: null,
  analysis: null,
};

export type CheckWizardAction =
  | { type: "UPDATE"; patch: Partial<CheckWizardState> }
  | { type: "RESET" };
