"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Flame,
  Sun,
  HelpCircle,
  Home as HomeIcon,
  Thermometer,
  Droplet,
  Radio,
  MoveHorizontal,
  Gauge,
  Receipt,
} from "lucide-react";
import { useCheckWizard } from "./context";
import type {
  HeatingFuel,
  Interest,
  Tenure,
  YesNoUnsure,
  YesOrUnsure,
} from "./types";

const INTEREST_OPTIONS: Array<{
  value: Interest;
  title: string;
  body: string;
  icon: React.ReactNode;
}> = [
  {
    value: "heat_pump",
    title: "A heat pump",
    body: "Replace my gas or oil boiler with an air source heat pump.",
    icon: <Flame className="w-5 h-5" />,
  },
  {
    value: "solar_battery",
    title: "Solar & battery",
    body: "Generate my own electricity and store it for later.",
    icon: <Sun className="w-5 h-5" />,
  },
  {
    value: "not_sure",
    title: "Not sure yet",
    body: "Show me what makes sense — I'm open to all of it.",
    icon: <HelpCircle className="w-5 h-5" />,
  },
];

const TENURE_OPTIONS: Array<{ value: Tenure; title: string; body: string }> = [
  { value: "owner", title: "I own and live here", body: "Owner-occupier." },
  { value: "landlord", title: "I own and let it out", body: "Private landlord." },
  { value: "tenant", title: "I rent privately", body: "From a private landlord." },
  { value: "social", title: "I rent from council or housing association", body: "Social tenant." },
];

const FUEL_OPTIONS: Array<{ value: HeatingFuel; title: string; body: string }> = [
  { value: "gas", title: "Gas", body: "Mains gas boiler or LPG." },
  { value: "electric", title: "Electric", body: "Immersion, storage heaters, or electric radiators." },
  { value: "other", title: "Other", body: "Oil, biomass, solid fuel, or not sure." },
];

const YNU_OPTIONS: Array<{ value: YesNoUnsure; title: string }> = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
  { value: "unsure", title: "Not sure" },
];

const SPACE_OPTIONS: Array<{ value: YesOrUnsure; title: string; body?: string }> = [
  { value: "yes", title: "Yes, there's space" },
  { value: "unsure", title: "Not sure" },
];

