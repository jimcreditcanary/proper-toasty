// Public, token-gated report viewer.
//
// Loads the snapshot via /api/reports/[token]/load, then renders the
// same ReportShell the wizard uses. We hydrate a CheckWizardProvider
// with the snapshot data + step="report" + disablePersistence so the
// share-link session can't pollute the visitor's own wizard state.

"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { CheckWizardProvider } from "@/components/check-wizard/context";
import { ReportShell } from "@/components/check-wizard/report/report-shell";
import type { CheckWizardState } from "@/components/check-wizard/types";
import type {
  AnalyseResponse,
} from "@/lib/schemas/analyse";
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

export default function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${encodeURIComponent(token)}/load`);
        const data = (await res.json()) as LoadReportResponse;
        if (cancelled) return;
        if (res.status === 410 || data.expired) {
          setState({
            kind: "error",
            expired: true,
            message:
              data.error ??
              "This report has expired. Energy prices and grant rules may have changed — please run a fresh check.",
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-cream-deep to-cream">
      <header className="bg-cream/80 backdrop-blur-md border-b border-[var(--border)] sticky top-0 z-50">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center shrink-0">
            <Logo size="sm" variant="light" />
          </Link>
          <span className="hidden md:inline text-[11px] font-medium uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
            Shared report
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {state.kind === "loading" && (
            <div className="flex items-center justify-center gap-2 py-32 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading the report…
            </div>
          )}

          {state.kind === "error" && (
            <div className="max-w-md mx-auto py-20 text-center">
              <h1 className="text-xl font-bold text-navy">
                {state.expired
                  ? "This report has expired"
                  : "We couldn't open this report"}
              </h1>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                {state.message}
              </p>
              <Link
                href="/check"
                className="mt-6 inline-flex items-center justify-center h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm"
              >
                Run a fresh check
              </Link>
            </div>
          )}

          {state.kind === "ok" && state.data.snapshot != null && (
            <SharedReportInner data={state.data} />
          )}
        </div>
      </main>
    </div>
  );
}

function SharedReportInner({ data }: { data: LoadReportResponse }) {
  const snap = data.snapshot as SnapshotShape;
  const property = data.property;
  if (!snap.analysis || !property) {
    return (
      <p className="text-sm text-slate-500">
        Report data is missing — please ask the sender to share again.
      </p>
    );
  }

  const initialState: Partial<CheckWizardState> = {
    address: {
      uprn: property.uprn ?? null,
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
    // Bypass the lead-capture gate — share recipient is implicitly
    // already a "captured" lead (we have their email from the send).
    leadCapturedAt: data.createdAt ?? new Date().toISOString(),
    leadEmail: "shared-report",
  };

  return (
    <CheckWizardProvider
      initialState={initialState}
      initialStep="report"
      disablePersistence
    >
      <ReportShell />
    </CheckWizardProvider>
  );
}
