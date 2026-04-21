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

/**
 * Canonical selected-address shape used across the wizard. Populated from
 * Postcoder (UPRN, address lines, lat/lng) + Postcodes.io (country).
 */
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
