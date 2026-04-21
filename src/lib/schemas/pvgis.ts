import { z } from "zod";

const MonthlyItemSchema = z.object({
  month: z.number(),
  E_d: z.number().optional(),
  E_m: z.number(),
  "H(i)_d": z.number().optional(),
  "H(i)_m": z.number().optional(),
  SD_m: z.number().optional(),
});

export const PvgisPvcalcSchema = z.object({
  inputs: z.object({
    location: z.object({
      latitude: z.number(),
      longitude: z.number(),
      elevation: z.number().optional(),
    }),
    meteo_data: z
      .object({
        radiation_db: z.string().optional(),
        meteo_db: z.string().optional(),
      })
      .optional(),
    mounting_system: z
      .object({
        fixed: z
          .object({
            slope: z.object({ value: z.number(), optimal: z.boolean() }).optional(),
            azimuth: z.object({ value: z.number(), optimal: z.boolean() }).optional(),
            type: z.string().optional(),
          })
          .optional(),
      })
      .optional(),
  }),
  outputs: z.object({
    monthly: z
      .object({
        fixed: z.array(MonthlyItemSchema),
      })
      .optional(),
    totals: z.object({
      fixed: z.object({
        E_d: z.number().optional(),
        E_m: z.number().optional(),
        E_y: z.number(),
        "H(i)_d": z.number().optional(),
        "H(i)_m": z.number().optional(),
        "H(i)_y": z.number().optional(),
        SD_m: z.number().optional(),
        SD_y: z.number().optional(),
        l_aoi: z.number().optional(),
        l_spec: z.string().optional(),
        l_tg: z.number().optional(),
        l_total: z.number().optional(),
      }),
    }),
  }),
});

export type PvgisPvcalcResponse = z.infer<typeof PvgisPvcalcSchema>;

// What we expose back to callers — a trimmed, friendlier shape.
export interface PvgisResult {
  annualKwh: number;
  monthlyKwh: number[]; // 12 entries Jan..Dec
  inputs: {
    peakPowerKwp: number;
    anglePitchDegrees: number;
    aspectPvgis: number;
    googleAzimuthDegrees: number;
    systemLossPct: number;
  };
}
