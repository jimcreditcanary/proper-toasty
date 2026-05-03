"use client";

// React hook around POST /api/savings/calculate.
//
// - Builds the API request from the wizard state on every change
// - Debounces the fetch (slider drags shouldn't hammer the endpoint)
// - Aborts in-flight requests when inputs change before they return
// - Exposes a stable { result, loading, error } return for the UI
//
// The endpoint itself is a pure-function call (no DB, no side
// effects) so safe to refire freely. We still debounce because the
// network round-trip is wasteful when the user is mid-drag.

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { ReportSelection } from "@/components/check-wizard/report/report-shell";
import {
  buildSavingsRequest,
  type FinancingInputs,
} from "./build-request";
import type { CalculateResponse } from "./scenarios-schema";

const DEBOUNCE_MS = 350;

interface Args {
  analysis: AnalyseResponse;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  selection: ReportSelection;
  financing: FinancingInputs;
}

interface State {
  result: CalculateResponse | null;
  loading: boolean;
  error: string | null;
}

export function useSavingsCalc(args: Args): State {
  const [state, setState] = useState<State>({
    result: null,
    loading: true,
    error: null,
  });

  // Build the request body deterministically — useMemo + JSON.stringify
  // gives us a stable cache key for the debounce/abort logic without
  // needing deep-equality on every render.
  const request = useMemo(
    () => buildSavingsRequest(args),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      args.analysis,
      args.electricityTariff,
      args.gasTariff,
      args.selection,
      args.financing,
    ],
  );
  const requestKey = useMemo(() => JSON.stringify(request), [request]);

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true, error: null }));

    const handle = setTimeout(async () => {
      // Abort any prior in-flight request so we never race with our
      // own previous call.
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const res = await fetch("/api/savings/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestKey,
          signal: ctrl.signal,
        });
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(
            `Calculate request failed (${res.status})${text ? `: ${text.slice(0, 200)}` : ""}`,
          );
        }
        const json: CalculateResponse = await res.json();
        if (!ctrl.signal.aborted) {
          setState({ result: json, loading: false, error: null });
        }
      } catch (err) {
        // AbortError is expected (we cancelled because inputs changed)
        // — don't surface it as a UI error.
        if (err instanceof Error && err.name === "AbortError") return;
        setState({
          result: null,
          loading: false,
          error: err instanceof Error ? err.message : "Calculation failed",
        });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(handle);
    };
  }, [requestKey]);

  return state;
}
