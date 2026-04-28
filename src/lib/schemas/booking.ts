// Schemas for the new booking flow (PR B.2 onwards).
//
// `installer_availability` (recurring weekly blocks) + the booking
// slot generator (src/lib/booking/slots.ts) feed the
// `/api/installers/availability` endpoint which returns a flat list
// of bookable slots. The booking modal renders that list and POSTs
// the chosen slot back via `/api/installer-leads/create` with the
// `meeting` envelope appended.

import { z } from "zod";

// ─── Availability request / response ────────────────────────────────────

export const AvailabilityRequestSchema = z.object({
  installerId: z.number().int().positive(),
});
export type AvailabilityRequest = z.infer<typeof AvailabilityRequestSchema>;

// Mirror of `BookableSlot` from src/lib/booking/slots.ts — declared
// here so the wire shape stays explicit.
export const BookableSlotSchema = z.object({
  startUtc: z.string().datetime(),
  endUtc: z.string().datetime(),
  dayKey: z.string(), // YYYY-MM-DD (Europe/London wall date)
  dayLabel: z.string(), // "Mon 4 May"
  timeLabel: z.string(), // "09:00"
});
export type BookableSlot = z.infer<typeof BookableSlotSchema>;

export const AvailabilityResponseSchema = z.object({
  ok: z.boolean(),
  slots: z.array(BookableSlotSchema).default([]),
  error: z.string().optional(),
});
export type AvailabilityResponse = z.infer<typeof AvailabilityResponseSchema>;

// ─── Meeting envelope (attached to CreateInstallerLeadRequest) ──────────
// The booking modal appends this when the user has chosen a slot. The
// existing /api/installer-leads/create endpoint reads it and inserts a
// matching row into installer_meetings.

export const MeetingPayloadSchema = z.object({
  scheduledAtUtc: z.string().datetime("Invalid slot timestamp"),
  durationMin: z.number().int().positive().default(60),
  travelBufferMin: z.number().int().min(0).default(30),
});
export type MeetingPayload = z.infer<typeof MeetingPayloadSchema>;

// ─── UK mobile validator ────────────────────────────────────────────────
// Used by the booking form for the now-mandatory phone field. Accepts
//   07700 900123      (national)
//   +44 7700 900123   (international with +)
//   447700900123      (international without +)
// — and the equivalents with no spaces, hyphens between groups, etc.
// Mobile-only (07x): the booking flow needs a number a human can answer
// quickly to confirm a slot, not a switchboard.
//
// Strip separators (spaces / hyphens) before matching so we don't have
// to enumerate every grouping installers / homeowners might use.
const UK_MOBILE_DIGITS_REGEX = /^(?:\+?44|0)7\d{9}$/;

export function isValidUkMobile(v: string): boolean {
  return UK_MOBILE_DIGITS_REGEX.test(v.trim().replace(/[\s-]/g, ""));
}

/**
 * Normalise a UK mobile to E.164 (+447700900123). Returns null for
 * obvious non-matches; does NOT do strict validation.
 */
export function normaliseUkMobile(v: string): string | null {
  const stripped = v.replace(/[\s-]/g, "");
  let digits: string;
  if (stripped.startsWith("+44")) {
    digits = stripped.slice(3);
  } else if (stripped.startsWith("44")) {
    digits = stripped.slice(2);
  } else if (stripped.startsWith("0")) {
    digits = stripped.slice(1);
  } else {
    return null;
  }
  if (!/^7\d{8,9}$/.test(digits)) return null;
  return `+44${digits}`;
}
