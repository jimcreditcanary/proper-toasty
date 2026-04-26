"use client";

// Step 6 — Report. Now a thin wrapper around the new ReportShell that
// hosts the left-nav + 5-tab layout (Overview / Savings / Heat Pump /
// Solar & battery / Book a site visit).
//
// The previous monolithic implementation lived here pre-Apr 2026 — see
// git history for the old top-tab version. Splitting it into report/*
// lets each tab evolve independently and keeps any one file readable.

import { ReportShell } from "./report/report-shell";

export function Step6Report() {
  return <ReportShell />;
}
