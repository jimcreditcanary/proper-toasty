"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { useCheckWizard } from "./context";
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

  useEffect(() => {
    if (firedRef.current) return;
    if (
      !state.address ||
      !state.floorplanObjectKey ||
      !state.tenure ||
      !state.outdoorSpaceForAshp ||
      !state.hotWaterTankPresent ||
      !state.hybridPreference
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
          tenure: state.tenure,
          outdoorSpaceForAshp: state.outdoorSpaceForAshp,
          hotWaterTankPresent: state.hotWaterTankPresent,
          hybridPreference: state.hybridPreference,
        },
        floorplanObjectKey: state.floorplanObjectKey,
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
    state.tenure,
    state.outdoorSpaceForAshp,
    state.hotWaterTankPresent,
    state.hybridPreference,
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
      <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
        Step 5 of 6
      </p>
      <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
        Running the analysis
      </h2>
      <p className="mt-3 text-slate-600">
        This usually takes 20–40 seconds. Keep this tab open.
      </p>

      <div className="mt-12 rounded-2xl border border-slate-200 bg-white p-10 shadow-sm min-h-[200px] flex flex-col items-center justify-center">
        {stage === "running" && (
          <>
            <Loader2 className="w-10 h-10 text-coral animate-spin mb-4" />
            <p className="text-sm font-medium text-navy">{MESSAGES[messageIdx]}</p>
          </>
        )}
        {stage === "done" && (
          <>
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-4" />
            <p className="text-sm font-medium text-navy">Done. Preparing your report…</p>
          </>
        )}
        {stage === "error" && (
          <>
            <AlertCircle className="w-10 h-10 text-red-500 mb-4" />
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
            We need address, questions and a floorplan to run — please start again from Step 1.
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
