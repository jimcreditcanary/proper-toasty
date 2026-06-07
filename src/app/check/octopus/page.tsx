// /check/octopus — Octopus Energy "instant report" screen.
//
// Server-renders a simplified report for the hard-coded demo property
// (2 Curtels Close, Worsley, M28 2JR). The wizard is skipped, but the
// underlying *data product* still runs — EPC fetch + the existing
// heat-pump / boiler running-cost engine — so the boiler monthly is
// derived from this home's real floor area and gas tariff defaults,
// not a marketing constant. See src/lib/octopus/demo-report.ts.

import { notFound } from "next/navigation";
import { OctopusInstantReport } from "@/components/octopus/instant-report";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { computeOctopusDemoReport } from "@/lib/octopus/demo-report";

export const metadata = {
  title: "Your Octopus heat pump — £49.99 a month · Propertoasty",
  description:
    "Your monthly cost, side by side with a new gas boiler — derived from your home's EPC. Includes service, callouts, 10-year warranty, £500 cashback.",
};

// force-dynamic because the engine reads admin sizing inputs and
// hits the EPC API on a cold cache.
export const dynamic = "force-dynamic";

export default async function CheckOctopusPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  const report = await computeOctopusDemoReport();
  return <OctopusInstantReport report={report} />;
}
