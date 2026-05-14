"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  Plus,
  Trash2,
  Save,
  Clock,
  CheckCircle2,
  AlertCircle,
  Copy,
} from "lucide-react";
import type { AvailabilityResponse } from "@/lib/schemas/installer-availability";

// Editor surface for /installer/availability.
//
// State shape mirrors the API: an array of blocks (dayOfWeek + start
// + end) plus visit duration + travel buffer. We render seven day
// rows; each row may contain zero or more blocks. A day with no
// blocks is "off" — render greyed and offer a "+ add hours" button.
//
// Multiple blocks per day are supported (lunch break, split shift)
// and the API enforces non-overlap. The slot generator already
// handles arbitrary blocks per day.

const DAYS: { value: number; label: string; short: string }[] = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 0, label: "Sunday", short: "Sun" },
];

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

interface Block {
  dayOfWeek: number;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

interface State {
  blocks: Block[];
  meetingDurationMin: number;
  travelBufferMin: number;
}

interface Props {
  installerName: string;
}

export function AvailabilityEditor({ installerName }: Props) {
  const [state, setState] = useState<State | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);
  // Track what we initially loaded so the Save button can flag a
  // pristine state and skip the API call. Cheap, no formik etc.
  const [initialJson, setInitialJson] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/installer/availability");
      const json = (await res.json()) as AvailabilityResponse;
      if (!json.ok || !json.settings) {
        setError(json.error ?? "Couldn't load availability");
        return;
      }
      const next: State = {
        blocks: json.settings.blocks,
        meetingDurationMin: json.settings.meetingDurationMin,
        travelBufferMin: json.settings.travelBufferMin,
      };
      setState(next);
      setInitialJson(JSON.stringify(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !state) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading availability…
      </div>
    );
  }

  const dirty = JSON.stringify(state) !== initialJson;

  function blocksForDay(day: number): Block[] {
    return state!.blocks.filter((b) => b.dayOfWeek === day);
  }

  function update(next: State) {
    setState(next);
    setSavedFlash(false);
  }

  function addBlock(day: number) {
    update({
      ...state!,
      blocks: [
        ...state!.blocks,
        { dayOfWeek: day, startTime: "09:00", endTime: "17:00" },
      ],
    });
  }

  function removeBlock(day: number, index: number) {
    let seen = -1;
    update({
      ...state!,
      blocks: state!.blocks.filter((b) => {
        if (b.dayOfWeek !== day) return true;
        seen += 1;
        return seen !== index;
      }),
    });
  }

  function changeBlock(
    day: number,
    index: number,
    patch: Partial<Block>,
  ) {
    let seen = -1;
    update({
      ...state!,
      blocks: state!.blocks.map((b) => {
        if (b.dayOfWeek !== day) return b;
        seen += 1;
        if (seen !== index) return b;
        return { ...b, ...patch };
      }),
    });
  }

  // "Copy to all weekdays" convenience — takes Mon's blocks and
  // overlays them onto Tue-Fri. Saves a lot of clicking for the 90%
  // of installers who run a uniform Mon-Fri week.
  function copyMondayToWeekdays() {
    const mondayBlocks = blocksForDay(1);
    if (mondayBlocks.length === 0) {
      setError(
        "Add hours to Monday first — they'll be copied to Tuesday through Friday.",
      );
      return;
    }
    setError(null);
    const otherWeekdays = state!.blocks.filter(
      (b) => b.dayOfWeek === 0 || b.dayOfWeek === 1 || b.dayOfWeek === 6,
    );
    const replicated = [2, 3, 4, 5].flatMap((day) =>
      mondayBlocks.map((b) => ({
        dayOfWeek: day,
        startTime: b.startTime,
        endTime: b.endTime,
      })),
    );
    update({
      ...state!,
      blocks: [...otherWeekdays, ...replicated],
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSavedFlash(false);
    try {
      const res = await fetch("/api/installer/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      const json = (await res.json()) as AvailabilityResponse;
      if (!json.ok) {
        setError(json.error ?? "Couldn't save");
        return;
      }
      setInitialJson(JSON.stringify(state));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-1">
          <div>
            <h2 className="text-base font-semibold text-navy">
              Weekly hours
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              All times in UK local. Times respect British Summer Time
              automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={copyMondayToWeekdays}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors shrink-0"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy Mon → Tue-Fri
          </button>
        </div>

        <ul className="mt-5 divide-y divide-slate-100">
          {DAYS.map((day) => {
            const blocks = blocksForDay(day.value);
            const off = blocks.length === 0;
            return (
              <li
                key={day.value}
                className="py-3 flex flex-col sm:flex-row sm:items-start gap-3"
              >
                <div className="sm:w-32 flex items-center gap-2">
                  <span
                    className={`text-sm font-semibold ${
                      off ? "text-slate-400" : "text-navy"
                    }`}
                  >
                    {day.label}
                  </span>
                  {off && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      Off
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-2">
                  {blocks.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => addBlock(day.value)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral hover:text-coral-dark"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add hours
                    </button>
                  ) : (
                    <>
                      {blocks.map((b, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 flex-wrap"
                        >
                          <input
                            type="time"
                            value={b.startTime}
                            onChange={(e) =>
                              changeBlock(day.value, i, {
                                startTime: e.target.value,
                              })
                            }
                            step={900}
                            className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
                          />
                          <span className="text-slate-400 text-xs">to</span>
                          <input
                            type="time"
                            value={b.endTime}
                            onChange={(e) =>
                              changeBlock(day.value, i, {
                                endTime: e.target.value,
                              })
                            }
                            step={900}
                            className="h-9 px-3 rounded-lg bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
                          />
                          <button
                            type="button"
                            onClick={() => removeBlock(day.value, i)}
                            className="inline-flex items-center justify-center w-9 h-9 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove this block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addBlock(day.value)}
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-coral hover:text-coral-dark mt-1"
                      >
                        <Plus className="w-3 h-3" />
                        Add another
                      </button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-coral" />
          <h2 className="text-base font-semibold text-navy">
            Visit length
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Time per visit
            </label>
            <select
              value={state.meetingDurationMin}
              onChange={(e) =>
                update({
                  ...state,
                  meetingDurationMin: Number(e.target.value),
                })
              }
              className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
            >
              {DURATION_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              How long a single site survey takes you. Slots are
              generated in this size.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Travel buffer
            </label>
            <select
              value={state.travelBufferMin}
              onChange={(e) =>
                update({
                  ...state,
                  travelBufferMin: Number(e.target.value),
                })
              }
              className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
            >
              {[0, 15, 30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m === 0 ? "No buffer" : `${m} minutes`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Driving time we add either side of every visit, so two
              bookings can&rsquo;t stack back-to-back.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {savedFlash && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Saved. {installerName}&rsquo;s availability is updated for
            new bookings.
          </span>
        </div>
      )}

      <div className="sticky bottom-3 sm:bottom-6 z-10 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving || !dirty}
          className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              {dirty ? "Save changes" : "Saved"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
