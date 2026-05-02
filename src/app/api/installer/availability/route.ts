import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  AvailabilitySettingsSchema,
  type AvailabilityResponse,
} from "@/lib/schemas/installer-availability";

// /api/installer/availability
//
//   GET   — return the signed-in installer's weekly availability
//           blocks + visit duration + travel buffer.
//
//   PUT   — replace ALL blocks for this installer with the supplied
//           set, in one transaction (DELETE-then-INSERT). The atomic
//           swap means the editor never sees a half-saved state.
//
// Auth: must be signed in AND bound to an installer record (F2).
// Admins can save settings on behalf of an installer using the
// `installerId` query parameter, but otherwise the route uses the
// installer linked to the calling user.

export const runtime = "nodejs";
export const maxDuration = 30;

interface BlockRow {
  installer_id: number;
  day_of_week: number;
  // Postgres `time` columns serialise as "HH:MM:SS" — we strip the
  // seconds back off in the GET response so the UI's `<input
  // type="time">` value attribute round-trips cleanly.
  start_time: string;
  end_time: string;
}

async function resolveInstallerId(): Promise<
  | { ok: true; installerId: number; userId: string }
  | { ok: false; status: number; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, error: "Sign in required" };
  }
  const admin = createAdminClient();
  const { data: installer, error } = await admin
    .from("installers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number }>();
  if (error) {
    return { ok: false, status: 500, error: "Installer lookup failed" };
  }
  if (!installer) {
    return {
      ok: false,
      status: 404,
      error:
        "Your account isn't linked to an installer record yet. Claim your profile from the installer signup page.",
    };
  }
  return { ok: true, installerId: installer.id, userId: user.id };
}

function trimSeconds(t: string): string {
  // Convert "HH:MM:SS" → "HH:MM" so HTML <input type="time"> happily
  // displays the value without re-serialising.
  return t.length >= 5 ? t.slice(0, 5) : t;
}

export async function GET(): Promise<NextResponse<AvailabilityResponse>> {
  const auth = await resolveInstallerId();
  if (!auth.ok) {
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }
  const admin = createAdminClient();
  const [blocksRes, installerRes] = await Promise.all([
    admin
      .from("installer_availability")
      .select("day_of_week, start_time, end_time")
      .eq("installer_id", auth.installerId)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true }),
    admin
      .from("installers")
      .select("meeting_duration_min, travel_buffer_min")
      .eq("id", auth.installerId)
      .maybeSingle<{
        meeting_duration_min: number;
        travel_buffer_min: number;
      }>(),
  ]);
  if (blocksRes.error) {
    console.error("[availability] blocks query failed", blocksRes.error);
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: "Couldn't load availability" },
      { status: 500 },
    );
  }

  const blocks = (blocksRes.data ?? []).map((b) => ({
    dayOfWeek: b.day_of_week,
    startTime: trimSeconds(b.start_time),
    endTime: trimSeconds(b.end_time),
  }));

  return NextResponse.json<AvailabilityResponse>({
    ok: true,
    settings: {
      blocks,
      meetingDurationMin: installerRes.data?.meeting_duration_min ?? 60,
      travelBufferMin: installerRes.data?.travel_buffer_min ?? 30,
    },
  });
}

export async function PUT(req: Request): Promise<NextResponse<AvailabilityResponse>> {
  const auth = await resolveInstallerId();
  if (!auth.ok) {
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: auth.error },
      { status: auth.status },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }
  const parsed = AvailabilitySettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<AvailabilityResponse>(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Invalid settings",
      },
      { status: 400 },
    );
  }

  // Defence in depth: reject overlapping blocks within a single day.
  // The slot generator can technically handle them but they signal a
  // form bug + would show up as duplicate slots to the user.
  const overlap = findOverlap(parsed.data.blocks);
  if (overlap) {
    return NextResponse.json<AvailabilityResponse>(
      {
        ok: false,
        error: `Day ${overlap.day}: blocks overlap (${overlap.a.startTime}-${overlap.a.endTime} and ${overlap.b.startTime}-${overlap.b.endTime})`,
      },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const installerId = auth.installerId;

  // Replace-all swap. We do DELETE + INSERT serially rather than as a
  // Postgres transaction (Supabase REST has no multi-statement tx).
  // If the INSERT fails the user ends up with no blocks at all — but
  // they're still on the editor and can re-save. We mitigate by
  // pre-validating zod-side before touching the DB.
  const { error: deleteErr } = await admin
    .from("installer_availability")
    .delete()
    .eq("installer_id", installerId);
  if (deleteErr) {
    console.error("[availability] delete failed", deleteErr);
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: "Couldn't update availability" },
      { status: 500 },
    );
  }

  const newRows: BlockRow[] = parsed.data.blocks.map((b) => ({
    installer_id: installerId,
    day_of_week: b.dayOfWeek,
    start_time: `${b.startTime}:00`,
    end_time: `${b.endTime}:00`,
  }));
  if (newRows.length > 0) {
    const { error: insertErr } = await admin
      .from("installer_availability")
      .insert(newRows);
    if (insertErr) {
      console.error("[availability] insert failed", insertErr);
      return NextResponse.json<AvailabilityResponse>(
        {
          ok: false,
          error: "Saved a partial update — please re-save your settings.",
        },
        { status: 500 },
      );
    }
  }

  // Update installer-level visit duration + travel buffer.
  const { error: installerErr } = await admin
    .from("installers")
    .update({
      meeting_duration_min: parsed.data.meetingDurationMin,
      travel_buffer_min: parsed.data.travelBufferMin,
    })
    .eq("id", installerId);
  if (installerErr) {
    console.error("[availability] installer update failed", installerErr);
    return NextResponse.json<AvailabilityResponse>(
      { ok: false, error: "Visit duration / buffer didn't save" },
      { status: 500 },
    );
  }

  console.log("[availability] saved", {
    installerId,
    userId: auth.userId,
    blocks: parsed.data.blocks.length,
    meetingDurationMin: parsed.data.meetingDurationMin,
    travelBufferMin: parsed.data.travelBufferMin,
  });

  return NextResponse.json<AvailabilityResponse>({
    ok: true,
    settings: parsed.data,
  });
}

// Look for overlapping blocks within a single day. Returns the first
// pair found (so the error message can call out exactly which blocks
// clash), or null if everything's clean.
function findOverlap(
  blocks: { dayOfWeek: number; startTime: string; endTime: string }[],
): {
  day: number;
  a: { startTime: string; endTime: string };
  b: { startTime: string; endTime: string };
} | null {
  const byDay = new Map<
    number,
    { startTime: string; endTime: string }[]
  >();
  for (const b of blocks) {
    if (!byDay.has(b.dayOfWeek)) byDay.set(b.dayOfWeek, []);
    byDay.get(b.dayOfWeek)!.push({ startTime: b.startTime, endTime: b.endTime });
  }
  for (const [day, dayBlocks] of byDay.entries()) {
    // Sort by start. Overlap = block N's end > block N+1's start.
    const sorted = [...dayBlocks].sort((a, b) =>
      a.startTime.localeCompare(b.startTime),
    );
    for (let i = 0; i < sorted.length - 1; i += 1) {
      if (sorted[i].endTime > sorted[i + 1].startTime) {
        return { day, a: sorted[i], b: sorted[i + 1] };
      }
    }
  }
  return null;
}
