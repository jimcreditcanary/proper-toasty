"use client";

import { useEffect, useRef, useState } from "react";
import {
  Upload,
  Loader2,
  Sparkles,
  Zap,
  Flame,
  ChevronDown,
  Pencil,
} from "lucide-react";
import { resizeImage } from "@/lib/client/image-resize";
import { UK_ENERGY_PROVIDERS } from "@/lib/energy/providers";
import {
  ELECTRICITY_BANDS,
  GAS_BANDS,
  USAGE_BAND_LABELS,
  getBandDefaults,
  type UsageBand,
  type BandDefaults,
} from "@/lib/energy/usage-bands";
import {
  getSupplierTariff,
  supplierHasTouOption,
} from "@/lib/energy/supplier-tariffs";
import type { BillParseResponse, FuelTariff } from "@/lib/schemas/bill";

type Fuel = "electricity" | "gas";

type UploadState =
  | { kind: "idle" }
  | { kind: "processing" }
  | { kind: "done"; confidence: string; supplier: string | null }
  | { kind: "error"; message: string };

interface EnergyDetailsProps {
  electricity: FuelTariff | null;
  gas: FuelTariff | null;
  gasRequired: boolean;
  onChange: (patch: { electricityTariff?: FuelTariff | null; gasTariff?: FuelTariff | null }) => void;
}

