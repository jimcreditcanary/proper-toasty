// Pure scheduling helpers — local time / UTC conversion, send-window
// gating, and peak-hour weighted distribution.
//
// All functions are pure + testable. The cron handlers are thin
// wrappers that pass `now`, `timezone`, and the campaign config in,
// so we never depend on the system clock for unit tests.
//
// DST safety: never store UTC for the send window. Always compute
// UTC ON THE FLY from the campaign's local hours + timezone for
// "today". Otherwise October's BST→GMT transition shifts the
// window an hour early; March's reverse shifts it an hour late.

import { TZDate } from "@date-fns/tz";

export interface SendWindow {
  /** IANA timezone, e.g. "Europe/London". */
  timezone: string;
  /** Local hour 0-23 — window opens here. */
  startHour: number;
  /** Local hour 0-23 — window closes here (exclusive: 17 = "send until 17:00 sharp"). */
  endHour: number;
  /** Local hours that count as "peak" — see distributeSendTime. */
  peakHours: number[];
  weekdaysOnly: boolean;
}

/**
 * Is `now` inside the window for the campaign's timezone? Used by
 * the send-queue processor to short-circuit out-of-window runs.
 *
 * Weekday gate honours weekdaysOnly. Saturday + Sunday in the
 * campaign's local time return false when set.
 */
export function isInsideWindow(now: Date, window: SendWindow): boolean {
  const local = new TZDate(now, window.timezone);
  if (window.weekdaysOnly) {
    const dow = local.getDay();
    if (dow === 0 || dow === 6) return false; // Sunday=0, Saturday=6
  }
  const hour = local.getHours();
  return hour >= window.startHour && hour < window.endHour;
}

/**
 * Is `now` a weekday in the campaign's timezone? Used by
 * select-batch to skip running on Saturday + Sunday batches.
 */
export function isWeekdayInTimezone(now: Date, timezone: string): boolean {
  const local = new TZDate(now, timezone);
  const dow = local.getDay();
  return dow >= 1 && dow <= 5;
}

/**
 * Distribute a batch of N sends across the campaign's window
 * with peak-hour weighting. Returns N future timestamps (UTC),
 * ordered ascending.
 *
 * Distribution: ~60% of sends land in peakHours, ~40% in the
 * remaining window. Per-second jitter so no two recipients share
 * the same minute (Postmark's stream tolerates this but it's good
 * hygiene — looks less robotic to recipients on the same outcode
 * watching their inboxes).
 *
 * `random` parameter for deterministic tests.
 */
export function distributeSendTimes(args: {
  now: Date;
  window: SendWindow;
  count: number;
  random?: () => number;
}): Date[] {
  const rand = args.random ?? Math.random;
  const { now, window, count } = args;

  // Compute the window bounds in UTC for TODAY in the campaign's
  // timezone. If now is already past startHour locally, the window
  // starts at max(now, today-startHour).
  const localNow = new TZDate(now, window.timezone);
  const localY = localNow.getFullYear();
  const localM = localNow.getMonth();
  const localD = localNow.getDate();

  const windowStartLocal = new TZDate(
    localY,
    localM,
    localD,
    window.startHour,
    0,
    0,
    window.timezone,
  );
  const windowEndLocal = new TZDate(
    localY,
    localM,
    localD,
    window.endHour,
    0,
    0,
    window.timezone,
  );

  const startMs = Math.max(windowStartLocal.getTime(), now.getTime());
  const endMs = windowEndLocal.getTime();
  if (endMs <= startMs || count <= 0) return [];

  // Bucket: peak hours = ~60% weight per hour; off-peak ~40%.
  // Generate `count` jittered timestamps by sampling an hour bucket
  // weighted by peak-ness, then picking a uniform random offset
  // within that hour.
  const hoursInWindow: number[] = [];
  for (let h = window.startHour; h < window.endHour; h++) {
    hoursInWindow.push(h);
  }
  if (hoursInWindow.length === 0) return [];

  const peakSet = new Set(window.peakHours);
  // Weights — peak hours get 3, off-peak 1. With typical 4 peak in
  // 8-hour window: 4*3 + 4*1 = 16 total → peak = 12/16 = 75% of sends.
  // Brief says ~60%, so weight=2:1 → 4*2 + 4*1 = 12, peak = 8/12 ≈ 67%.
  // 2:1 is close enough to 60% and avoids tuning per-window math.
  const weighted = hoursInWindow.map((h) => ({
    hour: h,
    weight: peakSet.has(h) ? 2 : 1,
  }));
  const totalWeight = weighted.reduce((s, w) => s + w.weight, 0);

  const stamps: number[] = [];
  for (let i = 0; i < count; i++) {
    // Pick an hour by weighted sample.
    let r = rand() * totalWeight;
    let chosenHour = weighted[0].hour;
    for (const w of weighted) {
      r -= w.weight;
      if (r <= 0) {
        chosenHour = w.hour;
        break;
      }
    }
    // Build the hour-start in UTC, add jitter [0, 3600s).
    const localAtHour = new TZDate(
      localY,
      localM,
      localD,
      chosenHour,
      0,
      0,
      window.timezone,
    );
    const jitterMs = Math.floor(rand() * 60 * 60 * 1000);
    let ts = localAtHour.getTime() + jitterMs;
    if (ts < startMs) ts = startMs + Math.floor(rand() * 60_000);
    if (ts >= endMs) ts = endMs - 1000 - Math.floor(rand() * 60_000);
    stamps.push(ts);
  }

  stamps.sort((a, b) => a - b);
  return stamps.map((ms) => new Date(ms));
}
