// /admin/settings/inputs — runtime-tunable knobs.
//
// Two sections:
//   1. Cost rates (P&L) — per-unit costs that feed the Performance
//      P&L. All in pence.
//   2. Sizing & savings inputs (homeowner reports) — tariffs, grant
//      amounts, install £/kWp, heat-pump sizing rules of thumb.
//
// Both persist to public.admin_settings under their own key prefix
// (cost_rate.* / sizing_input.*) and fall back to literal defaults
// (which themselves read legacy env vars as the bottom of the
// fallback chain) when no row exists.

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import {
  loadCostRates,
  DEFAULT_COST_RATES,
  COST_LINE_LABELS,
  COST_LINE_HINTS,
  COST_LINE_ORDER,
} from "@/lib/admin/cost-rates";
import {
  loadSizingInputs,
  DEFAULT_SIZING_INPUTS,
  SIZING_INPUT_LABELS,
  SIZING_INPUT_HINTS,
  SIZING_INPUT_UNITS,
  SIZING_INPUT_ORDER,
} from "@/lib/admin/sizing-inputs";
import { CostRatesForm } from "./form-cost-rates";
import { SizingInputsForm } from "./form-sizing-inputs";

export const dynamic = "force-dynamic";

export default async function InputsPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/login?redirect=/admin/settings/inputs");
  }

  const admin = createAdminClient();
  const [rates, sizing] = await Promise.all([
    loadCostRates(admin),
    loadSizingInputs(admin),
  ]);

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Inputs"
      pageSubtitle="Cost rates (P&L) and sizing inputs (homeowner reports). Overrides persist to admin_settings; legacy env vars remain the last-resort fallback."
      backLink={{ href: "/admin", label: "Back to admin" }}
    >
      <section className="space-y-3 mb-10">
        <header>
          <h2 className="text-lg font-semibold text-navy">Cost rates (P&amp;L)</h2>
          <p className="text-sm text-slate-500">
            Per-unit costs that feed the P&amp;L on Performance. All values in pence.
          </p>
        </header>
        <CostRatesForm
          initialRates={rates}
          defaults={DEFAULT_COST_RATES}
          labels={COST_LINE_LABELS}
          hints={COST_LINE_HINTS}
          order={COST_LINE_ORDER}
        />
      </section>

      <section className="space-y-3">
        <header>
          <h2 className="text-lg font-semibold text-navy">
            Sizing &amp; savings inputs (homeowner reports)
          </h2>
          <p className="text-sm text-slate-500">
            Tariffs, BUS grant amounts, install £/kWp, and heat-pump sizing rules of thumb used to estimate savings + grant on the /check report.
          </p>
        </header>
        <SizingInputsForm
          initialInputs={sizing}
          defaults={DEFAULT_SIZING_INPUTS}
          labels={SIZING_INPUT_LABELS}
          hints={SIZING_INPUT_HINTS}
          units={SIZING_INPUT_UNITS}
          order={SIZING_INPUT_ORDER}
        />
      </section>
    </PortalShell>
  );
}
