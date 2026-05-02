"use client";

// Mirror of the homeowner /r/[token] page's loader, but renders the
// ReportShell with audience="installer" so the consumer-flavoured
// cards (savings tab, book-a-visit, "how to get the best out of
// installers", email/share button) drop out.
//
// Loads via the existing /api/reports/[token]/load endpoint — the
// data path is identical, only the audience prop differs.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { CheckWizardProvider } from "@/components/check-wizard/context";
import { ReportShell } from "@/components/check-wizard/report/report-shell";
import type { CheckWizardState } from "@/components/check-wizard/types";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { LoadReportResponse } from "@/lib/schemas/report-share";

type SnapshotShape = {
  analysis?: AnalyseResponse;
  floorplanAnalysis?: FloorplanAnalysis;
  electricityTariff?: FuelTariff | null;
  gasTariff?: FuelTariff | null;
};

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; data: LoadReportResponse }
  | { kind: "error"; message: string; expired?: boolean };

interface Props {
  token: string;
}

export function InstallerReportClient({ token }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/reports/${encodeURIComponent(token)}/load`,
        );
        const data = (await res.json()) as LoadReportResponse;
        if (cancelled) return;
        if (res.status === 410 || data.expired) {
          setState({
            kind: "error",
            expired: true,
            message:
              data.error ??
              "This report has expired. The homeowner can run a fresh check.",
          });
          return;
        }
        if (!res.ok || !data.ok) {
          setState({
            kind: "error",
            message: data.error ?? "Couldn't load this report",
          });
          return;
        }
        setState({ kind: "ok", data });
      } catch (err) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : "Network error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state.kind === "loading") {
    return (
      <div className="flex items-center justify-center gap-2 py-32 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading the report…
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 max-w-md">
        <p className="text-sm font-semibold text-red-900">
          {state.expired ? "Report expired" : "Couldn't open the report"}
        </p>
        <p className="text-sm text-red-900 mt-1 leading-relaxed">
          {state.message}
        </p>
      </div>
    );
  }

  const snap = state.data.snapshot as SnapshotShape;
  const property = state.data.property;
  if (!snap?.analysis || !property) {
    return (
      <p className="text-sm text-slate-500">
        Report data is missing — email hello@propertoasty.com and
        we&rsquo;ll regenerate.
      </p>
    );
  }

  const initialState: Partial<CheckWizardState> = {
    address: {
      uprn: property.uprn ?? "",
      formattedAddress: property.address ?? "",
      line1: "",
      line2: null,
      postcode: property.postcode ?? "",
      postTown: "",
      latitude: property.latitude ?? 0,
      longitude: property.longitude ?? 0,
    },
    country: "England",
    analysis: snap.analysis,
    floorplanAnalysis: snap.floorplanAnalysis ?? null,
    electricityTariff: snap.electricityTariff ?? null,
    gasTariff: snap.gasTariff ?? null,
    leadCapturedAt: state.data.createdAt ?? new Date().toISOString(),
    leadEmail: "installer-view",
  };

  return (
    <CheckWizardProvider
      initialState={initialState}
      initialStep="report"
      disablePersistence
    >
      <ReportShell audience="installer" />
    </CheckWizardProvider>
  );
}
