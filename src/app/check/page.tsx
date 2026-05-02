// /check — entry point to the 6-step pre-survey wizard.
//
// If ?presurvey=<token> is present we pre-validate the token server-
// side and seed the wizard with the customer's name/email + the
// requesting installer's id. Stamps `clicked_at` on the request row
// so the installer-side list shows it as "clicked" rather than
// still "pending".

import { notFound } from "next/navigation";
import { CheckWizard } from "@/components/check-wizard/wizard-shell";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { parsePreSurveyToken } from "@/lib/email/tokens";
import type { CheckWizardState } from "@/components/check-wizard/types";

export const metadata = {
  title: "Check your home",
  description:
    "Find out if your UK home is eligible for the Boiler Upgrade Scheme and suitable for rooftop solar — a pre-survey indication in minutes.",
};

interface PageProps {
  searchParams: Promise<{ presurvey?: string }>;
}

export const dynamic = "force-dynamic";

export default async function CheckPage({ searchParams }: PageProps) {
  if (!isFeatureEnabled("propertoasty_check")) notFound();

  const params = await searchParams;
  const initialState = params.presurvey
    ? await loadPresurveyPrefill(params.presurvey)
    : undefined;

  // Header + sticky progress bar live inside <CheckWizard /> so the
  // progress can read from the wizard context.
  return <CheckWizard initialState={initialState} />;
}

/**
 * Validates the prefill token + returns a partial wizard state to
 * seed the email/name fields and attach the request id. Returns
 * undefined when the token is malformed, expired, completed, or
 * doesn't match a row — the wizard then runs with an empty state.
 *
 * Side effect: stamps `clicked_at` on first valid load. Idempotent
 * (only sets when null) so a refresh doesn't bump the timestamp.
 */
async function loadPresurveyPrefill(
  token: string,
): Promise<Partial<CheckWizardState> | undefined> {
  const requestId = parsePreSurveyToken(token);
  if (!requestId) return undefined;

  const admin = createAdminClient();
  const { data: request } = await admin
    .from("installer_pre_survey_requests")
    .select(
      "id, installer_id, status, contact_name, contact_email, contact_postcode, clicked_at, completed_at, expires_at",
    )
    .eq("id", requestId)
    .eq("homeowner_token", token)
    .maybeSingle();
  if (!request) return undefined;

  // Expired or already-completed requests just behave like a normal
  // /check page load — no prefill, no attribution. Avoids a confusing
  // "you've already done this" landing.
  if (
    request.completed_at ||
    new Date(request.expires_at).getTime() < Date.now()
  ) {
    return undefined;
  }

  // Look up installer name for the on-page banner.
  const { data: installer } = await admin
    .from("installers")
    .select("company_name")
    .eq("id", request.installer_id)
    .maybeSingle<{ company_name: string }>();

  // First-click stamp — fire-and-forget so we don't block the page.
  if (!request.clicked_at) {
    admin
      .from("installer_pre_survey_requests")
      .update({ status: "clicked", clicked_at: new Date().toISOString() })
      .eq("id", request.id)
      .is("clicked_at", null)
      .then(({ error }) => {
        if (error) console.warn("[pre-survey] click stamp failed", error);
      });
  }

  return {
    leadEmail: request.contact_email,
    leadName: request.contact_name,
    preSurveyRequestId: request.id,
    preSurveyInstallerName: installer?.company_name ?? null,
  };
}
