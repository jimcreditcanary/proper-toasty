import { z } from "zod";

/**
 * Schemas for the GOV.UK Energy Performance Certificate API
 * (https://get-energy-performance-data.communities.gov.uk).
 *
 * Search endpoint returns camelCase rows; the single-certificate fetch returns
 * snake_case fields. We normalise to a single `EpcCertificate` shape before
 * surfacing to the rest of the app.
 */

// Raw search-row shape. The EPC API has shipped both camelCase and
// snake_case across releases — the service layer normalises keys to
// snake_case before validation (see camelToSnakeKeys in
// src/lib/services/epc.ts), so this schema is in snake_case.
export const EpcSearchRowSchema = z.object({
  certificate_number: z.string(),
  uprn: z.number().nullable().optional(),
  address_line_1: z.string().optional().default(""),
  address_line_2: z.string().nullable().optional().default(""),
  address_line_3: z.string().nullable().optional().default(""),
  address_line_4: z.string().nullable().optional().default(""),
  postcode: z.string().optional().default(""),
  post_town: z.string().optional().default(""),
  council: z.string().optional().default(""),
  constituency: z.string().optional().default(""),
  current_energy_efficiency_band: z.string().optional().default(""),
  registration_date: z.string().optional().default(""),
});
type EpcSearchRowRaw = z.infer<typeof EpcSearchRowSchema>;

// External-facing row shape — camelCase, what the rest of the codebase
// has always seen. The service layer translates from the snake_case raw
// shape into this.
export interface EpcSearchRow {
  certificateNumber: string;
  uprn?: number | null;
  addressLine1: string;
  addressLine2: string | null;
  addressLine3: string | null;
  addressLine4: string | null;
  postcode: string;
  postTown: string;
  council: string;
  constituency: string;
  currentEnergyEfficiencyBand: string;
  registrationDate: string;
}

export function epcSearchRowFromRaw(raw: EpcSearchRowRaw): EpcSearchRow {
  return {
    certificateNumber: raw.certificate_number,
    uprn: raw.uprn ?? null,
    addressLine1: raw.address_line_1,
    addressLine2: raw.address_line_2,
    addressLine3: raw.address_line_3,
    addressLine4: raw.address_line_4,
    postcode: raw.postcode,
    postTown: raw.post_town,
    council: raw.council,
    constituency: raw.constituency,
    currentEnergyEfficiencyBand: raw.current_energy_efficiency_band,
    registrationDate: raw.registration_date,
  };
}

export const EpcSearchResponseSchema = z.object({
  data: z.array(EpcSearchRowSchema).default([]),
  pagination: z
    .object({
      totalRecords: z.number().optional(),
      currentPage: z.number().optional(),
      totalPages: z.number().optional(),
      pageSize: z.number().optional(),
    })
    .optional(),
});