export function Step3Questions() {
  const { state, update, next, back } = useCheckWizard();
  const showHeatPumpQuestions =
    state.interest === "heat_pump" || state.interest === "not_sure";
  const showCylinderSpace =
    showHeatPumpQuestions &&
    (state.hotWaterTankPresent === "no" || state.hotWaterTankPresent === "unsure");

  const ready = useMemo(() => {
    if (!state.interest || !state.tenure || !state.currentHeatingFuel) return false;
    if (showHeatPumpQuestions) {
      if (
        !state.hasExistingBoiler ||
        !state.needNewRadiators ||
        !state.hotWaterTankPresent ||
        !state.priorHeatPumpFunding
      ) {
        return false;
      }
      if (showCylinderSpace && !state.spaceBesideOutsideWall) return false;
    }
    return true;
  }, [
    state.interest,
    state.tenure,
    state.currentHeatingFuel,
    state.hasExistingBoiler,
    state.needNewRadiators,
    state.hotWaterTankPresent,
    state.spaceBesideOutsideWall,
    state.priorHeatPumpFunding,
    showHeatPumpQuestions,
    showCylinderSpace,
  ]);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 3 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl text-navy">A few quick questions</h2>
        <p className="mt-3 text-slate-600">
          Things the data can&rsquo;t tell us. Takes about a minute.
        </p>
      </div>

      <div className="space-y-6">
        <Question
          icon={<Gauge className="w-4 h-4" />}
          title="What are you most interested in?"
          sub="We'll tune the report to the upgrade path that fits you best."
        >
          <Tiles
            options={INTEREST_OPTIONS}
            value={state.interest}
            onChange={(v) => update({ interest: v })}
          />
        </Question>

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

        <Question
          icon={<Thermometer className="w-4 h-4" />}
          title="What fuel does your home currently use for heating?"
          sub="If your EPC already tells us this, we'll cross-check against what you say."
        >
          <Tiles
            options={FUEL_OPTIONS}
            value={state.currentHeatingFuel}
            onChange={(v) => update({ currentHeatingFuel: v })}
            columns={3}
          />
        </Question>

        {showHeatPumpQuestions && (
          <>
            <Question
              icon={<Flame className="w-4 h-4" />}
              title="Do you have an existing boiler?"
              sub="A heat pump usually replaces it — knowing what's there helps the installer scope pipe runs."
            >
              <Tiles
                options={YNU_OPTIONS}
                value={state.hasExistingBoiler}
                onChange={(v) => update({ hasExistingBoiler: v })}
                columns={3}
              />
            </Question>

            <Question
              icon={<Radio className="w-4 h-4" />}
              title="Will you need new radiators?"
              sub="Heat pumps run at ~45°C (vs ~65°C for a gas boiler), so some existing radiators aren't big enough to deliver the same warmth. The installer works this out room-by-room on survey — this is just to flag it early."
              tooltip="Bigger surface area compensates for the lower flow temperature. Most homes need 1–3 radiators upsized rather than a full replacement."
            >
              <Tiles
                options={YNU_OPTIONS}
                value={state.needNewRadiators}
                onChange={(v) => update({ needNewRadiators: v })}
                columns={3}
              />
            </Question>

            <Question
              icon={<Droplet className="w-4 h-4" />}
              title="Is there a hot water tank in the house today?"
              sub="Heat pumps usually need a cylinder. If one's already there, the job is simpler."
            >
              <Tiles
                options={YNU_OPTIONS}
                value={state.hotWaterTankPresent}
                onChange={(v) => update({ hotWaterTankPresent: v })}
                columns={3}
              />
            </Question>

            {showCylinderSpace && (
              <Question
                icon={<MoveHorizontal className="w-4 h-4" />}
                title="Is there at least 1 m² of clear space beside an outside wall?"
                sub="Enough to fit an outdoor heat pump unit and a new cylinder nearby — typically in a utility room, side return, or against an external wall with a cupboard close by."
              >
                <Tiles
                  options={SPACE_OPTIONS}
                  value={state.spaceBesideOutsideWall}
                  onChange={(v) => update({ spaceBesideOutsideWall: v })}
                  columns={2}
                />
              </Question>
            )}

            <Question
              icon={<Receipt className="w-4 h-4" />}
              title="Have you already received government funding for a heat pump or biomass boiler?"
              sub="Ofgem's Boiler Upgrade Scheme only pays out once per property. A 'yes' here would rule out the grant — but unrelated support (insulation, windows, doors) is fine."
            >
              <Tiles
                options={YNU_OPTIONS}
                value={state.priorHeatPumpFunding}
                onChange={(v) => update({ priorHeatPumpFunding: v })}
                columns={3}
              />
            </Question>
          </>
        )}

        <EnergyUsageCard
          annualGasKWh={state.annualGasKWh}
          annualElectricityKWh={state.annualElectricityKWh}
          onChange={(patch) => update(patch)}
        />
      </div>

      <div className="mt-12 flex items-center justify-between">
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
  tooltip,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  tooltip?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <legend className="flex items-center gap-2 px-2 -mx-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral">
          {icon}
        </span>
        <span className="text-sm font-semibold text-navy">{title}</span>
        {tooltip && (
          <span className="relative group inline-flex">
            <Info className="w-3.5 h-3.5 text-slate-400 hover:text-slate-700 cursor-help" />
            <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 rounded-lg bg-navy text-cream text-xs p-3 leading-snug opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg">
              {tooltip}
            </span>
          </span>
        )}
      </legend>
      <p className="mt-2 text-xs text-slate-500 leading-relaxed">{sub}</p>
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
  options: Array<{ value: T; title: string; body?: string; icon?: React.ReactNode }>;
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
            className={`text-left rounded-lg border px-4 py-3 transition-colors ${
              selected
                ? "border-coral bg-coral-pale"
                : "border-[var(--border)] bg-white hover:border-slate-300"
            }`}
          >
            <span
              className={`block text-sm font-medium ${
                selected ? "text-coral-dark" : "text-navy"
              }`}
            >
              {opt.icon ? (
                <span className="inline-flex items-center gap-1.5">
                  {opt.icon}
                  {opt.title}
                </span>
              ) : (
                opt.title
              )}
            </span>
            {opt.body && (
              <span className="block text-xs text-slate-500 mt-0.5">{opt.body}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EnergyUsageCard({
  annualGasKWh,
  annualElectricityKWh,
  onChange,
}: {
  annualGasKWh: number | null;
  annualElectricityKWh: number | null;
  onChange: (patch: {
    annualGasKWh?: number | null;
    annualElectricityKWh?: number | null;
  }) => void;
}) {
  const [expanded, setExpanded] = useState(
    annualGasKWh != null || annualElectricityKWh != null
  );

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 text-left"
      >
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral shrink-0">
          <Gauge className="w-4 h-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-navy">
            Add your annual energy use{" "}
            <span className="text-[var(--muted-brand)] font-normal">(optional)</span>
          </span>
          <span className="block mt-1 text-xs text-slate-500 leading-relaxed">
            Have your last bill handy? Paste the annual kWh totals and we&rsquo;ll size
            the heat pump / battery against your real usage instead of a floor-area
            estimate.
          </span>
        </span>
        <span className="text-xs text-coral font-medium">{expanded ? "Hide" : "Add"}</span>
      </button>

      {expanded && (
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <NumberField
            label="Annual gas use"
            unit="kWh"
            value={annualGasKWh}
            onChange={(v) => onChange({ annualGasKWh: v })}
            placeholder="e.g. 12000"
          />
          <NumberField
            label="Annual electricity use"
            unit="kWh"
            value={annualElectricityKWh}
            onChange={(v) => onChange({ annualElectricityKWh: v })}
            placeholder="e.g. 3200"
          />
          <p className="sm:col-span-2 text-[11px] text-slate-500">
            On a British Gas / Octopus / EDF bill, look for &ldquo;Energy used in the
            last 12 months&rdquo; or &ldquo;Annual usage&rdquo;. Gas is usually the big
            one — 8–20k kWh for most UK homes.
          </p>
        </div>
      )}
    </div>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  unit: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-[var(--muted-brand)] mb-1.5">
        {label}
      </span>
      <span className="relative block">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          step={100}
          value={value ?? ""}
          placeholder={placeholder}
          onChange={(e) => {
            const n = e.target.value === "" ? null : Number(e.target.value);
            onChange(n != null && Number.isFinite(n) && n >= 0 ? n : null);
          }}
          className="w-full h-11 pl-3 pr-14 rounded-lg border border-[var(--border)] bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
          {unit}
        </span>
      </span>
    </label>
  );
}
