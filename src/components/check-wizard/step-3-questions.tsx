"use client";

import { useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Sun,
  Check,
  Home as HomeIcon,
  Thermometer,
  Gauge,
  Receipt,
  Upload,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useCheckWizard } from "./context";
import type { HeatingFuel, Interest, Tenure, YesNoUnsure } from "./types";
import { resizeImage } from "@/lib/client/image-resize";
import type { BillParseResponse } from "@/lib/schemas/bill";

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

export function Step3Questions() {
  const { state, update, next, back } = useCheckWizard();
  const showHeatPumpSpecific = state.interests.includes("heat_pump");

  const toggleInterest = (v: Interest) => {
    const has = state.interests.includes(v);
    const next = has ? state.interests.filter((i) => i !== v) : [...state.interests, v];
    update({ interests: next });
  };

  const ready = useMemo(() => {
    if (state.interests.length === 0) return false;
    if (!state.tenure || !state.currentHeatingFuel) return false;
    if (showHeatPumpSpecific && !state.priorHeatPumpFunding) return false;
    return true;
  }, [
    state.interests,
    state.tenure,
    state.currentHeatingFuel,
    state.priorHeatPumpFunding,
    showHeatPumpSpecific,
  ]);

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 3 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl text-navy">A few quick questions</h2>
        <p className="mt-3 text-slate-600">
          Takes about 30 seconds. We&rsquo;ll read the rest off your EPC, your floorplan,
          and satellite data.
        </p>
      </div>

      <div className="space-y-6">
        <Question
          icon={<Gauge className="w-4 h-4" />}
          title="What are you interested in?"
          sub="Pick one or both — we'll tune the report to what you want to explore."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {INTEREST_OPTIONS.map((opt) => {
              const selected = state.interests.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="checkbox"
                  aria-checked={selected}
                  onClick={() => toggleInterest(opt.value)}
                  className={`text-left rounded-lg border px-4 py-3 transition-colors ${
                    selected
                      ? "border-coral bg-coral-pale"
                      : "border-[var(--border)] bg-white hover:border-slate-300"
                  }`}
                >
                  <span
                    className={`flex items-center justify-between gap-2 text-sm font-medium ${
                      selected ? "text-coral-dark" : "text-navy"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {opt.icon}
                      {opt.title}
                    </span>
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded border shrink-0 transition-colors ${
                        selected
                          ? "bg-coral border-coral text-cream"
                          : "border-slate-300 bg-white"
                      }`}
                      aria-hidden
                    >
                      {selected && <Check className="w-3.5 h-3.5" />}
                    </span>
                  </span>
                  <span className="block text-xs text-slate-500 mt-1">{opt.body}</span>
                </button>
              );
            })}
          </div>
          {state.interests.length === 0 && (
            <p className="mt-3 text-xs text-[var(--muted-brand)]">
              Tick at least one to carry on.
            </p>
          )}
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
          sub="We cross-check this against your EPC — whichever says 'low-carbon already' would rule you out of the BUS grant."
        >
          <Tiles
            options={FUEL_OPTIONS}
            value={state.currentHeatingFuel}
            onChange={(v) => update({ currentHeatingFuel: v })}
            columns={3}
          />
        </Question>

        {showHeatPumpSpecific && (
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

        <EnergyUsageCard
          annualGasKWh={state.annualGasKWh}
          annualElectricityKWh={state.annualElectricityKWh}
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
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral">
          {icon}
        </span>
        <span className="text-sm font-semibold text-navy">{title}</span>
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
                : "border-[var(--border)] bg-white hover:border-slate-300"
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
  const [uploadState, setUploadState] = useState<
    | { kind: "idle" }
    | { kind: "processing" }
    | { kind: "done"; confidence: string; supplier: string | null; notes: string }
    | { kind: "error"; message: string }
  >({ kind: "idle" });
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setUploadState({
        kind: "error",
        message: "Upload a JPG or PNG — screenshot the bill page if it's a PDF.",
      });
      return;
    }
    setUploadState({ kind: "processing" });
    try {
      const { blob } = await resizeImage(file, { maxLongEdge: 1600, quality: 0.9 });
      const form = new FormData();
      form.append("file", new File([blob], "bill.jpg", { type: "image/jpeg" }));
      const res = await fetch("/api/bill/parse", { method: "POST", body: form });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as BillParseResponse;
      if (!data.ok) {
        setUploadState({
          kind: "error",
          message: data.reason ?? "We couldn't read the bill reliably.",
        });
        return;
      }
      onChange({
        annualGasKWh: data.analysis.annualGasKWh ?? null,
        annualElectricityKWh: data.analysis.annualElectricityKWh ?? null,
      });
      setUploadState({
        kind: "done",
        confidence: data.analysis.confidence,
        supplier: data.analysis.supplier,
        notes: data.analysis.notes,
      });
    } catch (e) {
      setUploadState({
        kind: "error",
        message: e instanceof Error ? e.message : "Upload failed",
      });
    }
  };

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
            Have a recent bill handy? Upload it and we&rsquo;ll pull the annual kWh
            figures out for you, or type them in yourself.
          </span>
        </span>
        <span className="text-xs text-coral font-medium">{expanded ? "Hide" : "Add"}</span>
      </button>

      {expanded && (
        <div className="mt-5 space-y-4">
          <div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadState.kind === "processing"}
              className="w-full flex items-center justify-center gap-2 h-11 px-4 rounded-lg border-2 border-dashed border-coral/40 bg-coral-pale/40 hover:bg-coral-pale hover:border-coral text-coral-dark font-medium text-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {uploadState.kind === "processing" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Reading your bill…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload a bill to autofill
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleFile(f);
                e.target.value = "";
              }}
            />

            {uploadState.kind === "done" && (
              <p className="mt-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Pulled your figures from
                  {uploadState.supplier ? ` your ${uploadState.supplier} bill` : " the bill"}
                  {" "}(confidence: {uploadState.confidence}). Check they look right — edit
                  below if not.
                </span>
              </p>
            )}
            {uploadState.kind === "error" && (
              <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {uploadState.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          </div>

          <p className="text-[11px] text-slate-500">
            We don&rsquo;t save your bill — it goes straight to our vision model and the
            image is discarded after the numbers are extracted.
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