// Raw certificate fetch shape (snake_case, from /api/certificate).
//
// IMPORTANT: every declared field is `z.unknown().optional()` rather
// than its "real" type. The new GOV.UK EPC API ships the same logical
// fields as flat strings, integer enum codes, or { value, language }
// objects depending on the field, often within the same response.
// Examples observed in production:
//
//   "current_energy_efficiency_band":  "D"                       string
//   "property_type":                   0                          int code
//   "built_form":                      4                          int code
//   "tenure":                          1                          int code
//   "dwelling_type":                   { value: "Mid-terrace
//                                        house", language: "1" } object
//   "glazed_area":                     2                          number
//                                                                 (was string)
//   "heating_cost_current":            { value: 1080,
//                                        currency: "GBP" }        object
//                                                                 (was number)
//   "transaction_type":                1                          number
//                                                                 (was string)
//
// If we declare a strict type and the API ships a different shape,
// zod's parse fails the whole cert, fetchCertificate returns null,
// and the service falls back to certFromRow() — which only knows
// about the search row's fields. That produces the partial-data
// pattern (Current rating populated, Potential / Property Type blank)
// reported in production.
//
// Every type unwrap therefore happens at the service layer
// (src/lib/services/epc.ts) via unwrapValueLike() / unwrapNumberLike().
// .passthrough() is preserved so any field we haven't named survives
// for future surfacing.
// Helper — every declared field is z.unknown().optional(). Saves
// repeating the type and signals "type-unwrap happens downstream".
const u = z.unknown().optional();
export const EpcCertificateRawSchema = z
  .object({
    // Identifiers + admin
    certificate_number: u,
    uprn: u,
    address_line_1: u,
    address_line_2: u,
    address_line_3: u,
    address_line_4: u,
    post_town: u,
    postcode: u,
    assessment_type: u,
    council: u,
    constituency: u,

    // Ratings + bands — multiple naming conventions accepted.
    current_energy_efficiency_band: u,
    current_energy_band: u,
    potential_energy_efficiency_band: u,
    potential_energy_band: u,
    current_energy_efficiency_rating: u,
    current_energy_rating: u,
    potential_energy_efficiency_rating: u,
    potential_energy_rating: u,
    energy_rating_current: u, // newer alias
    energy_rating_potential: u, // newer alias
    environment_impact_current: u,
    environment_impact_potential: u,
    environmental_impact_current: u, // newer spelling
    environmental_impact_potential: u, // newer spelling
    energy_consumption_current: u,
    energy_consumption_potential: u,
    co2_emissions_current: u,
    co2_emissions_potential: u,

    // Property classification
    property_type: u,
    dwelling_type: u,
    built_form: u,
    tenure: u,
    construction_age_band: u,
    construction_age: u,
    total_floor_area: u,
    floor_height: u,
    extension_count: u,
    extensions_count: u, // newer alias
    number_habitable_rooms: u,
    habitable_room_count: u, // newer alias
    number_heated_rooms: u,
    heated_room_count: u, // newer alias

    // Heating — primary. New API ships nested arrays:
    //   main_heating: [{ description: { value: "..." }, energy_efficiency: { value: "Good" }}]
    //   main_heating_controls: [{ description, energy_efficiency }]
    // Old API ships flat: main_heating_description, mainheat_energy_eff.
    // Both paths are kept on the raw schema; the service layer picks
    // whichever has data via unwrapDescription / unwrapEnergyEff.
    main_fuel: u,
    main_heating: u, // new nested array
    main_heating_description: u, // legacy flat
    mainheat_description: u, // legacy alias
    mainheat_energy_eff: u, // legacy flat
    main_heating_controls: u, // new nested array
    mainheatcont_description: u, // legacy flat
    mainheatcont_energy_eff: u, // legacy flat
    hot_water: u, // new nested object
    hot_water_description: u, // legacy flat
    hot_water_energy_eff: u, // legacy flat
    mains_gas_flag: u, // legacy "Y" / "N"
    sap_energy_source: u, // new nested { mains_gas: bool }

    // Heating — secondary (open fires, electric heaters etc).
    // Surfaced for installers because secondary heat affects sizing
    // (it covers shoulder demand the heat pump won't have to).
    secondary_heating: u, // new nested { description: { value } }
    secondheat_description: u, // legacy flat
    secondary_heating_description: u, // older alias
    main_heating_2_description: u, // alternate spelling

    // Combustion + ventilation features that affect heat-loss
    // calculations + heat-pump install scope.
    number_open_fireplaces: u,
    open_fireplaces_count: u, // newer alias
    number_open_chimneys: u,
    open_chimneys_count: u, // newer alias

    // Fabric + glazing. New API ships these as either:
    //   walls / floors / roofs : array of { description, energy_efficiency }
    //   window                  : single object  { description, energy_efficiency }
    // The service layer unwraps via unwrapDescription / unwrapEnergyEff
    // which handle both arrays and single objects. Legacy flat keys
    // are kept for back-compat with cached responses.
    walls: u,
    walls_description: u,
    walls_energy_eff: u,
    roofs: u,
    roof: u, // singular alias
    roof_description: u,
    roof_energy_eff: u,
    floors: u,
    floor: u,
    floor_description: u,
    floor_energy_eff: u,
    window: u, // new singular shape
    windows: u, // some envelopes ship plural
    windows_description: u,
    windows_energy_eff: u,
    glazed_type: u,
    glazed_area: u,
    multi_glaze_proportion: u,
    multiple_glazed_proportion: u, // newer alias

    // Lighting — same nested-or-flat treatment.
    lighting: u, // new nested
    lighting_description: u,
    lighting_energy_eff: u,
    low_energy_lighting: u,
    fixed_lighting_outlets_count: u,
    low_energy_fixed_lighting: u,
    low_energy_fixed_lighting_outlets_count: u, // newer alias

    // Per-bill breakdown (£/yr) — new API ships these as
    // { value, currency } objects rather than flat numbers.
    heating_cost_current: u,
    heating_cost_potential: u,
    hot_water_cost_current: u,
    hot_water_cost_potential: u,
    lighting_cost_current: u,
    lighting_cost_potential: u,

    // Admin
    transaction_type: u,
    registration_date: u,
    inspection_date: u,
    lodgement_date: u,
    lodgement_datetime: u,
    completion_date: u,

    // Assessor / accreditation
    assessor_name: u,
    inspector_name: u,
    inspector_company_name: u,
    accreditation_scheme: u,
    accredited_assessor_id: u,
    energy_assessor_email: u,
    assessor_email: u,
    inspector_email: u,
  })
  .passthrough();

