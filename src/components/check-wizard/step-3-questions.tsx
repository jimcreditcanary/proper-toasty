"use client";

import { useEffect, useMemo } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Home as HomeIcon,
  Receipt,
  Banknote,
} from "lucide-react";
import { useCheckWizard } from "./context";
import type { HeatingFuel, Tenure, YesNoUnsure } from "./types";
import { EnergyDetailsCard, isFuelTariffComplete } from "./energy-details";

const TENURE_OPTIONS: Array<{ value: Tenure; title: string; body: string }> = [
  { value: "owner", title: "I own and live here", body: "Owner-occupier." },
  { value: "landlord", title: "I own and let it out", body: "Private landlord." },
  { value: "tenant", title: "I rent privately", body: "From a private landlord." },
  { value: "social", title: "I rent from council or housing association", body: "Social tenant." },
];

// FUEL_OPTIONS removed — the question used to display these as
// tiles, but the answer is derived from the EPC now (see the
// useEffect in Step3Questions). HeatingFuel union is still used
// for the wizard-state type + the savings calc.

const YNU_OPTIONS: Array<{ value: YesNoUnsure; title: string }> = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
  { value: "unsure", title: "Not sure" },
];

export function Step3Questions() {
  const { state, update, next, back } = useCheckWizard();

  // currentHeatingFuel is no longer asked — the EPC carries this
  // (and the analyse pipeline reads it from the cert), so the
  // question was friction. Default to mains gas here so the
  // wizard's `ready` gate can advance + the energy-details card
  // knows whether to require a gas tariff. ~85% of UK homes are
  // on mains gas; the ~10% on full-electric can override on the
  // bill upload step. The analyse pipeline tolerates a wrong
  // default — the savings calc still produces a sensible figure
  // and the BUS eligibility engine reads fuel from the EPC.
  useEffect(() => {
    if (state.currentHeatingFuel) return;
    update({ currentHeatingFuel: "gas" satisfies HeatingFuel });
  }, [state.currentHeatingFuel, update]);

  const gasRequired = state.currentHeatingFuel === "gas";
  // Solar variant skips the BUS-grant prior-funding question — it's
  // not relevant when the report doesn't cover heat pumps.
  const isSolarFocus = state.focus === "solar";

  const ready = useMemo(() => {
    if (!state.tenure || !state.currentHeatingFuel) return false;
    // Heat pump grant blocker — required for any variant that
    // surfaces the heat-pump verdict (all + heatpump). Solar
    // variant skips because it's only relevant for the BUS grant.
    if (!isSolarFocus && !state.priorHeatPumpFunding) return false;
    // Financing preference drives which scenario the report defaults to.
    if (!state.financingPreference) return false;
    // Energy details: electricity always required; gas required when fuel is gas.
    if (!isFuelTariffComplete(state.electricityTariff)) return false;
    if (gasRequired && !isFuelTariffComplete(state.gasTariff)) return false;
    return true;
  }, [
    state.tenure,
    state.currentHeatingFuel,
    state.priorHeatPumpFunding,
    state.financingPreference,
    state.electricityTariff,
    state.gasTariff,
    gasRequired,
    isSolarFocus,
  ]);

  // Personalise the heading when the customer arrived via an
  // installer pre-survey link (we have their first name from the
  // request row).
  const firstName = state.preSurveyRequestId
    ? state.leadName?.split(" ")[0] || null
    : null;

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl text-navy">
          {firstName ? `${firstName}, a few quick questions` : "A few quick questions"}
        </h1>
        <p className="mt-3 text-slate-600">
          Takes about 30 seconds. Your report will cover{" "}
          <span className="font-semibold text-navy">heat pump, solar and battery</span>{" "}
          as a combined recommendation — you can switch any of them on or off when
          you see the results.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          We&rsquo;ll read the rest off your EPC, your floorplan, and satellite data.
        </p>
      </div>

      <div className="space-y-6">
        <Question
          icon={<HomeIcon className="w-4 h-4" />}
          title="Who lives here?"
          sub="Most grants only support homeowners and landlords, not tenants. Answer however applies to you."
        >
          <Tiles
            options={TENURE_OPTIONS}
            value={state.tenure}
            onChange={(v) => update({ tenure: v })}
          />
        </Question>

        {/* "What fuel does your home use" — deliberately not asked.
            We derive it from the EPC's mainFuel field above, falling
            back to mains gas. The savings calculation tolerates a
            wrong guess; nudging users to fill in fields the EPC
            already knows the answer to is friction we don't need. */}

        {/* BUS prior-funding gate — hidden on the solar variant
            (irrelevant when the report doesn't cover heat pumps). */}
        {!isSolarFocus && (
          <Question
            icon={<Receipt className="w-4 h-4" />}
            title="Have you already had government funding for a heat pump or biomass boiler?"
            sub="Ofgem's Boiler Upgrade Scheme only pays out once per property. Separate funding for insulation, windows, or doors is fine."
          >
            <Tiles
              options={YNU_OPTIONS}
              value={state.priorHeatPumpFunding}
              onChange={(v) => update({ priorHeatPumpFunding: v })}
              columns={3}
            />
          </Question>
        )}

        <Question
          icon={<Banknote className="w-4 h-4" />}
          title="Are you wanting to finance these improvements?"
          sub="Either way you'll see both options on the report — paying up-front and spreading the cost over time."
        >
          <Tiles
            options={YNU_OPTIONS}
            value={state.financingPreference}
            onChange={(v) => update({ financingPreference: v })}
            columns={3}
          />
        </Question>

        <EnergyDetailsCard
          electricity={state.electricityTariff}
          gas={state.gasTariff}
          gasRequired={gasRequired}
          onChange={(patch) => update(patch)}
        />

        <p className="text-xs text-[var(--muted-brand)] leading-relaxed px-1">
          Existing boiler, radiators, hot water tank, outdoor space — we&rsquo;ll read
          those off your floorplan and EPC in the next steps, so you don&rsquo;t need
          to answer them here.
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!ready}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-cream font-semibold text-sm transition-colors shadow-sm"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Question({
  icon,
  title,
  sub,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <legend className="flex items-center gap-2 px-2 -mx-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-coral-pale text-coral">
          {icon}
        </span>
        <span className="text-base sm:text-lg font-semibold text-navy">{title}</span>
      </legend>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">{sub}</p>
      <div className="mt-4">{children}</div>
    </fieldset>
  );
}

function Tiles<T extends string>({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Array<{ value: T; title: string; body?: string }>;
  value: T | null;
  onChange: (v: T) => void;
  columns?: 2 | 3;
}) {
  const grid = columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";
  return (
    <div className={`grid grid-cols-1 gap-2 ${grid}`}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`text-left rounded-lg border px-4 py-3.5 transition-colors ${
              selected
                ? "border-coral bg-coral-pale"
                : "border-[var(--border)] bg-white hover:border-slate-300"
            }`}
          >
            <span
              className={`block text-base font-medium ${
                selected ? "text-coral-dark" : "text-navy"
              }`}
            >
              {opt.title}
            </span>
            {opt.body && (
              <span className="block text-sm text-slate-500 mt-1 leading-snug">
                {opt.body}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
