// Slot generator for installer site-survey bookings.
//
// Pure function: takes (installer's weekly availability, their existing
// booked meetings, a config) and returns the bookable 1-hour slots in
// the next N days. No DB access here — the caller fetches the inputs
// so this module stays trivially testable.
//
// ── Time-zone discipline ──────────────────────────────────────────────
// All availability rows are wall-clock Europe/London ("Mon 09:00 to
// 17:00"). The OUTPUT slots carry both:
//   - `startUtc` / `endUtc`        → for storage + comparison
//   - `dayLabel` / `timeLabel`     → for the UI in Europe/London
//
// We convert wall-time to UTC using `Intl.DateTimeFormat` (no external
// deps). The trick: take the desired wall components, treat them as if
// they were already UTC, ask Intl what THAT instant looks like in
// Europe/London, then subtract the offset between the two.
//
// ── DST ──────────────────────────────────────────────────────────────
// The two ambiguous wall-times each year:
//   - Spring forward (last Sunday March): 01:00–01:59 doesn't exist.
//   - Autumn back   (last Sunday October): 01:00–01:59 happens twice.
// With Mon–Fri 09:00–17:00 defaults, neither edge bites the booking
// flow. The helper still does the right thing for non-default blocks
// — `londonOffsetMinutes` returns the offset for the resulting instant
// so we don't end up with a slot that nominally exists in the schema
// but lands on a non-existent wall-clock minute.

export interface AvailabilityBlock {
  /** 0 = Sunday, 1 = Monday, ..., 6 = Saturday — JS Date.getDay() convention */
  dayOfWeek: number;
  /** "HH:MM" or "HH:MM:SS" — Europe/London wall clock */
  startTime: string;
  /** "HH:MM" or "HH:MM:SS" — Europe/London wall clock */
  endTime: string;
}

export interface ExistingMeeting {
  /** UTC ISO 8601 */
  scheduledAt: string | Date;
  durationMin: number;
  travelBufferMin: number;
}

export interface SlotGenInput {
  /** How many days from `now` to look ahead. Default: 28. */
  windowDays?: number;
  /** Slot length in minutes (the meeting itself). Default: 60. */
  slotDurationMin?: number;
  /** Spacing between slot start times. Default: 30. */
  slotIntervalMin?: number;
  /** Travel buffer applied either side of every slot. Default: 30. */
  travelBufferMin?: number;
  /** Reference "now" — defaults to real wall-clock. Test hook. */
  now?: Date;
  /** Earliest acceptable lead time before a booking (minutes). Default: 60. */
  minLeadMinutes?: number;
}

export interface BookableSlot {
  /** UTC ISO 8601 — meeting start */
  startUtc: string;
  /** UTC ISO 8601 — meeting end (start + duration) */
  endUtc: string;
  /** Europe/London wall date — "2026-05-04" */
  dayKey: string;
  /** Europe/London wall day label — "Mon 4 May" */
  dayLabel: string;
  /** Europe/London wall time label — "09:00" */
  timeLabel: string;
}

const LONDON_TZ = "Europe/London";

const DEFAULTS = {
  windowDays: 28,
  slotDurationMin: 60,
  slotIntervalMin: 30,
  travelBufferMin: 30,
  minLeadMinutes: 60,
};

// ─── Public entry point ─────────────────────────────────────────────────

