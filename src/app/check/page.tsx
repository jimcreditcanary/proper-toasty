// /check — entry point to the 6-step pre-survey wizard.
//
// Three entry shapes:
//
//   1. /check                                — plain entry, no installer attached
//   2. /check?presurvey=<token>              — installer-initiated (installer sent
//                                              a magic link). Token resolves to an
//                                              installer_pre_survey_requests row +
//                                              pre-fills customer name/email.
//   3. /check?installer=<id>&capability=…    — customer-initiated (user clicked
//                                              "Request a quote" on an installer
//                                              card). Pre-binds the chosen
//                                              installer through the wizard +
//                                              into the report's Book-a-visit tab.
//
// Both pre-fill paths populate the same wizard-state fields
// (preSurveyInstallerId + preSurveyInstallerName + focus) so
// downstream tabs render identical "single installer" UX regardless
// of which entry was used.

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
  searchParams: Promise<{
    presurvey?: string;
    installer?: string;
    capability?: string;
  }>;
}

export const dynamic = "force-dynamic";

export default async function CheckPage({ searchParams }: PageProps) {
  if (!isFeatureEnabled("propertoasty_check")) notFound();

  const params = await searchParams;

  // Resolve initial state from whichever entry param is present.
  // Installer-initiated wins over customer-initiated (an installer's
  // magic link is a stronger signal than a URL param).
  let initialState: Partial<CheckWizardState> | undefined;
  if (params.presurvey) {
    initialState = await loadPresurveyPrefill(params.presurvey);
  } else if (params.installer) {
    initialState = await loadCustomerInitiatedPrefill(
      params.installer,
      params.capability,
    );
  }

  // Header + sticky progress bar live inside <CheckWizard /> so the
  // progress can read from the wizard context.
  return <CheckWizard initialState={initialState} />;
}

/**
 * Customer-initiated entry: user clicked "Request a quote" on an
 * installer card under /heat-pump-installers/… or
 * /solar-panel-installers/…. The URL carries the chosen installer's
 * id + the capability they were researching.
 *
 * We validate the installer exists + is BUS-registered (for heat
 * pump capability) or solar-capable (for solar capability), then
 * seed the wizard state with the installer's name + id + the
 * appropriate focus. No installer_pre_survey_requests row is created
 * — that table is for installer-initiated requests. Customer-
 * initiated leads attribute to the installer via the lead-capture
 * step's payload, which forwards preSurveyInstallerId to
 * /api/leads/capture (this still works because preSurveyRequestId
 * is null but installer attribution can be inferred from
 * preSurveyInstallerId in the lead row).
 *
 * Returns undefined when the installer doesn't exist OR doesn't
 * have the requested capability — the wizard then runs as a plain
 * /check.
 */
async function loadCustomerInitiatedPrefill(
  installerIdRaw: string,
  capabilityRaw: string | undefined,
): Promise<Partial<CheckWizardState> | undefined> {
  const installerId = parseInt(installerIdRaw, 10);
  if (!Number.isInteger(installerId) || installerId <= 0) return undefined;

  // Capability → wizard focus.
  const capability: "heat_pump" | "solar" | null =
    capabilityRaw === "heat_pump"
      ? "heat_pump"
      : capabilityRaw === "solar"
        ? "solar"
        : null;
  const focus: "all" | "solar" | "heatpump" =
    capability === "heat_pump"
      ? "heatpump"
      : capability === "solar"
        ? "solar"
        : "all";

  const admin = createAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: installer } = await (admin as any)
    .from("installers")
    .select(
      "id, company_name, bus_registered, cap_air_source_heat_pump, cap_solar_pv",
    )
    .eq("id", installerId)
    .maybeSingle();
  if (!installer) return undefined;

  // Capability gating — don't let someone request a heat-pump quote
  // from a solar-only installer or vice versa. Falls back to plain
  // /check if the capability doesn't match.
  if (capability === "heat_pump" && !installer.cap_air_source_heat_pump) {
    return undefined;
  }
  if (capability === "solar" && !installer.cap_solar_pv) {
    return undefined;
  }

  return {
    focus,
    preSurveyInstallerId: installer.id,
    preSurveyInstallerName: installer.company_name,
    // The rest stay null — no installer-initiated request row,
    // no pre-existing customer details, no pre-booked meeting.
  };
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
      "id, installer_id, status, contact_name, contact_email, contact_postcode, clicked_at, completed_at, expires_at, meeting_status, meeting_at, wants_heat_pump, wants_solar, wants_battery",
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

  // Batch 2 — derive the wizard focus from the installer's chosen
  // scope. Legacy rows (no scope columns) default to "all" via the
  // DB defaults from migration 060. The mapping:
  //
  //   HP only          → focus="heatpump" (skips solar API + tabs)
  //   Solar/Battery    → focus="solar"    (skips floorplan + HP tabs)
  //   Both (any combo) → focus="all"      (full wizard)
  //
  // Battery alone without solar isn't possible (CHECK constraint
  // pre_survey_request_scope_at_least_one) so we don't handle it.
  const wantsHp = request.wants_heat_pump ?? true;
  const wantsSolar = request.wants_solar ?? true;
  const focus: "all" | "solar" | "heatpump" =
    wantsHp && !wantsSolar
      ? "heatpump"
      : !wantsHp && wantsSolar
        ? "solar"
        : "all";

  return {
    leadEmail: request.contact_email,
    leadName: request.contact_name,
    focus,
    preSurveyRequestId: request.id,
    preSurveyInstallerName: installer?.company_name ?? null,
    preSurveyInstallerId: request.installer_id,
    preSurveyToken: token,
    preSurveyMeetingStatus:
      request.meeting_status === "booked" ? "booked" : "not_booked",
    preSurveyMeetingAt: request.meeting_at ?? null,
    prefillPostcode: request.contact_postcode,
  };
}
