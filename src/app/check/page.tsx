import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";

export const metadata = {
  title: "Check your home",
  description:
    "Find out if your UK home is eligible for the Boiler Upgrade Scheme and suitable for rooftop solar — a pre-survey indication in minutes.",
};

export default function CheckPage() {
  if (!isFeatureEnabled("propertoasty_check")) notFound();

  // Header + sticky progress bar live inside <CheckWizard /> so the
  // progress can read from the wizard context.
  return <CheckWizard />;
}