export function EnergyDetailsCard({
  electricity,
  gas,
  gasRequired,
  onChange,
}: EnergyDetailsProps) {
  const [uploadState, setUploadState] = useState<UploadState>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasAnyData = !!electricity || !!gas;

  const handleFile = async (file: File) => {
    const isImage = file.type === "image/jpeg" || file.type === "image/png";
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      setUploadState({ kind: "error", message: "Upload a JPG, PNG, or PDF." });
      return;
    }
    setUploadState({ kind: "processing" });
    try {
      let upload: Blob = file;
      let uploadName = file.name || (isPdf ? "bill.pdf" : "bill.jpg");
      let uploadType: string = file.type;
      if (isImage) {
        const { blob } = await resizeImage(file, { maxLongEdge: 1600, quality: 0.9 });
        upload = blob;
        uploadName = "bill.jpg";
        uploadType = "image/jpeg";
      }
      const form = new FormData();
      form.append("file", new File([upload], uploadName, { type: uploadType }));
      const res = await fetch("/api/bill/parse", { method: "POST", body: form });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Upload failed (${res.status})`);
      }
      const data = (await res.json()) as BillParseResponse;
      if (!data.ok) {
        setUploadState({ kind: "error", message: data.reason ?? "Couldn't read the bill." });
        return;
      }
      // Merge into FuelTariff shape (add source + usageBand: null)
      const electricityTariff: FuelTariff | null = data.analysis.electricity
        ? { ...data.analysis.electricity, source: "bill_upload", usageBand: null }
        : null;
      const gasTariff: FuelTariff | null = data.analysis.gas
        ? { ...data.analysis.gas, source: "bill_upload", usageBand: null }
        : null;
      onChange({ electricityTariff, gasTariff });
      setManualMode(false);
      setUploadState({
        kind: "done",
        confidence: data.analysis.confidence,
        supplier: data.analysis.supplier,
      });
    } catch (e) {
      setUploadState({
        kind: "error",
        message: e instanceof Error ? e.message : "Upload failed",
      });
    }
  };

  // Paste-from-clipboard for the bill
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.kind === "file") {
          const f = item.getAsFile();
          if (f && (f.type.startsWith("image/") || f.type === "application/pdf")) {
            e.preventDefault();
            void handleFile(f);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral shrink-0">
          <Zap className="w-4 h-4" />
        </span>
        <div>
          <p className="text-sm font-semibold text-navy">Your energy details</p>
          <p className="mt-1 text-xs text-slate-500 leading-relaxed">
            Upload your latest bill so we can match your tariff and calculate accurate
            cost savings.
            {gasRequired ? " A dual-fuel bill covers both — otherwise upload one bill per fuel." : ""}
          </p>
        </div>
      </div>

      {/* PRIMARY: bill upload */}
      <div className="mt-5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (uploadState.kind !== "processing") setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          aria-busy={uploadState.kind === "processing"}
          aria-label="Upload your energy bill — drag a JPG, PNG or PDF here, or press Enter to choose a file"
          className={`w-full rounded-lg border-2 border-dashed transition-colors px-4 py-6 text-center cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
            uploadState.kind === "processing"
              ? "border-coral/30 bg-coral-pale/40 opacity-60 cursor-not-allowed"
              : dragOver
              ? "border-coral bg-coral-pale"
              : "border-coral/40 bg-coral-pale/40 hover:bg-coral-pale hover:border-coral"
          }`}
        >
          {uploadState.kind === "processing" ? (
            <span className="inline-flex items-center gap-2 text-coral-dark text-sm font-medium">
              <Loader2 className="w-4 h-4 animate-spin" />
              Reading your bill…
            </span>
          ) : (
            <>
              <span className="inline-flex items-center gap-2 text-coral-dark text-sm font-semibold">
                <Upload className="w-4 h-4" />
                {dragOver ? "Drop to upload" : "Upload your energy bill"}
              </span>
              <span className="block mt-1.5 text-[11px] text-[var(--muted-brand)]">
                Drag &amp; drop, click to choose, or paste a screenshot (⌘V) ·
                JPG / PNG / PDF, up to 12 MB
              </span>
            </>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
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
              Pulled your tariff from
              {uploadState.supplier ? ` your ${uploadState.supplier} bill` : " the bill"}{" "}
              (confidence: {uploadState.confidence}). Check the details below — edit if
              anything&rsquo;s off.
            </span>
          </p>
        )}
        {uploadState.kind === "error" && (
          <p className="mt-3 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {uploadState.message}
          </p>
        )}
      </div>

      {/* SECONDARY: manual fallback */}
      {!hasAnyData && !manualMode && (
        <button
          type="button"
          onClick={() => setManualMode(true)}
          className="mt-4 text-xs text-coral hover:underline font-medium inline-flex items-center gap-1"
        >
          <Pencil className="w-3.5 h-3.5" />
          I don&rsquo;t have my energy bill to hand
        </button>
      )}

      {/* The per-fuel forms — shown when manual mode OR when we have data
          (so the user can edit what Claude pulled). */}
      {(manualMode || hasAnyData) && (
        <div className="mt-6 space-y-5">
          <FuelDetailForm
            fuel="electricity"
            value={electricity}
            onChange={(v) => onChange({ electricityTariff: v })}
          />
          {gasRequired && (
            <FuelDetailForm
              fuel="gas"
              value={gas}
              onChange={(v) => onChange({ gasTariff: v })}
            />
          )}
        </div>
      )}

      <p className="mt-5 text-[11px] text-slate-500">
        We don&rsquo;t save your bill image. The figures above feed our cost-savings
        calculation.
      </p>
    </div>
  );
}

// ─── per-fuel form ──────────────────────────────────────────────────────────

function FuelDetailForm({
  fuel,
  value,
  onChange,
}: {
  fuel: Fuel;
  value: FuelTariff | null;
  onChange: (v: FuelTariff | null) => void;
}) {
  const fallbackBands = fuel === "electricity" ? ELECTRICITY_BANDS : GAS_BANDS;
  const icon = fuel === "electricity" ? <Zap className="w-4 h-4" /> : <Flame className="w-4 h-4" />;
  const title = fuel === "electricity" ? "Electricity" : "Gas";

  // Initialise an empty manual record if the user hasn't started one yet.
  const t: FuelTariff = value ?? {
    provider: null,
    tariffName: null,
    productType: null,
    paymentMethod: null,
    unitRatePencePerKWh: null,
    standingChargePencePerDay: null,
    priceGuaranteedUntil: null,
    earlyExitFee: null,
    estimatedAnnualUsageKWh: null,
    source: "manual_estimate",
    usageBand: null,
    timeOfUseTariff: null,
    exportRatePencePerKWh: null,
  };

  // Per-supplier band lookup — drives both the displayed pence/kWh on the
  // band buttons AND the values written when the user selects a band.
  // Falls back to the supplier-agnostic ELECTRICITY_BANDS / GAS_BANDS when
  // provider is null (the "pick a supplier first" state).
  const bandFor = (band: UsageBand): BandDefaults =>
    t.provider
      ? getBandDefaults(t.provider, fuel, band)
      : fallbackBands[band];

  const supplierTariff = getSupplierTariff(t.provider);
  const showTouQuestion =
    fuel === "electricity" && supplierHasTouOption(t.provider);

  const update = (patch: Partial<FuelTariff>) => onChange({ ...t, ...patch });

  const setBand = (band: UsageBand) => {
    const defaults = bandFor(band);
    update({
      usageBand: band,
      source: "manual_estimate",
      estimatedAnnualUsageKWh: defaults.estimatedAnnualUsageKWh,
      unitRatePencePerKWh: defaults.unitRatePencePerKWh,
      standingChargePencePerDay: defaults.standingChargePencePerDay,
    });
  };

  // Provider change re-seeds the band-derived rates so the displayed numbers
  // line up with the new supplier's published tariff. Only re-seeds when
  // the user is on a manual_estimate (we don't want to clobber bill_upload
  // figures or hand-typed values from "I know exactly").
  const setProvider = (provider: string | null) => {
    if (
      provider &&
      t.source === "manual_estimate" &&
      t.usageBand &&
      t.usageBand !== "exact"
    ) {
      const defaults = getBandDefaults(provider, fuel, t.usageBand);
      update({
        provider,
        unitRatePencePerKWh: defaults.unitRatePencePerKWh,
        standingChargePencePerDay: defaults.standingChargePencePerDay,
      });
      return;
    }
    update({ provider });
  };

  const setExact = () => {
    update({
      usageBand: "exact",
      source: "manual_known",
      // Clear the band-seeded numbers so the user fills them in
      estimatedAnnualUsageKWh: null,
      unitRatePencePerKWh: null,
      standingChargePencePerDay: null,
    });
  };

  const showExact = t.usageBand === "exact" || t.source === "bill_upload" || t.source === "manual_known";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-cream-deep/30 p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white text-coral border border-[var(--border)]">
          {icon}
        </span>
        <h4 className="text-sm font-semibold text-navy">{title}</h4>
        {t.source === "bill_upload" && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
            From bill
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Provider">
          <select
            value={t.provider ?? ""}
            onChange={(e) => setProvider(e.target.value || null)}
            className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent appearance-none"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236B7266' stroke-width='2'><path stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/></svg>\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 0.6rem center",
              backgroundSize: "1rem",
              paddingRight: "2rem",
            }}
          >
            <option value="">Select provider…</option>
            {UK_ENERGY_PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        {/* When data came from a bill upload, also surface the tariff name. */}
        {t.source === "bill_upload" && (
          <Field label="Tariff name">
            <TextInput
              value={t.tariffName ?? ""}
              onChange={(v) => update({ tariffName: v || null })}
              placeholder="e.g. 12M Fixed October 2025"
            />
          </Field>
        )}
      </div>

      <p className="mt-4 mb-2 text-xs font-semibold text-[var(--muted-brand)]">
        Annual usage
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {(["low", "medium", "high"] as const).map((b) => {
          const selected = t.usageBand === b && t.source === "manual_estimate";
          const def = bandFor(b);
          return (
            <button
              key={b}
              type="button"
              onClick={() => setBand(b)}
              className={`rounded-lg border px-3 py-2 text-left transition-colors ${
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
                {USAGE_BAND_LABELS[b].title}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                ~{def.estimatedAnnualUsageKWh.toLocaleString()} kWh/yr ·{" "}
                {def.unitRatePencePerKWh}p
              </span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={setExact}
          className={`rounded-lg border px-3 py-2 text-left transition-colors ${
            t.usageBand === "exact" || t.source === "bill_upload" || t.source === "manual_known"
              ? "border-coral bg-coral-pale"
              : "border-[var(--border)] bg-white hover:border-slate-300"
          }`}
        >
          <span
            className={`block text-sm font-medium ${
              t.usageBand === "exact" || t.source === "bill_upload" || t.source === "manual_known"
                ? "text-coral-dark"
                : "text-navy"
            }`}
          >
            I know exactly
          </span>
          <span className="block text-[11px] text-slate-500 mt-0.5">From a bill.</span>
        </button>
      </div>

      {/* Supplier-rates badge — shown when the band buttons are seeded from
          the supplier table rather than the Ofgem fallback. Tells the user
          where the numbers came from + when the table was last reviewed. */}
      {t.source === "manual_estimate" && t.provider && (
        <p className="mt-2 text-[11px] text-slate-500 italic">
          Rates seeded from {t.provider}&rsquo;s published standard variable
          tariff (reviewed {supplierTariff.lastReviewed}). Edit if your bill
          shows different.
        </p>
      )}

      {/* Time-of-Use question — only for electricity, only when the supplier
          actually offers one. Yes flips on off-peak rate in the savings calc;
          no/null collapses off-peak to the standard rate so we don't
          credit the user with savings they're not getting. */}
      {showTouQuestion && t.source !== "bill_upload" && (
        <div className="mt-4 rounded-lg border border-[var(--border)] bg-white p-3">
          <p className="text-xs font-semibold text-navy">
            Are you on {t.provider}&rsquo;s{" "}
            {supplierTariff.electricity.touTariffName ?? "smart"} tariff?
          </p>
          <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
            Time-of-Use tariffs charge less overnight (
            {supplierTariff.electricity.offPeakRatePencePerKWh}p/kWh) — useful
            for batteries and EVs.
          </p>
          <div className="mt-2 inline-flex rounded-lg border border-[var(--border)] bg-white p-0.5">
            {(
              [
                { v: true, label: "Yes" },
                { v: false, label: "No" },
                { v: null, label: "Not sure" },
              ] as const
            ).map((opt) => {
              const selected = t.timeOfUseTariff === opt.v;
              return (
                <button
                  key={String(opt.v)}
                  type="button"
                  onClick={() => update({ timeOfUseTariff: opt.v })}
                  className={`h-8 px-3 text-xs font-medium rounded ${
                    selected
                      ? "bg-coral text-white"
                      : "text-slate-600 hover:text-navy"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showExact && (
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Unit rate" unit="p/kWh">
            <NumberInput
              value={t.unitRatePencePerKWh}
              onChange={(v) => update({ unitRatePencePerKWh: v })}
              placeholder="25.18"
              step={0.01}
            />
          </Field>
          <Field label="Standing charge" unit="p/day">
            <NumberInput
              value={t.standingChargePencePerDay}
              onChange={(v) => update({ standingChargePencePerDay: v })}
              placeholder="41.59"
              step={0.01}
            />
          </Field>
          <Field label="Annual usage" unit="kWh">
            <NumberInput
              value={t.estimatedAnnualUsageKWh}
              onChange={(v) => update({ estimatedAnnualUsageKWh: v })}
              placeholder={fuel === "electricity" ? "3200" : "12000"}
              step={1}
            />
          </Field>
        </div>
      )}

      {t.source === "bill_upload" && (
        <details className="mt-4">
          <summary className="text-xs text-[var(--muted-brand)] cursor-pointer hover:text-navy inline-flex items-center gap-1">
            <ChevronDown className="w-3 h-3" />
            More tariff details from bill
          </summary>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <Field label="Product type">
              <TextInput
                value={t.productType ?? ""}
                onChange={(v) => update({ productType: v || null })}
                placeholder="Fixed / Variable / SVT"
              />
            </Field>
            <Field label="Payment method">
              <TextInput
                value={t.paymentMethod ?? ""}
                onChange={(v) => update({ paymentMethod: v || null })}
                placeholder="Direct Debit"
              />
            </Field>
            <Field label="Price guaranteed until">
              <TextInput
                value={t.priceGuaranteedUntil ?? ""}
                onChange={(v) => update({ priceGuaranteedUntil: v || null })}
                placeholder="Until 10 Dec 2026"
              />
            </Field>
            <Field label="Early exit fee">
              <TextInput
                value={t.earlyExitFee ?? ""}
                onChange={(v) => update({ earlyExitFee: v || null })}
                placeholder="None / £75 per fuel"
              />
            </Field>
          </div>
        </details>
      )}
    </div>
  );
}

// ─── small inputs ───────────────────────────────────────────────────────────

function Field({
  label,
  unit,
  children,
}: {
  label: string;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11px] font-semibold text-[var(--muted-brand)] mb-1">
        {label}
        {unit && <span className="font-normal text-slate-400"> · {unit}</span>}
      </span>
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
    />
  );
}

function NumberInput({
  value,
  onChange,
  placeholder,
  step,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  step?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step={step}
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => {
        const v = e.target.value === "" ? null : Number(e.target.value);
        onChange(v != null && Number.isFinite(v) && v >= 0 ? v : null);
      }}
      className="w-full h-10 px-3 rounded-lg border border-[var(--border)] bg-white text-sm text-navy focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
    />
  );
}

/** Helper used by the readiness check in step-3-questions. */
export function isFuelTariffComplete(t: FuelTariff | null): boolean {
  if (!t) return false;
  if (!t.provider) return false;
  // For estimates, the band defaults populate everything. For exact / bill, we
  // need at least the three numbers.
  return (
    t.unitRatePencePerKWh != null &&
    t.standingChargePencePerDay != null &&
    t.estimatedAnnualUsageKWh != null
  );
}