export const EpcCertificateResponseSchema = z.object({
  data: EpcCertificateRawSchema,
});

/**
 * Normalised cert we expose to the rest of the app. Kept similar to the
 * shape the old Basic-auth API returned so the eligibility engine didn't need
 * a full rewrite — but most detail fields are now optional because the new
 * API returns a narrower set by default.
 *
 * v2 (May 2026): captures the full breadth of EPC detail fields. The UI
 * currently surfaces a small subset (built form, construction age,
 * floor area) — the rest are stored so they're available without a
 * second schema pass when we want to expose them.
 */
export const EpcCertificateSchema = z.object({
  // Identifiers + admin
  certificateNumber: z.string(),
  uprn: z.string().nullable(),
  address: z.string(),
  postcode: z.string().nullable(),
  registrationDate: z.string().nullable(),
  transactionType: z.string().nullable(),
  council: z.string().nullable(),

  // Ratings + bands
  currentEnergyBand: z.string().nullable(),
  potentialEnergyBand: z.string().nullable(),
  currentEnergyRating: z.number().nullable(),
  potentialEnergyRating: z.number().nullable(),
  environmentImpactCurrent: z.number().nullable(),
  environmentImpactPotential: z.number().nullable(),
  energyConsumptionCurrent: z.number().nullable(),
  energyConsumptionPotential: z.number().nullable(),
  co2EmissionsCurrent: z.number().nullable(),
  co2EmissionsPotential: z.number().nullable(),

  // Property classification
  propertyType: z.string().nullable(),
  /** Combined classification e.g. "Detached house". Falls back to
   *  `${propertyType} ${builtForm}` when the upstream payload doesn't
   *  ship the separate dwelling_type field. */
  dwellingType: z.string().nullable(),
  builtForm: z.string().nullable(),
  constructionAgeBand: z.string().nullable(),
  tenure: z.string().nullable(),
  totalFloorAreaM2: z.number().nullable(),
  floorHeightM: z.number().nullable(),
  extensionCount: z.number().nullable(),
  numberHabitableRooms: z.number().nullable(),
  numberHeatedRooms: z.number().nullable(),

  // Heating
  mainFuel: z.string().nullable(),
  mainHeatingDescription: z.string().nullable(),
  mainHeatingEnergyEff: z.string().nullable(),
  mainHeatingControlsDescription: z.string().nullable(),
  mainHeatingControlsEnergyEff: z.string().nullable(),
  hotWaterDescription: z.string().nullable(),
  hotWaterEnergyEff: z.string().nullable(),
  mainsGasFlag: z.string().nullable(),

  // Secondary heating + air paths — relevant for heat-loss calcs
  // and BUS scope (open fires increase ventilation losses; secondary
  // heat shifts how much demand the heat pump has to cover).
  secondaryHeatingDescription: z.string().nullable(),
  numberOpenFireplaces: z.number().nullable(),
  numberOpenChimneys: z.number().nullable(),

  // Fabric + glazing
  wallsDescription: z.string().nullable(),
  wallsEnergyEff: z.string().nullable(),
  roofDescription: z.string().nullable(),
  roofEnergyEff: z.string().nullable(),
  // New EPC schema can ship a second roof element (e.g. a flat roof
  // alongside the main pitched roof). Surfaced for installers
  // because mixed-roof properties affect solar segment scope + heat
  // loss. Null when the cert only has one roof.
  roofDescription2: z.string().nullable(),
  roofEnergyEff2: z.string().nullable(),
  floorDescription: z.string().nullable(),
  floorEnergyEff: z.string().nullable(),
  windowsDescription: z.string().nullable(),
  windowsEnergyEff: z.string().nullable(),
  glazedType: z.string().nullable(),
  glazedArea: z.string().nullable(),
  multiGlazeProportion: z.number().nullable(),

  // Lighting
  lightingDescription: z.string().nullable(),
  lightingEnergyEff: z.string().nullable(),
  lowEnergyLightingPct: z.number().nullable(),
  fixedLightingOutletsCount: z.number().nullable(),
  lowEnergyFixedLightingCount: z.number().nullable(),

  // Per-bill breakdown (£/yr)
  heatingCostCurrent: z.number().nullable(),
  heatingCostPotential: z.number().nullable(),
  hotWaterCostCurrent: z.number().nullable(),
  hotWaterCostPotential: z.number().nullable(),
  lightingCostCurrent: z.number().nullable(),
  lightingCostPotential: z.number().nullable(),

  // Lodgement + inspection
  inspectionDate: z.string().nullable(),
  lodgementDate: z.string().nullable(),

  // Assessor / accreditation — we surface the first non-empty value
  // from the variants the API ships under different keys.
  assessorName: z.string().nullable(),
  assessorEmail: z.string().nullable(),
  assessorCompany: z.string().nullable(),
  accreditationScheme: z.string().nullable(),

  // Computed fields — derived in the service layer, not from the
  // upstream payload directly. Cert is valid for 10 years from
  // registration; `validUntil` is the date it expires; `expired`
  // is true once today is past it.
  validUntil: z.string().nullable(),
  expired: z.boolean(),
});
export type EpcCertificate = z.infer<typeof EpcCertificateSchema>;

