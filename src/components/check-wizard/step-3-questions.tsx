"use client";

import { useMemo } from "react";
import { ArrowLeft, ArrowRight, Home, Droplet, Leaf, Flame } from "lucide-react";
import { useCheckWizard } from "./context";
import type {
  HybridPreference,
  Tenure,
  YesNoUnsure,
} from "./types";

const TENURE_OPTIONS: Array<{ value: Tenure; title: string; body: string }> = [
  { value: "owner", title: "Owner-occupier", body: "I own and live in this home." },
  { value: "landlord", title: "Landlord", body: "I own it and let it out." },
  { value: "tenant", title: "Tenant", body: "I rent from a private landlord." },
  { value: "social", title: "Social tenant", body: "Council or housing association." },
];

const YNU_OPTIONS: Array<{ value: YesNoUnsure; title: string }> = [
  { value: "yes", title: "Yes" },
  { value: "no", title: "No" },
  { value: "unsure", title: "Not sure" },
];

const HYBRID_OPTIONS: Array<{ value: HybridPreference; title: string; body: string }> = [
  {
    value: "replace",
    title: "Fully replace",
    body: "Switch entirely to a heat pump.",
  },
  {
    value: "hybrid",
    title: "Keep the existing boiler",
    body: "Hybrid systems aren't eligible for the BUS grant.",
  },
  {
    value: "undecided",
    title: "Not decided",
    body: "I'd like to see both options in the report.",
  },
];

export function Step3Questions() {
  const { state, update, next, back } = useCheckWizard();

  const ready = useMemo(
    () =>
      Boolean(
        state.tenure &&
          state.outdoorSpaceForAshp &&
          state.hotWaterTankPresent &&
          state.hybridPreference
      ),
    [state.tenure, state.outdoorSpaceForAshp, state.hotWaterTankPresent, state.hybridPreference]
  );

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 3 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
          A few quick questions
        </h2>
        <p className="mt-3 text-slate-600">
          Things the EPC and satellite data can&rsquo;t tell us.
        </p>
      </div>

      <div className="space-y-8">
        <Question
          icon={<Home className="w-4 h-4" />}
          title="Who lives here?"
          sub="Only owner-occupiers and landlords can apply for the Boiler Upgrade Scheme."
        >
          <Tiles
            options={TENURE_OPTIONS}
            value={state.tenure}
            onChange={(v) => update({ tenure: v })}
          />
        </Question>

        <Question
          icon={<Leaf className="w-4 h-4" />}
          title="Is there outdoor space for a heat pump unit?"
          sub="An air source heat pump needs a ~1 m wide spot outside — garden, side return, or flat roof."
        >
          <Tiles
            options={YNU_OPTIONS}
            value={state.outdoorSpaceForAshp}
            onChange={(v) => update({ outdoorSpaceForAshp: v })}
            columns={3}
          />
        </Question>

        <Question
          icon={<Droplet className="w-4 h-4" />}
          title="Is there a hot water tank in the house today?"
          sub="Heat pumps usually need a cylinder. If there isn't one, the installer will need to find space."
        >
          <Tiles
            options={YNU_OPTIONS}
            value={state.hotWaterTankPresent}
            onChange={(v) => update({ hotWaterTankPresent: v })}
            columns={3}
          />
        </Question>

        <Question
          icon={<Flame className="w-4 h-4" />}
          title="If you fit a heat pump, what happens to the existing boiler?"
          sub="BUS only funds full replacement, not hybrid systems."
        >
          <Tiles
            options={HYBRID_OPTIONS}
            value={state.hybridPreference}
            onChange={(v) => update({ hybridPreference: v })}
          />
        </Question>
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
          className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
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
    <fieldset className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
      <legend className="flex items-center gap-2 px-2 -mx-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral">
          {icon}
        </span>
        <span className="text-sm font-semibold text-navy">{title}</span>
      </legend>
      <p className="mt-2 text-xs text-slate-500">{sub}</p>
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
            className={`text-left rounded-lg border px-4 py-3 transition-colors ${
              selected
                ? "border-coral bg-coral-pale"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <span
              className={`block text-sm font-medium ${
                selected ? "text-coral-dark" : "text-navy"
              }`}
            >
              {opt.title}
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
