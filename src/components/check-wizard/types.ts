import type { UkCountry } from "@/lib/postcode/region";
import type { PlaceDetails } from "@/lib/schemas/places";
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
export type HeatingFuel =
  | "gas"
  | "oil"
  | "lpg"
  | "electric"
  | "heat_pump"
  | "biomass"
  | "other";
export type YesNoUnsure = "yes" | "no" | "unsure";
export type HybridPreference = "replace" | "hybrid" | "undecided";

export interface CheckWizardState {
  // Step 1 — address
  address: PlaceDetails | null;
  country: UkCountry | null;

  // Step 3 — questions
  tenure: Tenure | null;
  currentHeatingFuel: HeatingFuel | null;
  hotWaterTankPresent: YesNoUnsure | null;
  outdoorSpaceForAshp: YesNoUnsure | null;
  hybridPreference: HybridPreference | null;

  // Step 4 — floorplan
  floorplanObjectKey: string | null;

  // Step 5 — analysis output (stitched)
  analysis: AnalyseResponse | null;
}

export const INITIAL_STATE: CheckWizardState = {
  address: null,
  country: null,
  tenure: null,
  currentHeatingFuel: null,
  hotWaterTankPresent: null,
  outdoorSpaceForAshp: null,
  hybridPreference: null,
  floorplanObjectKey: null,
  analysis: null,
};

export type CheckWizardAction =
  | { type: "UPDATE"; patch: Partial<CheckWizardState> }
  | { type: "RESET" };
