import { z } from "zod";

export const FloodAlertSchema = z.object({
  severityLevel: z.number().int().min(1).max(4),
  severity: z.string(),
  description: z.string(),
  areaName: z.string().nullable(),
  timeRaised: z.string().nullable(),
});

export const FloodResponseSchema = z.object({
  activeWarnings: z.array(FloodAlertSchema),
});

export const ListedBuildingSchema = z.object({
  listEntryNumber: z.string().nullable(),
  name: z.string().nullable(),
  grade: z.string().nullable(),
  distanceMeters: z.number().nullable(),
});

export const ListedResponseSchema = z.object({
  matches: z.array(ListedBuildingSchema),
});

export const PlanningAreaSchema = z.object({
  dataset: z.string(),
  name: z.string().nullable(),
  entity: z.number().nullable(),
});

export const PlanningResponseSchema = z.object({
  conservationAreas: z.array(PlanningAreaSchema),
  aonb: z.array(PlanningAreaSchema),
  nationalParks: z.array(PlanningAreaSchema),
});

export type FloodResponse = z.infer<typeof FloodResponseSchema>;
export type ListedResponse = z.infer<typeof ListedResponseSchema>;
export type PlanningResponse = z.infer<typeof PlanningResponseSchema>;
