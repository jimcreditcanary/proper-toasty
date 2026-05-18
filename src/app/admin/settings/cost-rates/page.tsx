// Legacy URL — moved to /admin/settings/inputs in May 2026 when the
// page grew a second section (sizing/savings). Kept as a permanent
// redirect so any bookmarks / external links (e.g. the P&L card on
// /admin/performance, internal docs) keep working.

import { permanentRedirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function CostRatesLegacyRedirect() {
  permanentRedirect("/admin/settings/inputs");
}