export function generateSlots(
  availability: AvailabilityBlock[],
  existingMeetings: ExistingMeeting[],
  input: SlotGenInput = {},
): BookableSlot[] {
  const cfg = { ...DEFAULTS, ...input };
  const now = input.now ?? new Date();
  const earliestUtc = now.getTime() + cfg.minLeadMinutes * 60_000;

  // Pre-compute conflict windows in UTC ms — each existing meeting
  // blocks (start - buffer) .. (end + buffer).
  const conflicts = existingMeetings.map((m) => {
    const start =
      typeof m.scheduledAt === "string"
        ? new Date(m.scheduledAt).getTime()
        : m.scheduledAt.getTime();
    const end = start + m.durationMin * 60_000;
    return {
      blockStart: start - m.travelBufferMin * 60_000,
      blockEnd: end + m.travelBufferMin * 60_000,
    };
  });

  // Slot's own buffer extends its conflict footprint too — so two
  // bookings can't end up within travelBuffer of each other even when
  // the existing meeting itself has a 0 buffer.
  const slotBuffer = cfg.travelBufferMin * 60_000;
  const slotDur = cfg.slotDurationMin * 60_000;

  // Group availability by day-of-week for cheap lookup.
  const blocksByDow = new Map<number, AvailabilityBlock[]>();
  for (const b of availability) {
    if (!blocksByDow.has(b.dayOfWeek)) blocksByDow.set(b.dayOfWeek, []);
    blocksByDow.get(b.dayOfWeek)!.push(b);
  }

  const out: BookableSlot[] = [];
  // Walk the window day by day in Europe/London (so a day boundary
  // always falls at midnight London regardless of UTC offset).
  const today = londonDateParts(now);
  for (let dayOffset = 0; dayOffset < cfg.windowDays; dayOffset++) {
    const wallDate = addDays(today, dayOffset);
    // JS Date.getDay() — easy way to derive day-of-week from y/m/d
    // is to construct a UTC Date (TZ doesn't shift the calendar day
    // for noon-anchored UTC dates).
    const dow = new Date(
      Date.UTC(wallDate.year, wallDate.month - 1, wallDate.day, 12),
    ).getUTCDay();
    const blocks = blocksByDow.get(dow) ?? [];
    if (blocks.length === 0) continue;

    for (const block of blocks) {
      const [bStartH, bStartM] = parseTime(block.startTime);
      const [bEndH, bEndM] = parseTime(block.endTime);
      const blockEndMin = bEndH * 60 + bEndM;
      // First slot starts at the block start; subsequent every interval.
      let curMin = bStartH * 60 + bStartM;
      while (curMin + cfg.slotDurationMin <= blockEndMin) {
        const h = Math.floor(curMin / 60);
        const m = curMin % 60;
        const startUtc = londonWallToUtc(
          wallDate.year,
          wallDate.month,
          wallDate.day,
          h,
          m,
        );
        curMin += cfg.slotIntervalMin;

        const startMs = startUtc.getTime();
        const endMs = startMs + slotDur;

        // Prune: too soon
        if (startMs < earliestUtc) continue;

        // Prune: conflicts with an existing meeting (buffer-aware
        // on both sides).
        const conflict = conflicts.some(
          (c) =>
            startMs - slotBuffer < c.blockEnd &&
            endMs + slotBuffer > c.blockStart,
        );
        if (conflict) continue;

        out.push({
          startUtc: new Date(startMs).toISOString(),
          endUtc: new Date(endMs).toISOString(),
          dayKey: `${wallDate.year}-${pad2(wallDate.month)}-${pad2(wallDate.day)}`,
          dayLabel: formatDayLabel(wallDate, dow),
          timeLabel: `${pad2(h)}:${pad2(m)}`,
        });
      }
    }
  }

  return out;
}

// ─── Date / time helpers ────────────────────────────────────────────────

interface WallDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** Wall date components for `instant` in Europe/London. */
export function londonDateParts(instant: Date): WallDate {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = fmt.formatToParts(instant);
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? "0");
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Add `n` calendar days to a wall date, handling month/year rollover. */
function addDays(d: WallDate, n: number): WallDate {
  // Use a UTC date as the carrier — TZ doesn't matter for adding days.
  const utc = new Date(Date.UTC(d.year, d.month - 1, d.day));
  utc.setUTCDate(utc.getUTCDate() + n);
  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
  };
}

/**
 * Convert a Europe/London wall-clock moment to its UTC instant.
 *
 * The naive approach (Date.UTC then subtract offset) needs a sanity
 * check: the offset depends on whether the *resulting* UTC instant is
 * inside BST. We compute the offset twice — once at the naive UTC,
 * once at the corrected UTC — to pin down DST transition edges.
 * Outside the 2 ambiguous hours per year, both passes agree.
 */
export function londonWallToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  // Pretend it's UTC — gives us a candidate instant.
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  // Offset London is currently observing at that candidate.
  let offsetMin = londonOffsetMinutes(new Date(naive));
  let corrected = naive - offsetMin * 60_000;
  // If the corrected instant falls into a different offset (DST jump),
  // re-evaluate once. Two passes is enough for any sane wall time.
  const offsetCheck = londonOffsetMinutes(new Date(corrected));
  if (offsetCheck !== offsetMin) {
    offsetMin = offsetCheck;
    corrected = naive - offsetMin * 60_000;
  }
  return new Date(corrected);
}

/** UTC-offset of Europe/London at `instant`, in minutes. +60 in BST, 0 in GMT. */
export function londonOffsetMinutes(instant: Date): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: LONDON_TZ,
    timeZoneName: "longOffset",
  });
  const parts = fmt.formatToParts(instant);
  const tzPart = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  // "GMT" or "GMT+01:00"
  const m = /^GMT(?:([+-])(\d{2}):(\d{2}))?$/.exec(tzPart);
  if (!m) return 0;
  if (!m[1]) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  return sign * (Number(m[2]) * 60 + Number(m[3]));
}

function parseTime(t: string): [number, number] {
  // Accept "HH:MM" or "HH:MM:SS" (Postgres TIME serialises as HH:MM:SS)
  const [h, m] = t.split(":").map(Number);
  return [h, m];
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDayLabel(d: WallDate, dow: number): string {
  return `${DAY_NAMES[dow]} ${d.day} ${MONTH_NAMES[d.month - 1]}`;
}
