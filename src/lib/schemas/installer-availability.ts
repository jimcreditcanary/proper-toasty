import { z } from "zod";

// Schemas for /api/installer/availability.
//
// Day numbering: 0 = Sunday … 6 = Saturday (JS Date.getDay()
// convention). Times are wall-clock Europe/London "HH:MM" — the
// existing slot generator (src/lib/booking/slots.ts) handles the
// UTC conversion + DST gymnastics, we just need to keep the same
// shape on the wire.

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
const TIME_FIELD = z
  .string()
  .regex(TIME_REGEX, "Time must be HH:MM (24-hour)");

export const AvailabilityBlockSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: TIME_FIELD,
    endTime: TIME_FIELD,
  })
  .superRefine((b, ctx) => {
    if (b.endTime <= b.startTime) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "End time must be after start time",
      });
    }
  });
export type AvailabilityBlock = z.infer<typeof AvailabilityBlockSchema>;

export const AvailabilitySettingsSchema = z.object({
  blocks: z
    .array(AvailabilityBlockSchema)
    .max(50, "Too many blocks (max 50 per week)"),
  // Visit duration — how long a single site survey takes. We
  // restrict to a sensible set rather than an open number, since
  // the slot generator works in clean increments.
  meetingDurationMin: z
    .number()
    .int()
    .refine((n) => [30, 45, 60, 90, 120].includes(n), {
      message: "Visit duration must be 30, 45, 60, 90 or 120 minutes",
    }),
  // Travel buffer either side of a visit (minutes). Hard-cap at 90
  // so a typo can't lock the calendar out.
  travelBufferMin: z.number().int().min(0).max(90),
});
export type AvailabilitySettings = z.infer<typeof AvailabilitySettingsSchema>;

export const AvailabilityResponseSchema = z.object({
  ok: z.boolean(),
  settings: AvailabilitySettingsSchema.optional(),
  error: z.string().optional(),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;
