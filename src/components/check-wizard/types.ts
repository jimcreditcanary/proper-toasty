import type { UkCountry } from "@/lib/postcode/region";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FloorplanExtract } from "@/lib/schemas/floorplan-extract";
import type { AddressMetadata } from "@/lib/schemas/address-lookup";

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

/** Three product entry points:
 *
 *   - "all"      → /check, runs both heat-pump + solar paths.
 *                  Default for the homepage.
 *   - "solar"    → /check/solar, marketing-targeted variant.
 *                  Skips the floorplan step (solar doesn't need
 *                  it) and hides the heat-pump tab on the report.
 *   - "heatpump" → /check/heatpump, marketing-targeted variant.
 *                  Same steps as "all" but the report hides the
 *                  Solar + Savings tabs so the user reads only
 *                  the heat-pump verdict.
 *
 * Persisted in wizard state so back/forward + page reload keep
 * the variant.
 */
export type WizardFocus = "all" | "solar" | "heatpump";

/** Per-focus step order. Solar drops the floorplan step because the
 *  solar API + satellite imagery don't depend on it; the floorplan
 *  upload would just be friction for a user who came in on the solar
 *  marketing page. Heat-pump variant keeps every step — the floor-
 *  plan IS the heat-pump survey input. */
export function stepOrderForFocus(focus: WizardFocus): CheckStep[] {
  if (focus === "solar") {
    return STEP_ORDER.filter((s) => s !== "floorplan");
  }
  return STEP_ORDER;
}

export type Tenure = "owner" | "landlord" | "tenant" | "social";
export type Interest = "heat_pump" | "solar_battery";
export type HeatingFuel = "gas" | "electric" | "other";
export type YesNoUnsure = "yes" | "no" | "unsure";

export interface SelectedAddress {
  // Real OS UPRN supplied by OS Places. Nullable because the type is
  // shared with legacy reports (some predate the OS Places switch);
  // new wizard flows always populate it.
  uprn: string | null;
  formattedAddress: string;
  line1: string;
  line2: string | null;
  postcode: string;
  postTown: string;
  latitude: number;
  longitude: number;
  // Rich OS Places metadata captured at address-pick time. Persisted
  // to checks.address_metadata (migration 057) and surfaced in the
  // installer site brief.
  metadata?: AddressMetadata | null;
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
  // Whether the user wants to finance the works. Drives which calculator
  // scenario is shown by default on the report (Yes / Not sure → Finance
  // scenario expanded; No → Pay-up-front scenario expanded). Both scenarios
  // remain available to toggle regardless of the answer.
  financingPreference: YesNoUnsure | null;

  // Energy tariff details — required for cost-savings calc later.
  // Electricity always required; gas required when currentHeatingFuel === "gas".
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;

  // Step 4 — floorplan
  floorplanObjectKey: string | null;
  // Legacy: pre-computed floorplan analysis from /api/floorplan/analyse,
  // edited by the user in the legacy step-4 builder. The v2 upload-only
  // flow doesn't populate this — it sets `floorplanExtract` instead.
  // Kept here for any in-flight wizard sessions that started under the
  // legacy step + the report tabs that haven't been migrated yet.
  floorplanAnalysis: FloorplanAnalysis | null;
  floorplanDegraded: boolean;
  floorplanDegradedReason: string | null;
  // Satellite verdict from the same endpoint — drives whether the editor
  // asks the "do you have outdoor space?" question.
  satelliteOutdoorVerdict: "yes" | "no" | "unsure" | null;
  // V2 upload-only output. Set by the new Step 4 (Step4Upload) once
  // /api/upload/floorplan returns a complete extract. The report's
  // Heat pump tab reads this in preference to the legacy eligibility
  // engine output when present.
  floorplanExtract: FloorplanExtract | null;
  // Server-side row id of the floorplan_uploads record that produced
  // floorplanExtract. Surfaced to the lead-capture path so the
  // installer_lead can be linked back to the upload.
  floorplanUploadId: string | null;

  // Three-variant entry point — see WizardFocus comment above.
  // Default "all" keeps backwards-compat with the homepage flow.
  focus: WizardFocus;

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

  // I5 — pre-survey attribution. When set, the customer arrived
  // via /check?presurvey=<token>. /api/leads/capture forwards this
  // up to auto-create an installer_lead attributed to the requesting
  // installer + flip the request row to 'completed'. The wizard
  // also surfaces a "your installer requested this" banner and
  // pre-fills the postcode in step 1.
  preSurveyRequestId: string | null;
  preSurveyInstallerName: string | null;
  // The numeric installer id behind the pre-survey request — needed
  // by the report's Book tab so it can fetch THIS installer's
  // availability slots when the installer didn't already book a
  // meeting at send-time. Surfaced separately from the name so the
  // booking call doesn't have to re-resolve the installer.
  preSurveyInstallerId: number | null;
  // The token from the pre-survey email link. Stashed so the
  // homeowner-side booking endpoint can re-validate they actually
  // came from the link, without re-asking them to authenticate.
  preSurveyToken: string | null;
  // I5 follow-up: meeting status captured at send-time. When the
  // installer flagged "site visit already booked", these are set.
  // Drives the report's Book-tab visibility + the meeting banner.
  preSurveyMeetingStatus: "not_booked" | "booked" | null;
  preSurveyMeetingAt: string | null; // ISO 8601 UTC
  prefillPostcode: string | null;

  // Migration 055 — guest persistence. clientSessionId is minted on
  // first wizard load (kept in localStorage with the rest of state)
  // and sent on every /api/checks/upsert so the same draft can be
  // updated across reloads. checkId is the server-side row id once
  // the first upsert returns; subsequent calls send it back so the
  // server doesn't need to re-find the row.
  clientSessionId: string | null;
  checkId: string | null;
}

export const INITIAL_STATE: CheckWizardState = {
  address: null,
  country: null,
  interests: ["heat_pump", "solar_battery"],
  focus: "all",
  tenure: null,
  currentHeatingFuel: null,
  priorHeatPumpFunding: null,
  financingPreference: null,
  electricityTariff: null,
  gasTariff: null,
  floorplanObjectKey: null,
  floorplanAnalysis: null,
  floorplanExtract: null,
  floorplanUploadId: null,
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
  preSurveyRequestId: null,
  preSurveyInstallerName: null,
  preSurveyInstallerId: null,
  preSurveyToken: null,
  preSurveyMeetingStatus: null,
  preSurveyMeetingAt: null,
  prefillPostcode: null,
  clientSessionId: null,
  checkId: null,
};

export type CheckWizardAction =
  | { type: "UPDATE"; patch: Partial<CheckWizardState> }
  | { type: "RESET" };
