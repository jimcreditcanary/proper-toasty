"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useCheckWizard } from "./context";
import { upsertCheck } from "./persist";
import type { AnalyseResponse } from "@/lib/schemas/analyse";

type Stage = "idle" | "running" | "done" | "error";

const MESSAGES = [
  "Looking up your EPC…",
  "Checking roof geometry and sunshine hours…",
  "Estimating solar yield from UK climate data…",
  "Reading your floorplan…",
  "Stitching it together…",
];

export function Step5Analysis() {
  const { state, update, next, back } = useCheckWizard();
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messageIdx, setMessageIdx] = useState(0);
  const firedRef = useRef(false);
  // Latest-state ref so the upsert call inside the .then closure
  // doesn't trigger an exhaustive-deps re-fire of the analyse effect.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (firedRef.current) return;
    // Three-variant gate. Solar focus skips the floorplan step
    // entirely so requiring a floorplan key would lock the user
    // out. Heat-pump + all need EITHER the legacy
    // floorplanObjectKey (old builder path) OR the v2
    // floorplanExtract (new upload-only path).
    const focus = state.focus ?? "all";
    const haveFloorplan =
      focus === "solar"
        ? true
        : Boolean(state.floorplanObjectKey || state.floorplanExtract);
    if (
      !state.address ||
      !haveFloorplan ||
      state.interests.length === 0 ||
      !state.tenure ||
      !state.currentHeatingFuel
    ) {
      return;
    }
    firedRef.current = true;
    setStage("running");

    fetch("/api/analyse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        address: state.address,
        country: state.country,
        questionnaire: {
          interests: state.interests,
          tenure: state.tenure,
          currentHeatingFuel: state.currentHeatingFuel,
          priorHeatPumpFunding: state.priorHeatPumpFunding ?? undefined,
          electricityTariff: state.electricityTariff,
          gasTariff: state.gasTariff,
        },
        // Legacy field — empty string when the v2 upload-only flow
        // didn't store the raw image key on wizard state. The
        // analyse endpoint defaults this to "" and synthesises an
        // empty floorplan downstream.
        floorplanObjectKey: state.floorplanObjectKey ?? "",
        // Step 4 already ran the floorplan analysis (with the user's edits).
        // Pass it through so /api/analyse skips its own Claude vision call.
        precomputedFloorplan: state.floorplanAnalysis
          ? {
              analysis: state.floorplanAnalysis,
              degraded: state.floorplanDegraded,
              reason: state.floorplanDegradedReason ?? undefined,
            }
          : undefined,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `Analyse failed (${res.status})`);
        }
        return (await res.json()) as AnalyseResponse;
      })
      .then((data) => {
        update({ analysis: data });
        setStage("done");
        // Persist final state — flips check.status from 'draft' to
        // 'complete' and writes the floorplan analysis (with metrics)
        // to check_results. Fire-and-forget; failures don't gate
        // the report viewing.
        void upsertCheck({
          state: { ...stateRef.current, analysis: data },
          status: "complete",
        });
        // Brief pause so users see the "done" state, then auto-advance.
        setTimeout(() => next(), 900);
      })
      .catch((e) => {
        setError(e?.message ?? "Analysis failed");
        setStage("error");
      });
  }, [
    state.address,
    state.country,
    state.floorplanObjectKey,
    // V2 upload flow + focus variants — both gate the auto-fire
    // effect so changes need to retrigger the dependency check.
    state.floorplanExtract,
    state.focus,
    state.interests,
    state.tenure,
    state.currentHeatingFuel,
    state.priorHeatPumpFunding,
    state.electricityTariff,
    state.gasTariff,
    update,
    next,
  ]);

  // Rotate messaging every 1.6s while the call runs — purely cosmetic.
  useEffect(() => {
    if (stage !== "running") return;
    const t = setInterval(() => {
      setMessageIdx((i) => (i + 1) % MESSAGES.length);
    }, 1600);
    return () => clearInterval(t);
  }, [stage]);

  return (
    <div className="max-w-xl mx-auto w-full text-center">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
        Running the analysis
      </h1>
      <p className="mt-3 text-slate-600">
        This usually takes 20–40 seconds. Keep this tab open.
      </p>

      {/* role=status + aria-live=polite means screen readers will read out
          the rotating progress messages as they change. role=alert on the
          error state gives it more urgency (announced immediately, may
          interrupt other speech). The Loader2 icons get aria-hidden — they
          carry no info beyond the text alongside them. */}
      <div
        className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm min-h-[200px] flex flex-col items-center justify-center"
        role={stage === "error" ? "alert" : "status"}
        aria-live={stage === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {stage === "running" && (
          <>
            <Loader2 className="w-10 h-10 text-coral animate-spin mb-4" aria-hidden="true" />
            <p className="text-sm font-medium text-navy">{MESSAGES[messageIdx]}</p>
            <span className="sr-only">
              Analysis in progress. This typically takes 20 to 40 seconds.
            </span>
          </>
        )}
        {stage === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" aria-hidden="true" />
            <p className="text-sm font-medium text-navy">Done. Preparing your report…</p>
          </>
        )}
        {stage === "error" && (
          <>
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" aria-hidden="true" />
            <p className="text-sm font-medium text-navy">Something went wrong</p>
            <p className="mt-2 text-xs text-slate-500 max-w-sm">{error}</p>
            <button
              type="button"
              onClick={() => {
                firedRef.current = false;
                setStage("idle");
                setError(null);
              }}
              className="mt-5 h-10 px-4 rounded-lg bg-coral text-white text-sm font-semibold hover:bg-coral-dark transition-colors"
            >
              Try again
            </button>
          </>
        )}
        {stage === "idle" && (
          <p className="text-sm text-slate-500">
            {state.focus === "solar"
              ? "We need an address + a couple of quick questions to run. Use the Back button to fill those in."
              : "We need an address, the quick questions, and your floorplan to run. Use the Back button to fill those in."}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={back}
        className="mt-8 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>
    </div>
  );
}
