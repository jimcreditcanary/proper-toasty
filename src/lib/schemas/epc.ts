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
// The API note says "structure varies by certificate type and schema version"
// — we take a lenient shape and let zod drop unknown fields.
//
// We capture the full breadth of EPC detail fields here so callers can
// surface as much or as little as they need. The normalised
// `EpcCertificate` shape below is the camelCase contract for the rest
// of the app.
const numLike = z.union([z.number(), z.string()]).optional();
export const EpcCertificateRawSchema = z
  .object({
    certificate_number: z.string().optional(),
    uprn: z.union([z.number(), z.string()]).nullable().optional(),
    address_line_1: z.string().optional(),
    address_line_2: z.string().nullable().optional(),
    address_line_3: z.string().nullable().optional(),
    address_line_4: z.string().nullable().optional(),
    post_town: z.string().optional(),
    postcode: z.string().optional(),
    assessment_type: z.string().optional(),
    council: z.string().optional(),
    constituency: z.string().optional(),

    // Ratings + bands
    current_energy_efficiency_band: z.string().optional(),
    potential_energy_efficiency_band: z.string().optional(),
    current_energy_efficiency_rating: z.number().optional(),
    potential_energy_efficiency_rating: z.number().optional(),
    environment_impact_current: z.number().optional(),
    environment_impact_potential: z.number().optional(),
    energy_consumption_current: z.number().optional(),
    energy_consumption_potential: z.number().optional(),
    co2_emissions_current: z.number().optional(),
    co2_emissions_potential: z.number().optional(),

    // Property classification
    // - property_type: top-level category ("House", "Flat", "Bungalow", "Maisonette", "Park home")
    // - dwelling_type: combined classification ("Detached house",
    //   "Semi-detached house", etc.) — present in some API releases,
    //   conceptually property_type + built_form merged.
    property_type: z.string().optional(),
    dwelling_type: z.string().optional(),
    built_form: z.string().optional(),
    construction_age_band: z.string().optional(),
    tenure: z.string().optional(),
    total_floor_area: numLike,
    floor_height: numLike,
    extension_count: z.number().optional(),
    number_habitable_rooms: z.number().optional(),
    number_heated_rooms: z.number().optional(),

    // Heating
    main_fuel: z.string().optional(),
    main_heating_description: z.string().optional(),
    mainheat_energy_eff: z.string().optional(),
    mainheatcont_description: z.string().optional(),
    mainheatcont_energy_eff: z.string().optional(),
    hot_water_description: z.string().optional(),
    hot_water_energy_eff: z.string().optional(),
    mains_gas_flag: z.string().optional(),

    // Fabric + glazing
    walls_description: z.string().optional(),
    walls_energy_eff: z.string().optional(),
    roof_description: z.string().optional(),
    roof_energy_eff: z.string().optional(),
    floor_description: z.string().optional(),
    floor_energy_eff: z.string().optional(),
    windows_description: z.string().optional(),
    windows_energy_eff: z.string().optional(),
    glazed_type: z.string().optional(),
    glazed_area: z.string().optional(),
    multi_glaze_proportion: z.number().optional(),

    // Lighting
    lighting_description: z.string().optional(),
    lighting_energy_eff: z.string().optional(),
    low_energy_lighting: z.number().optional(),
    fixed_lighting_outlets_count: z.number().optional(),
    low_energy_fixed_lighting: z.number().optional(),

    // Per-bill breakdown (£/yr)
    heating_cost_current: numLike,
    heating_cost_potential: numLike,
    hot_water_cost_current: numLike,
    hot_water_cost_potential: numLike,
    lighting_cost_current: numLike,
    lighting_cost_potential: numLike,

    // Admin
    transaction_type: z.string().optional(),
    registration_date: z.string().optional(),

    // Lodgement + inspection — modern API names. The historical
    // open-data endpoint exposed `inspection_date` + `lodgement_date`;
    // the new GOV.UK one ships both plus an ISO datetime variant.
    inspection_date: z.string().optional(),
    lodgement_date: z.string().optional(),
    lodgement_datetime: z.string().optional(),

    // Assessor / accreditation. Different schemes name these slightly
    // differently across releases — we keep all the variants we've
    // seen in the wild and expose the first non-empty value as the
    // canonical field downstream.
    assessor_name: z.string().optional(),
    inspector_name: z.string().optional(),
    inspector_company_name: z.string().optional(),
    accreditation_scheme: z.string().optional(),
    accredited_assessor_id: z.string().optional(),
    energy_assessor_email: z.string().optional(),
    assessor_email: z.string().optional(),
    inspector_email: z.string().optional(),
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

  // Fabric + glazing
  wallsDescription: z.string().nullable(),
  wallsEnergyEff: z.string().nullable(),
  roofDescription: z.string().nullable(),
  roofEnergyEff: z.string().nullable(),
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

// Shape returned by /api/epc/by-address
export const EpcByAddressResponseSchema = z.union([
  z.object({
    found: z.literal(true),
    matchMethod: z.enum(["uprn", "postcode+address"]),
    certificate: EpcCertificateSchema,
    registrationDate: z.string(),
    ageYears: z.number().nullable(),
  }),
  z.object({ found: z.literal(false), reason: z.string() }),
]);

export type EpcByAddressResponse = z.infer<typeof EpcByAddressResponseSchema>;