/**
 * Build the public GOV.UK URL for an EPC certificate. Used in the
 * installer brief and the wizard's preview so installers can verify
 * the cert end-to-end without leaving the report.
 */
export function epcCertificateUrl(certificateNumber: string): string {
  return `https://find-energy-certificate.service.gov.uk/energy-certificate/${certificateNumber}`;
}

// EPC improvement recommendations — surfaced from the GOV.UK
// recommendations endpoint. Each row is one suggested measure
// the assessor flagged at inspection time, with an indicative cost
// + savings band. Useful to installers because it tells them which
// fabric upgrades the homeowner has already been advised to pursue.
export const EpcRecommendationSchema = z.object({
  // Free-text label, e.g. "Internal or external wall insulation".
  improvementSummary: z.string(),
  // Longer description from the certificate, sometimes ships as a
  // sub-heading or empty string. Kept distinct from the summary so
  // we can choose which to render based on length.
  improvementDescription: z.string().nullable(),
  // 1 = highest priority, ascending. The API returns this as a
  // string in some envelopes; we coerce.
  improvementItem: z.number().nullable(),
  // Indicative cost + savings — both can be free-text bands like
  // "£500 - £1,500" so we keep them as strings.
  indicativeCost: z.string().nullable(),
  typicalSavingPerYear: z.string().nullable(),
  // Predicted post-improvement rating + band, when available.
  energyPerformanceRatingImprovement: z.number().nullable(),
  energyPerformanceBandImprovement: z.string().nullable(),
  environmentalImpactRatingImprovement: z.number().nullable(),
  greenDealCategoryCode: z.string().nullable(),
});
export type EpcRecommendation = z.infer<typeof EpcRecommendationSchema>;

// Shape returned by /api/epc/by-address
export const EpcByAddressResponseSchema = z.union([
  z.object({
    found: z.literal(true),
    matchMethod: z.enum(["uprn", "postcode+address"]),
    certificate: EpcCertificateSchema,
    registrationDate: z.string(),
    ageYears: z.number().nullable(),
    // Optional — populated when the recommendations endpoint also
    // returned data for this cert. Empty array when the API call
    // succeeded but the cert has no recommendations on file.
    // Absent when the recommendations fetch failed (we keep going
    // rather than fail the whole EPC lookup over a side-call).
    recommendations: z.array(EpcRecommendationSchema).nullable().optional(),
  }),
  z.object({ found: z.literal(false), reason: z.string() }),
]);

export type EpcByAddressResponse = z.infer<typeof EpcByAddressResponseSchema>;
