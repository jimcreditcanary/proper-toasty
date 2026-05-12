// Verbatim extraction prompt for the v2 upload-only floorplan flow.
//
// Per spec Appendix A — do not edit without updating the contract
// review process. Each rule was negotiated against a specific failure
// mode in the test fixtures (Hereford Road / 1-bed flat / detached
// with garden); changing wording without re-running those fixtures
// risks regressing one of them.
//
// The prompt is deliberately model-agnostic — works on Sonnet 4.7
// today, will work on whatever the next vision-capable model is.

export const FLOORPLAN_EXTRACT_PROMPT = `You are a floorplan analyst. Given a floorplan image, produce a single JSON object matching the schema provided. Follow these rules strictly:

1. Extract what you can SEE on the plan. Read printed labels (room names, areas, address) exactly as printed.
2. Where a label is not printed, INFER from furniture and proportions (e.g. a room with a bed = bedroom; a room with a sofa and TV = living room). Add a note to the \`notes\` array describing what was inferred.
3. If areas are given in one unit only (sq ft or sq m), convert to the other using 1 sq m = 10.764 sq ft. Round sq_m to 1 decimal.
4. For \`heat_pump_eligibility\`, apply the following logic:
   - System type assumed: Air Source Heat Pump (ASHP) unless the plot clearly accommodates ground loops.
   - Peak heat demand estimate: floor_area_sq_m × specific_heat_loss_W_per_sq_m / 1000. Use 60 W/m² for modern/well-insulated, 70 W/m² for typical mid-terrace Victorian/Edwardian, 90 W/m² for detached/older/uninsulated. State your basis in \`assumed_specific_heat_loss_basis\`.
   - Recommended capacity range: [peak × 0.85, peak × 1.15], rounded to nearest kW.
   - Annual demand: peak × 1500 (UK degree-day rough conversion). Round to nearest 500 kWh.
   - Score 0–10: start at 5. +1 for private outdoor space, +1 for mid-terrace or semi (lower heat loss), +1 for evidence of recent fabric upgrades (loft conversion, extension), +1 for property size 80–200 m² (typical ASHP range), -1 for flat with no outdoor space, -2 for property in obvious conservation/period sensitive context (state as risk if uncertain), -1 if no obvious cylinder location.
   - For \`indicative_eligibility_score\` you MUST emit the working, not just the final score:
     * \`base_score\`: always the integer 5
     * \`adjustments\`: one entry per scoring rule you applied (positive or negative). Each entry is \`{ "delta": <signed integer>, "reason": <short phrase combining rule + evidence, e.g. "private outdoor space (rear garden confirmed)"> \}\`. Omit entries for rules that did not apply.
     * \`score_out_of_10\`: MUST equal \`base_score\` + sum of all \`adjustments[].delta\` values. The math will be validated and a mismatched output rejected.
     * \`rationale\`: one-sentence summary of why the score landed where it did, including any rules that were considered but not applied (e.g. "No deductions applied: not a flat, conservation status unconfirmed, cylinder location plausible on upper floors.").
5. For \`risk_factors_and_unknowns\`, mark \`determinable_from_floorplan\` as:
   - \`true\` only if the floorplan alone gives a definitive answer
   - \`"Partial"\` if the floorplan gives indicative evidence but a site visit is needed to confirm
   - \`false\` if the floorplan tells us nothing about this factor
6. Do not invent room labels that aren't supported by furniture or printed text.
7. Ignore handwritten annotations or personal names on the plan.
8. Output ONLY the JSON object. No prose, no markdown code fences, no preamble.`;

/**
 * Block schema reminder appended to the user message so the model
 * has the field-by-field shape inline. Keeps the call self-contained
 * — no separate schema-fetch step + no risk of the model inventing
 * fields that aren't in our Zod schema.
 *
 * Mirrors src/lib/schemas/floorplan-extract.ts. Updates here MUST
 * mirror the schema or extraction starts failing validation.
 */
export const FLOORPLAN_SCHEMA_HINT = `Schema:
{
  "property": {
    "address_label": string,
    "property_type": string,
    "total_floors": integer,
    "gross_internal_area": { "sq_ft": number, "sq_m": number },
    "orientation": {
      "compass_indicator": string,
      "rear_aspect": string,
      "front_aspect": string
    }
  },
  "floors": [
    {
      "level": string,
      "gross_internal_area": { "sq_ft": number, "sq_m": number },
      "layout_description": string,
      "rooms": [
        { "name": string, "location": string, "features": [string] }
      ],
      "external": [
        { "name": string, "features": [string] }
      ]
    }
  ],
  "summary": {
    "bedrooms_total": integer,
    "bathrooms_total": integer,
    "reception_rooms": integer,
    "kitchen_diners": integer,
    "outdoor_space": string,
    "notable_features": [string]
  },
  "heat_pump_eligibility": {
    "overall_assessment": string,
    "confidence": string,
    "scheme_context": {
      "applicable_grant": string,
      "grant_value_gbp": number,
      "system_type_assumed": string,
      "ground_source_viable": boolean,
      "ground_source_reason": string
    },
    "heat_demand_estimate": {
      "floor_area_sq_m": number,
      "assumed_specific_heat_loss_w_per_sq_m": number,
      "assumed_specific_heat_loss_basis": string,
      "estimated_peak_heat_demand_kw": number,
      "recommended_heat_pump_capacity_kw_range": [number, number],
      "estimated_annual_heat_demand_kwh": number,
      "caveat": string
    },
    "positive_factors": [string],
    "risk_factors_and_unknowns": [
      {
        "factor": string,
        "impact": string,
        "determinable_from_floorplan": boolean | "Partial"
      }
    ],
    "external_unit_siting": {
      "recommended_location": string,
      "approximate_footprint_required_m": string,
      "alternative_locations": [string],
      "front_elevation_siting": string
    },
    "indicative_eligibility_score": {
      "score_out_of_10": integer,
      "rationale": string,
      "base_score": integer,
      "adjustments": [
        { "delta": integer, "reason": string }
      ]
    },
    "recommended_next_steps": [string]
  },
  "notes": [string]
}`;
