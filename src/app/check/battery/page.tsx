// /check/battery — battery-focused variant of the check wizard.
//
// Same wizard chrome + steps as /check/solar, with focus="battery":
//   - Report defaults to the Solar & battery tab (battery lives
//     inside the solar report today — a dedicated battery report
//     tab is a follow-up).
//   - Wizard variant label reads "Home battery check".
//   - CTA UTM tags in the social agent flag this journey type.
//
// A standalone battery-only path doesn't quite exist as a UK
// consumer offering — battery economics require pairing with either
// solar generation or a smart tariff (e.g. Octopus Agile / Cosy).
// So the wizard experience is essentially the solar flow with a
// battery-first framing; the Solar tab surfaces battery sizing
// front-and-centre when focus === "battery".

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Home battery check",
  description:
    "Free UK home battery savings check. Payback with solar, tariff arbitrage, and sizing for your usage — installer-ready in five minutes.",
  alternates: { canonical: "https://www.propertoasty.com/check/battery" },
};

export const dynamic = "force-dynamic";

export default async function CheckBatteryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isFeatureEnabled("propertoasty_check")) notFound();
  const params = await searchParams;
  const raw = params.postcode;
  const prefill = typeof raw === "string" && raw.trim().length >= 5 ? raw.trim() : null;
  return (
    <CheckWizard
      initialState={{
        focus: "battery",
        interests: ["solar_battery"],
        prefillPostcode: prefill,
      }}
    />
  );
}
