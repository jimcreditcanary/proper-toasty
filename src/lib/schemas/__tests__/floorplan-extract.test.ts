import { describe, expect, it } from "vitest";
import { FloorplanExtractSchema } from "../floorplan-extract";

// Minimal valid fixture — every required field, edge values where
// they matter (0 bedrooms, single floor, empty optional arrays).
const MIN_VALID = {
  property: {
    address_label: "1 Example Street, London, SW1A 1AA",
    property_type: "Mid-terrace house",
    total_floors: 2,
    gross_internal_area: { sq_ft: 1076, sq_m: 100 },
    orientation: {
      compass_indicator: "N arrow visible top-right",
      rear_aspect: "south-facing",
      front_aspect: "north-facing",
    },
  },
  floors: [
    {
      level: "Ground",
      gross_internal_area: { sq_ft: 538, sq_m: 50 },
      layout_description: "Open-plan kitchen-diner with separate front reception.",
      rooms: [
        {
          name: "Reception",
          location: "front",
          features: ["bay window", "fireplace"],
        },
      ],
      external: [{ name: "Rear garden", features: ["west-facing"] }],
    },
    {
      level: "First",
      gross_internal_area: { sq_ft: 538, sq_m: 50 },
      layout_description: "Two bedrooms + bathroom off the landing.",
      rooms: [],
      external: [],
    },
  ],
  summary: {
    bedrooms_total: 2,
    bathrooms_total: 1,
    reception_rooms: 1,
    kitchen_diners: 1,
    outdoor_space: "Private rear garden, c. 8m deep",
    notable_features: ["bay window"],
  },
  heat_pump_eligibility: {
    overall_assessment: "Good candidate for an air-source heat pump.",
    confidence: "Medium — depends on radiator audit + cylinder location.",
    scheme_context: {
      applicable_grant: "Boiler Upgrade Scheme (BUS)",
      grant_value_gbp: 7500,
      system_type_assumed: "Air Source Heat Pump (ASHP)",
      ground_source_viable: false,
      ground_source_reason: "Mid-terrace plot is too narrow for ground loops.",
    },
    heat_demand_estimate: {
      floor_area_sq_m: 100,
      assumed_specific_heat_loss_w_per_sq_m: 70,
      assumed_specific_heat_loss_basis: "Typical Victorian mid-terrace.",
      estimated_peak_heat_demand_kw: 7,
      recommended_heat_pump_capacity_kw_range: [6, 8],
      estimated_annual_heat_demand_kwh: 10500,
      caveat: "Indicative only — MCS heat-loss survey required.",
    },
    positive_factors: ["Mid-terrace shares walls", "Loft converted"],
    risk_factors_and_unknowns: [
      {
        factor: "Cylinder location",
        impact: "Loft converted; needs first-floor cupboard",
        determinable_from_floorplan: "Partial",
      },
      {
        factor: "Conservation area status",
        impact: "May restrict external unit visibility",
        determinable_from_floorplan: false,
      },
    ],
    external_unit_siting: {
      recommended_location: "Rear of garden, west-facing wall",
      approximate_footprint_required_m: "1m x 1m unit + 0.3m clearance per side",
      alternative_locations: ["Side return"],
      front_elevation_siting: "Not recommended — MCS 020 + planning concerns.",
    },
    indicative_eligibility_score: {
      score_out_of_10: 7,
      rationale: "Outdoor space, mid-terrace, sized in target range.",
    },
    recommended_next_steps: [
      "Confirm conservation area status",
      "Audit radiator sizing",
    ],
  },
  notes: ["Reception type inferred from sofa + TV"],
};

