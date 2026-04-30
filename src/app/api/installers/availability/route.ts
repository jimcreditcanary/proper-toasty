import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AvailabilityRequestSchema,
  type AvailabilityResponse,
} from "@/lib/schemas/booking";
import {
  generateSlots,
  type AvailabilityBlock,
  type ExistingMeeting,
} from "@/lib/booking/slots";

// POST /api/installers/availability
//
// Returns the bookable 1-hour slots for an installer over the next
// 28 days. Pure read endpoint — the booking modal calls this on open.
//
// Source of truth lives in two tables:
//   - installer_availability  → recurring weekly blocks
//   - installer_meetings (status=booked) → existing bookings to subtract
//
// The slot generator (src/lib/booking/slots.ts) does all the
// arithmetic: intersects the blocks, applies a 30-min travel buffer
// either side of every meeting, prunes past slots and anything inside
// the lead-time, returns Europe/London labels alongside UTC instants.
//
// Never returns 500 to the booking modal — wraps unexpected failures
// in {ok:false, error}. The client renders the error inline.

export const runtime = "nodejs";

const WINDOW_DAYS = 28;
const SLOT_INTERVAL_MIN = 30;
const MIN_LEAD_MINUTES = 60;
// Hard fallbacks if the installer record is missing the columns for
// some reason — same defaults the migration backfills with.
const FALLBACK_DURATION_MIN = 60;
const FALLBACK_BUFFER_MIN = 30;

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, slots: [], error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const parsed = AvailabilityRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json<AvailabilityResponse>(
      {
        ok: false,
        slots: [],
        error: parsed.error.issues[0]?.message ?? "Invalid request",
      },
      { status: 400 },
    );
  }

  const { installerId } = parsed.data;
  const admin = createAdminClient();

  // Fetch installer settings + availability + existing meetings in
  // parallel. All three are tiny reads keyed on installer_id.
  const windowEnd = new Date();
  windowEnd.setDate(windowEnd.getDate() + WINDOW_DAYS + 1); // +1 day slack

  const [installerResult, availResult, meetingsResult] = await Promise.all([
    admin
      .from("installers")
      .select("meeting_duration_min, travel_buffer_min")
      .eq("id", installerId)
      .maybeSingle<{
        meeting_duration_min: number;
        travel_buffer_min: number;
      }>(),
    admin
      .from("installer_availability")
      .select("day_of_week, start_time, end_time")
      .eq("installer_id", installerId),
    admin
      .from("installer_meetings")
      .select("scheduled_at, duration_min, travel_buffer_min")
      .eq("installer_id", installerId)
      // Pending + booked both hold the slot — only confirmed cancellations
      // / completions / no-shows are released back to bookable.
      .in("status", ["pending", "booked"])
      .gte("scheduled_at", new Date().toISOString())
      .lte("scheduled_at", windowEnd.toISOString()),
  ]);

  if (availResult.error) {
    console.error("[availability] availability lookup failed", availResult.error);
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, slots: [], error: "Database error" },
      { status: 500 },
    );
  }
  if (meetingsResult.error) {
    console.error("[availability] meetings lookup failed", meetingsResult.error);
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, slots: [], error: "Database error" },
      { status: 500 },
    );
  }

  const slotDurationMin =
    installerResult.data?.meeting_duration_min ?? FALLBACK_DURATION_MIN;
  const travelBufferMin =
    installerResult.data?.travel_buffer_min ?? FALLBACK_BUFFER_MIN;

  const availability: AvailabilityBlock[] = (availResult.data ?? []).map((r) => ({
    dayOfWeek: r.day_of_week,
    startTime: r.start_time,
    endTime: r.end_time,
  }));

  const existingMeetings: ExistingMeeting[] = (meetingsResult.data ?? []).map(
    (r) => ({
      scheduledAt: r.scheduled_at,
      durationMin: r.duration_min,
      travelBufferMin: r.travel_buffer_min,
    }),
  );

  const slots = generateSlots(availability, existingMeetings, {
    windowDays: WINDOW_DAYS,
    slotDurationMin,
    slotIntervalMin: SLOT_INTERVAL_MIN,
    travelBufferMin,
    minLeadMinutes: MIN_LEAD_MINUTES,
  });

  return NextResponse.json<AvailabilityResponse>({ ok: true, slots });
}
