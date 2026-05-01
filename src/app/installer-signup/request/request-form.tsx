"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Search, ShieldCheck, AlertCircle } from "lucide-react";
import {
  CERTIFICATION_BODIES,
  type CertificationBody,
  type ChLookupResponse,
  type InstallerSignupRequestResponse,
} from "@/lib/schemas/installer-signup-request";

// Single-page form. Two phases of interaction within it:
//
//   1. Companies House lookup (top) — optional. If the user types
//      their CH number and clicks "Look up", we prefill company
//      name, address, and incorporation date. Sole traders can
//      skip this entirely.
//
//   2. Everything else — contact details, capabilities, MCS info,
//      free-form notes. Submitted to /api/installer-signup/request.

interface FormState {
  // CH section
  companyNumber: string;
  chPrefilled: boolean; // true after a successful CH lookup
  // Identity (CH-prefilled OR user-entered)
  companyName: string;
  chAddress: string;
  chIncorporationDate: string; // YYYY-MM-DD
  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  // BUS + caps
  busRegistered: boolean;
  capHeatPump: boolean;
  capSolarPv: boolean;
  capBatteryStorage: boolean;
  // MCS
  certificationBody: CertificationBody | "";
  certificationNumber: string;
  certificationPending: boolean;
  // Notes
  notes: string;
}

const EMPTY: FormState = {
  companyNumber: "",
  chPrefilled: false,
  companyName: "",
  chAddress: "",
  chIncorporationDate: "",
  contactName: "",
  contactEmail: "",
  contactPhone: "",
  busRegistered: false,
  capHeatPump: false,
  capSolarPv: false,
  capBatteryStorage: false,
  certificationBody: "",
  certificationNumber: "",
  certificationPending: false,
  notes: "",
};