describe("FloorplanExtractSchema", () => {
  it("accepts a fully-populated valid extract", () => {
    const parsed = FloorplanExtractSchema.safeParse(MIN_VALID);
    expect(parsed.success).toBe(true);
  });

  it("rejects missing required property fields", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broken: any = JSON.parse(JSON.stringify(MIN_VALID));
    delete broken.property.address_label;
    const parsed = FloorplanExtractSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("rejects an empty floors array", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const broken: any = JSON.parse(JSON.stringify(MIN_VALID));
    broken.floors = [];
    const parsed = FloorplanExtractSchema.safeParse(broken);
    expect(parsed.success).toBe(false);
  });

  it("accepts the 'Partial' literal on determinable_from_floorplan", () => {
    const partial = JSON.parse(JSON.stringify(MIN_VALID)) as {
      heat_pump_eligibility: {
        risk_factors_and_unknowns: Array<{
          determinable_from_floorplan: boolean | "Partial";
        }>;
      };
    };
    partial.heat_pump_eligibility.risk_factors_and_unknowns = [
      {
        determinable_from_floorplan: "Partial",
      } as never,
    ];
    // Note: the broken risk row drops `factor` + `impact` so this
    // overall parse fails, but the partial union itself should
    // accept the literal — verify by checking the issues list
    // doesn't complain about the determinable field specifically.
    const parsed = FloorplanExtractSchema.safeParse(partial);
    expect(parsed.success).toBe(false);
    const issues = parsed.success ? [] : parsed.error.issues;
    const determinableIssues = issues.filter((i) =>
      i.path.join(".").endsWith("determinable_from_floorplan"),
    );
    expect(determinableIssues).toHaveLength(0);
  });

  it("clamps eligibility score to 0-10", () => {
    const out = JSON.parse(JSON.stringify(MIN_VALID)) as {
      heat_pump_eligibility: {
        indicative_eligibility_score: { score_out_of_10: number };
      };
    };
    out.heat_pump_eligibility.indicative_eligibility_score.score_out_of_10 = 11;
    const parsed = FloorplanExtractSchema.safeParse(out);
    expect(parsed.success).toBe(false);
  });

  it("requires the capacity range to be a 2-tuple", () => {
    const out = JSON.parse(JSON.stringify(MIN_VALID)) as {
      heat_pump_eligibility: {
        heat_demand_estimate: {
          recommended_heat_pump_capacity_kw_range: number[];
        };
      };
    };
    out.heat_pump_eligibility.heat_demand_estimate.recommended_heat_pump_capacity_kw_range =
      [6];
    const parsed = FloorplanExtractSchema.safeParse(out);
    expect(parsed.success).toBe(false);
  });

  describe("eligibility score breakdown refine", () => {
    type ScoreSlot = {
      heat_pump_eligibility: {
        indicative_eligibility_score: {
          score_out_of_10: number;
          rationale: string;
          base_score?: number;
          adjustments?: { delta: number; reason: string }[];
        };
      };
    };

    it("accepts an extract without base_score / adjustments (backward compat)", () => {
      const out = JSON.parse(JSON.stringify(MIN_VALID));
      const parsed = FloorplanExtractSchema.safeParse(out);
      expect(parsed.success).toBe(true);
    });

    it("accepts a consistent breakdown where base + adjustments = score", () => {
      const out = JSON.parse(JSON.stringify(MIN_VALID)) as ScoreSlot;
      out.heat_pump_eligibility.indicative_eligibility_score = {
        score_out_of_10: 7,
        rationale: "ok",
        base_score: 5,
        adjustments: [
          { delta: 1, reason: "private outdoor space" },
          { delta: 1, reason: "mid-terrace" },
        ],
      };
      const parsed = FloorplanExtractSchema.safeParse(out);
      expect(parsed.success).toBe(true);
    });

    it("rejects a breakdown where the math doesn't add up", () => {
      const out = JSON.parse(JSON.stringify(MIN_VALID)) as ScoreSlot;
      out.heat_pump_eligibility.indicative_eligibility_score = {
        score_out_of_10: 8, // claims 8 but 5+1+1=7
        rationale: "inconsistent",
        base_score: 5,
        adjustments: [
          { delta: 1, reason: "outdoor space" },
          { delta: 1, reason: "fabric upgrades" },
        ],
      };
      const parsed = FloorplanExtractSchema.safeParse(out);
      expect(parsed.success).toBe(false);
      // The path should point at score_out_of_10 specifically so the
      // retry-prompt knows where to nudge the model.
      const paths = parsed.success
        ? []
        : parsed.error.issues.map((i) => i.path.join("."));
      expect(
        paths.some((p) => p.endsWith("score_out_of_10")),
      ).toBe(true);
    });

    it("handles negative adjustments correctly", () => {
      const out = JSON.parse(JSON.stringify(MIN_VALID)) as ScoreSlot;
      out.heat_pump_eligibility.indicative_eligibility_score = {
        score_out_of_10: 2,
        rationale: "flat + conservation",
        base_score: 5,
        adjustments: [
          { delta: -1, reason: "flat with no outdoor space" },
          { delta: -2, reason: "conservation area" },
        ],
      };
      const parsed = FloorplanExtractSchema.safeParse(out);
      expect(parsed.success).toBe(true);
    });
  });

  it("defaults empty arrays for optional list fields", () => {
    const trimmed = JSON.parse(JSON.stringify(MIN_VALID)) as {
      summary: { notable_features?: string[] };
      notes?: string[];
    };
    delete trimmed.summary.notable_features;
    delete trimmed.notes;
    const parsed = FloorplanExtractSchema.safeParse(trimmed);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.summary.notable_features).toEqual([]);
      expect(parsed.data.notes).toEqual([]);
    }
  });
});
