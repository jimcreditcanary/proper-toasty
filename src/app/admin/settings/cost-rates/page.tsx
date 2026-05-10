// /admin/settings/cost-rates — finance-editable per-unit costs that
// drive the P&L on /admin/performance.
//
// Reads current values via loadCostRates (admin_settings overrides
// merged on top of DEFAULT_COST_RATES); writes go through
// /api/admin/cost-rates. The form persists everything as pence to
// match the canonical shape; the inputs render in pence too rather
// than auto-converting to £, because half the rates are sub-pound
// anyway and mixing units would be confusing.

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
import { CostRatesForm } from "./form";

export const dynamic = "force-dynamic";

export default async function CostRatesPage() {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect("/auth/login?redirect=/admin/settings/cost-rates");
  }

  const admin = createAdminClient();
  const rates = await loadCostRates(admin);

  return (
    <PortalShell
      portalName="Admin"
      pageTitle="Cost rates"
      pageSubtitle="Per-unit costs that feed the P&L on Performance. All values in pence."
      backLink={{ href: "/admin/performance", label: "Back to performance" }}
    >
      <CostRatesForm
        initialRates={rates}
        defaults={DEFAULT_COST_RATES}
        labels={COST_LINE_LABELS}
        hints={COST_LINE_HINTS}
        order={COST_LINE_ORDER}
      />
    </PortalShell>
  );
}
