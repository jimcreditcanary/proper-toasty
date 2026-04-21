import type { UkCountry } from "@/lib/postcode/region";
import type { AnalyseResponse } from "@/lib/schemas/analyse";

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
export type Interest = "heat_pump" | "solar_battery" | "not_sure";
export type HeatingFuel = "gas" | "electric" | "other";
export type YesNoUnsure = "yes" | "no" | "unsure";
export type YesOrUnsure = "yes" | "unsure";

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

  // Step 3 — questions
  interest: Interest | null;
  tenure: Tenure | null;
  currentHeatingFuel: HeatingFuel | null;
  hasExistingBoiler: YesNoUnsure | null;
  needNewRadiators: YesNoUnsure | null;
  hotWaterTankPresent: YesNoUnsure | null;
  spaceBesideOutsideWall: YesOrUnsure | null; // only asked if no/unsure tank
  priorHeatPumpFunding: YesNoUnsure | null; // Ofgem BUS: no double funding
  annualGasKWh: number | null;
  annualElectricityKWh: number | null;

  // Step 4 — floorplan
  floorplanObjectKey: string | null;

  // Step 5 — analysis output (stitched)
  analysis: AnalyseResponse | null;
}

export const INITIAL_STATE: CheckWizardState = {
  address: null,
  country: null,
  interest: null,
  tenure: null,
  currentHeatingFuel: null,
  hasExistingBoiler: null,
  needNewRadiators: null,
  hotWaterTankPresent: null,
  spaceBesideOutsideWall: null,
  priorHeatPumpFunding: null,
  annualGasKWh: null,
  annualElectricityKWh: null,
  floorplanObjectKey: null,
  analysis: null,
};

export type CheckWizardAction =
  | { type: "UPDATE"; patch: Partial<CheckWizardState> }
  | { type: "RESET" };
