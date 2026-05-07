"use client";

// Step 5b — Lead capture. Between the analysis run and the report.
// Gates the report behind an email so we can follow up and so the
// installer-matching business model has real contact details to work with.

import { useCallback, useEffect, useId, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Flame,
  Loader2,
  Mail,
  Shield,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { useCheckWizard } from "./context";
import type { LeadCaptureRequest, LeadCaptureResponse } from "@/lib/schemas/leads";

export function Step5bLeadCapture() {
  const { state, update, next, back } = useCheckWizard();
  const [email, setEmail] = useState(state.leadEmail ?? "");
  const [name, setName] = useState(state.leadName ?? "");
  const [consentMarketing, setConsentMarketing] = useState(state.leadConsentMarketing);
  const [consentInstallerMatching, setConsentInstallerMatching] = useState(
    state.leadConsentInstallerMatching,
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stable id linking the error message to the form via aria-describedby
  // so screen readers announce the error in context with the form.
  const errorId = useId();

  // Pre-survey arrivals: the installer already collected this customer's
  // email when sending the request, so it's pre-filled into wizard state
  // by /check/page.tsx (loadPresurveyPrefill). Skip the form entirely
  // and POST directly so we can mark the request completed + create the
  // installer_lead, then jump to the report. The form was a friction
  // point for a customer who'd just opened a "your report is ready" link
  // and was being asked to re-confirm the same email back to us.
  const isPreSurveyAutoCapture = Boolean(
    state.preSurveyRequestId && state.leadEmail && !state.leadCapturedAt,
  );

  // Wrap the actual save so it can be called from both the form submit
  // handler AND the auto-capture effect below. The form path overrides
  // email/name from local state (the user may edit them); auto-capture
  // uses whatever's in wizard state (already validated).
  const saveLead = useCallback(
    async (override?: { email: string; name: string | null }) => {
      const finalEmail = (override?.email ?? email).trim();
      const finalName = (override?.name ?? name)?.trim() || null;
      if (!finalEmail) {
        setError("We need your email to show you the report.");
        return false;
      }
      setError(null);
      setSubmitting(true);
      const body: LeadCaptureRequest = {
        email: finalEmail,
        name: finalName,
        phone: null,
        address: state.address?.formattedAddress ?? null,
        postcode: state.address?.postcode ?? null,
        uprn: state.address?.uprn ?? null,
        latitude: state.address?.latitude ?? null,
        longitude: state.address?.longitude ?? null,
        consentMarketing,
        consentInstallerMatching,
        analysisSnapshot: {
          analysis: state.analysis,
          floorplanAnalysis: state.floorplanAnalysis,
          electricityTariff: state.electricityTariff,
          gasTariff: state.gasTariff,
        },
        // I5 — forwards through to /api/leads/capture so the
        // installer_lead gets auto-created + the request row marked
        // completed when the customer arrived via /check?presurvey=…
        preSurveyRequestId: state.preSurveyRequestId ?? null,
        // Migration 055 — let the lead capture route find the
        // matching check row and stamp homeowner_lead_id on it,
        // closing the check ↔ lead loop for admin queries.
        checkId: state.checkId ?? null,
        clientSessionId: state.clientSessionId ?? null,
      };
      try {
        const res = await fetch("/api/leads/capture", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = (await res.json().catch(() => ({}))) as LeadCaptureResponse;
        if (!res.ok || !data.ok) {
          throw new Error(data.error ?? `Save failed (${res.status})`);
        }
        update({
          leadEmail: body.email,
          leadName: body.name ?? null,
          leadConsentMarketing: body.consentMarketing,
          leadConsentInstallerMatching: body.consentInstallerMatching,
          leadCapturedAt: new Date().toISOString(),
          leadId: data.id ?? null,
        });
        next();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't save — try again");
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [
      email,
      name,
      consentMarketing,
      consentInstallerMatching,
      state,
      update,
      next,
    ],
  );

  // If the user has already captured their email in a previous session
  // (rehydrated from localStorage), auto-advance to the report rather
  // than making them re-enter. The API dedupes on email anyway, so
  // repeated submits are harmless — this is pure UX polish.
  //
  // For pre-survey arrivals (link from installer email, with email
  // pre-filled), auto-fire the capture so the user lands directly on
  // their report without seeing the form at all.
  useEffect(() => {
    if (state.leadCapturedAt && state.leadEmail) {
      next();
      return;
    }
    if (isPreSurveyAutoCapture) {
      void saveLead({
        email: state.leadEmail!,
        name: state.leadName ?? null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      await saveLead();
    },
    [saveLead],
  );

  const addr = state.address?.formattedAddress ?? "your home";

  // Pre-survey arrival — render a clean "loading your report" view
  // instead of the email form. The auto-capture effect above is firing
  // /api/leads/capture in the background; once it returns we'll have
  // advanced to the report step and this view unmounts.
  if (isPreSurveyAutoCapture) {
    return (
      <div className="max-w-md mx-auto w-full text-center py-16">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral-pale text-coral-dark mb-4">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy">
          Preparing your report…
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          {state.preSurveyInstallerName
            ? `${state.preSurveyInstallerName} sent this — pulling up your full pre-survey now.`
            : "Pulling up your full pre-survey now."}
        </p>
        {error && (
          <div className="mt-6 rounded-lg bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 text-left">
            <p className="font-medium">We hit a snag.</p>
            <p className="mt-1">{error}</p>
            <button
              type="button"
              onClick={() => void saveLead({
                email: state.leadEmail!,
                name: state.leadName ?? null,
              })}
              className="mt-2 underline text-red-700 hover:text-red-800"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Left — benefits + trust */}
        <div className="lg:col-span-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
            Your report is ready
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy leading-tight">
            {state.preSurveyRequestId && state.leadName
              ? `${state.leadName.split(" ")[0]}, just one tap to view your report`
              : "One last step — where should we send it?"}
          </h1>
          <p className="mt-3 text-sm text-slate-600 max-w-lg">
            {state.preSurveyRequestId && state.preSurveyInstallerName ? (
              <>
                We&rsquo;ve run the full pre-survey on{" "}
                <span className="font-medium text-navy">{addr}</span>. Confirm
                below and we&rsquo;ll send a copy of your report to{" "}
                <span className="font-medium text-navy">{state.preSurveyInstallerName}</span>{" "}
                so they can prep your quote.
              </>
            ) : (
              <>
                We&rsquo;ve run the full pre-survey on{" "}
                <span className="font-medium text-navy">{addr}</span>. Before you see it,
                we just need an email so you can come back to it, and so we can connect
                you to installers when you&rsquo;re ready to quote.
              </>
            )}
          </p>

          {/* What's in your report */}
          <div className="mt-8 space-y-4">
            <BenefitRow
              icon={<Flame className="w-4 h-4" />}
              title="Heat pump eligibility + BUS grant"
              body="Your BUS grant value, sizing estimate, and the questions an installer will ask."
            />
            <BenefitRow
              icon={<Sun className="w-4 h-4" />}
              title="Solar & battery suitability"
              body="Roof orientation, annual production estimate, and payback window."
            />
            <BenefitRow
              icon={<Sparkles className="w-4 h-4" />}
              title="Live savings calculator"
              body="A clear breakdown of what you&rsquo;d save per year — including export earnings if you go solar."
            />
            <BenefitRow
              icon={<FileText className="w-4 h-4" />}
              title="Annotated floorplan"
              body="Your drawing with heat pump + cylinder placements marked to scale for your installer."
            />
          </div>

          {/* Trust signals */}
          <div className="mt-8 rounded-xl bg-coral-pale/50 border border-coral-pale p-4">
            <div className="flex items-center gap-3">
              <div className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white text-coral">
                <Users className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-navy">
                  5,500+ MCS-certified installers across the UK
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  When you&rsquo;re ready, we&rsquo;ll match you with installers near you
                  who&rsquo;ve already seen properties like yours.
                </p>
              </div>
            </div>
          </div>

          <p className="mt-6 text-xs text-slate-500 flex items-start gap-2 max-w-md">
            <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
            <span>
              Installers only see your report when you tell us you&rsquo;d like to
              connect. We never share your address or contact details without
              permission.
            </span>
          </p>
        </div>

        {/* Right — the form */}
        <div className="lg:col-span-2">
          <form
            onSubmit={submit}
            className="rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm"
            aria-describedby={error ? errorId : undefined}
          >
            <div className="inline-flex items-center gap-2 h-7 px-3 rounded-full bg-coral-pale text-coral text-[11px] font-semibold uppercase tracking-wider mb-4">
              <Mail className="w-3.5 h-3.5" /> Email my report
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-navy">
                Email address
                <span className="text-coral ml-0.5" aria-hidden="true">
                  *
                </span>
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
                autoComplete="email"
                autoFocus
              />
            </label>

            <label className="mt-4 block">
              <span className="text-xs font-semibold text-navy">First name (optional)</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="So we can say hello"
                className="mt-1 w-full h-11 rounded-lg border border-[var(--border)] bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
                autoComplete="given-name"
              />
            </label>

            <div className="mt-5 space-y-2.5">
              <CheckboxRow
                checked={consentInstallerMatching}
                onChange={setConsentInstallerMatching}
                label="Match me with suitable MCS-certified installers when I'm ready"
              />
              <CheckboxRow
                checked={consentMarketing}
                onChange={setConsentMarketing}
                label="Keep me up to date with UK grants, rebates and energy-saving tips"
              />
            </div>

            {error && (
              <p
                id={errorId}
                role="alert"
                className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || !email.trim()}
              className="mt-5 w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  Show me my report
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <p className="mt-3 text-xs text-slate-500 text-center leading-relaxed">
              By continuing you agree to our privacy policy. We&rsquo;ll never spam
              you or share your details without permission.
            </p>
          </form>

          <button
            type="button"
            onClick={back}
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to analysis
          </button>
        </div>
      </div>
    </div>
  );
}

function BenefitRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg bg-coral-pale text-coral mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-slate-600 mt-0.5">{body}</p>
      </div>
    </div>
  );
}

function CheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer group">
      <span
        className={`relative shrink-0 inline-flex items-center justify-center w-5 h-5 rounded border transition-colors mt-0.5 ${
          checked
            ? "bg-coral border-coral text-white"
            : "bg-white border-slate-300 group-hover:border-slate-400"
        }`}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only"
        />
        {checked && <Check className="w-3.5 h-3.5" />}
      </span>
      <span className="text-xs text-slate-700 leading-snug">{label}</span>
    </label>
  );
}