export function RequestForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [chError, setChError] = useState<string | null>(null);
  const [chPending, startChLookup] = useTransition();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function lookupCh() {
    if (!form.companyNumber.trim()) {
      setChError("Type your Companies House number first.");
      return;
    }
    setChError(null);
    try {
      const res = await fetch("/api/installer-signup/companies-house", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: form.companyNumber }),
      });
      const json = (await res.json()) as ChLookupResponse;
      if (!json.ok || !json.prefill) {
        setChError(json.error ?? "Lookup failed");
        return;
      }
      setForm((f) => ({
        ...f,
        chPrefilled: true,
        companyNumber: json.prefill!.companyNumber,
        companyName: json.prefill!.companyName || f.companyName,
        chAddress: json.prefill!.address ?? "",
        chIncorporationDate: json.prefill!.incorporationDate ?? "",
      }));
    } catch (e) {
      setChError(e instanceof Error ? e.message : "Network error");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);

    // Client-side guard for the same conditions we check server-side
    // — surfaces them as inline errors instead of the generic 400.
    if (!form.capHeatPump && !form.capSolarPv && !form.capBatteryStorage) {
      setSubmitError("Pick at least one speciality.");
      setSubmitting(false);
      return;
    }
    if (
      !form.certificationPending &&
      form.certificationNumber.trim().length === 0
    ) {
      setSubmitError(
        'Enter your MCS certification number, or tick "pending certification".',
      );
      setSubmitting(false);
      return;
    }

    const payload = {
      companyNumber: form.companyNumber.trim() || null,
      companyName: form.companyName.trim(),
      chAddress: form.chAddress.trim() || null,
      chIncorporationDate: form.chIncorporationDate || null,
      contactName: form.contactName.trim(),
      contactEmail: form.contactEmail.trim(),
      contactPhone: form.contactPhone.trim(),
      busRegistered: form.busRegistered,
      capHeatPump: form.capHeatPump,
      capSolarPv: form.capSolarPv,
      capBatteryStorage: form.capBatteryStorage,
      certificationBody: form.certificationBody || null,
      certificationNumber: form.certificationNumber.trim() || null,
      certificationPending: form.certificationPending,
      notes: form.notes.trim() || null,
    };

    try {
      const res = await fetch("/api/installer-signup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as InstallerSignupRequestResponse;
      if (!json.ok) {
        setSubmitError(json.error ?? "Submission failed");
        setSubmitting(false);
        return;
      }
      const params = new URLSearchParams({ email: form.contactEmail });
      router.push(`/installer-signup/request/pending?${params.toString()}`);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : "Network error");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* ── CH lookup ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={1}
          title="Companies House lookup (optional)"
          subtitle="Skip if you're a sole trader without a registered company."
        />
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={form.companyNumber}
              onChange={(e) => update("companyNumber", e.target.value)}
              placeholder="12345678 or SC123456"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => startChLookup(() => void lookupCh())}
            disabled={chPending}
            className="h-11 px-4 rounded-xl bg-navy hover:bg-navy/90 disabled:bg-slate-300 text-white font-semibold text-sm transition-colors"
          >
            {chPending ? "…" : "Look up"}
          </button>
        </div>
        {chError && (
          <p className="text-xs text-red-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            {chError}
          </p>
        )}
        {form.chPrefilled && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 flex items-start gap-2 text-sm">
            <span className="shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-100 text-emerald-700">
              <Building2 className="w-3.5 h-3.5" />
            </span>
            <div className="flex-1 text-emerald-900 leading-relaxed">
              <p className="font-semibold">{form.companyName}</p>
              {form.chAddress && (
                <p className="text-xs text-emerald-800 mt-0.5">
                  {form.chAddress}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Identity (manual fallback when no CH match) ───────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={2}
          title="Company name"
          subtitle={
            form.chPrefilled
              ? "Pre-filled from Companies House — edit if anything's off."
              : "Type the trading name we'll list you under."
          }
        />
        <Input
          label="Company name"
          value={form.companyName}
          onChange={(v) => update("companyName", v)}
          required
          placeholder="Acme Heating Ltd"
        />
      </section>

      {/* ── Contact ───────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={3}
          title="Contact"
          subtitle="Where leads + the approval email will land."
        />
        <Input
          label="Your name"
          value={form.contactName}
          onChange={(v) => update("contactName", v)}
          required
          placeholder="Jane Smith"
        />
        <Input
          label="Email"
          type="email"
          value={form.contactEmail}
          onChange={(v) => update("contactEmail", v)}
          required
          placeholder="you@company.com"
        />
        <Input
          label="Phone"
          type="tel"
          value={form.contactPhone}
          onChange={(v) => update("contactPhone", v)}
          required
          placeholder="07123 456789"
        />
      </section>

      {/* ── Capabilities ──────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={4}
          title="Specialities"
          subtitle="Tick everything you install. We use this to match you to the right homeowners."
        />
        <Checkbox
          checked={form.busRegistered}
          onChange={(v) => update("busRegistered", v)}
          label="BUS registered"
          help="The Boiler Upgrade Scheme grant only pays out via BUS-registered installers. Tick this if you're set up to claim grants on your customers' behalf."
        />
        <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">
            What you install
          </p>
          <Checkbox
            checked={form.capHeatPump}
            onChange={(v) => update("capHeatPump", v)}
            label="Heat pumps"
            help="Air source, ground source, etc."
          />
          <Checkbox
            checked={form.capSolarPv}
            onChange={(v) => update("capSolarPv", v)}
            label="Solar PV"
          />
          <Checkbox
            checked={form.capBatteryStorage}
            onChange={(v) => update("capBatteryStorage", v)}
            label="Battery storage"
          />
        </div>
      </section>

      {/* ── MCS ───────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={5}
          title="MCS certification"
          subtitle="Tell us who certified you, or tick the pending box if you're mid-application."
        />
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Certification body
          </label>
          <select
            value={form.certificationBody}
            onChange={(e) =>
              update("certificationBody", e.target.value as CertificationBody | "")
            }
            className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900"
          >
            <option value="">Select certification body…</option>
            {CERTIFICATION_BODIES.map((cb) => (
              <option key={cb} value={cb}>
                {cb}
              </option>
            ))}
          </select>
        </div>
        <Input
          label="Certification number"
          value={form.certificationNumber}
          onChange={(v) => update("certificationNumber", v)}
          placeholder="e.g. NAP-12345"
          disabled={form.certificationPending}
        />
        <Checkbox
          checked={form.certificationPending}
          onChange={(v) => {
            update("certificationPending", v);
            if (v) update("certificationNumber", "");
          }}
          label="I'm pending certification"
          help="Tick this if you've applied but don't have your number yet — admin will follow up before approving."
        />
      </section>

      {/* ── Notes ─────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <SectionHeader
          number={6}
          title="Anything else (optional)"
          subtitle="Areas you cover, the kit you specialise in, anything that helps us decide."
        />
        <textarea
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 resize-y"
          placeholder="We're a 6-person ASHP-only team in Yorkshire, MCS-certified since 2022…"
        />
      </section>

      {submitError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
      >
        <ShieldCheck className="w-4 h-4" />
        {submitting ? "Sending request…" : "Send request"}
      </button>
      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        We&rsquo;ll review and get back to you within a working day.
      </p>
    </form>
  );
}

// ─── Reusable bits ────────────────────────────────────────────────────

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-coral/10 text-coral text-[10px] font-bold">
          {number}
        </span>
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  required,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        placeholder={placeholder}
        className="w-full h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  help,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  help?: string;
}) {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer text-sm leading-relaxed select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral cursor-pointer"
      />
      <span>
        <span className="font-medium text-navy">{label}</span>
        {help && (
          <span className="block text-[11px] text-slate-500 mt-0.5 font-normal">
            {help}
          </span>
        )}
      </span>
    </label>
  );
}
