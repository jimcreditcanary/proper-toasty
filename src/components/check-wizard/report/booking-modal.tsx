"use client";

// BookingModal — 3-step site-visit booking flow.
//
//   Step 1 (slot)    Pick a day + time from the installer's bookable
//                    slots. Slots come from /api/installers/availability
//                    which runs the slot generator over the installer's
//                    weekly availability + existing meetings.
//
//   Step 2 (form)    Confirm contact details. Name + email prefilled
//                    from the wizard. Phone mandatory (UK mobile).
//                    Notes optional. CTA carries the full company name
//                    so the user knows exactly who they're booking with.
//
//   Step 3 (done)    Confirmation. Shows the booking summary the user
//                    will also receive by email. After PR B.4 they'll
//                    also get a Google Calendar invite.
//
// Submits through /api/installer-leads/create with a `meeting` envelope
// — the route inserts both the lead row (existing semantics) and a
// matching installer_meetings row (new in PR B.2).

import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  MapPin,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import type {
  CreateInstallerLeadRequest,
  CreateInstallerLeadResponse,
  InstallerCard,
} from "@/lib/schemas/installers";
import {
  isValidUkMobile,
  type AvailabilityResponse,
  type BookableSlot,
} from "@/lib/schemas/booking";

interface Props {
  installer: InstallerCard;
  defaults: {
    contactEmail?: string | null;
    contactName?: string | null;
    homeownerLeadId?: string | null;
    propertyAddress?: string | null;
    propertyPostcode?: string | null;
    propertyUprn?: string | null;
    propertyLatitude?: number | null;
    propertyLongitude?: number | null;
    analysisSnapshot?: unknown;
  };
  selection: {
    hasHeatPump: boolean;
    hasSolar: boolean;
    hasBattery: boolean;
  };
  onClose: () => void;
}

type Step = "slot" | "form" | "done";

export function BookingModal({
  installer,
  defaults,
  selection,
  onClose,
}: Props) {
  // ─── Step state ────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>("slot");
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);

  // ─── Slot fetching ─────────────────────────────────────────────────
  const [slots, setSlots] = useState<BookableSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/installers/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installerId: installer.id }),
        });
        const json = (await res.json()) as AvailabilityResponse;
        if (cancelled) return;
        if (!json.ok) {
          setSlotsError(json.error ?? "Couldn't load availability");
          setSlots([]);
        } else {
          setSlots(json.slots);
          setActiveDayKey(json.slots[0]?.dayKey ?? null);
        }
      } catch (e) {
        if (!cancelled) {
          setSlotsError(
            e instanceof Error ? e.message : "Couldn't load availability",
          );
          setSlots([]);
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [installer.id]);

  // Group slots by day for the picker.
  const slotsByDay = useMemo(() => {
    const map = new Map<string, { dayLabel: string; slots: BookableSlot[] }>();
    for (const s of slots ?? []) {
      const entry = map.get(s.dayKey);
      if (entry) {
        entry.slots.push(s);
      } else {
        map.set(s.dayKey, { dayLabel: s.dayLabel, slots: [s] });
      }
    }
    return Array.from(map.entries()).map(([dayKey, v]) => ({
      dayKey,
      dayLabel: v.dayLabel,
      slots: v.slots,
    }));
  }, [slots]);

  const slotsForActiveDay = useMemo(() => {
    if (!activeDayKey) return [];
    return slotsByDay.find((d) => d.dayKey === activeDayKey)?.slots ?? [];
  }, [slotsByDay, activeDayKey]);

  // ─── Form state ────────────────────────────────────────────────────
  const [contactName, setContactName] = useState(defaults.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(defaults.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const phoneInvalid =
    phoneTouched && contactPhone.trim() !== "" && !isValidUkMobile(contactPhone);
  const phoneEmpty = phoneTouched && contactPhone.trim() === "";

  // ─── Modal a11y plumbing — preserved from the previous implementation
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const errorId = useId();

  useEffect(() => {
    triggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
    return () => {
      const t = triggerRef.current;
      if (t && typeof t.focus === "function") {
        setTimeout(() => t.focus(), 0);
      }
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter(
        (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // ─── Submit ────────────────────────────────────────────────────────
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setPhoneTouched(true);
    if (!selectedSlot) {
      setStep("slot");
      return;
    }
    if (!contactName.trim()) {
      setSubmitError("Please tell us your name.");
      return;
    }
    if (!contactEmail.trim()) {
      setSubmitError("Please enter your email.");
      return;
    }
    if (!isValidUkMobile(contactPhone)) {
      setSubmitError("Please enter a valid UK mobile number.");
      return;
    }

    const body: CreateInstallerLeadRequest = {
      installerId: installer.id,
      contactEmail: contactEmail.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim(),
      // The new flow doesn't ask for these — populated as null so the
      // schema (which still allows them for back-compat) is happy.
      preferredContactMethod: null,
      preferredContactWindow: null,
      notes: notes.trim() || null,
      wantsHeatPump: selection.hasHeatPump,
      wantsSolar: selection.hasSolar,
      wantsBattery: selection.hasBattery,
      homeownerLeadId: defaults.homeownerLeadId ?? null,
      propertyAddress: defaults.propertyAddress ?? null,
      propertyPostcode: defaults.propertyPostcode ?? null,
      propertyUprn: defaults.propertyUprn ?? null,
      propertyLatitude: defaults.propertyLatitude ?? null,
      propertyLongitude: defaults.propertyLongitude ?? null,
      analysisSnapshot: defaults.analysisSnapshot ?? null,
      meeting: {
        scheduledAtUtc: selectedSlot.startUtc,
        durationMin: 60,
        travelBufferMin: 30,
      },
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/installer-leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as
        | CreateInstallerLeadResponse
        | undefined;
      if (!res.ok || !data || !data.ok) {
        throw new Error(data?.error ?? `Couldn't save (${res.status})`);
      }
      setStep("done");
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Something went wrong — try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="booking-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 inline-flex items-center justify-center w-11 h-11 rounded-full bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {step === "done" ? (
          <ConfirmationView
            installer={installer}
            slot={selectedSlot!}
            contactName={contactName}
            contactEmail={contactEmail}
            propertyAddress={defaults.propertyAddress ?? null}
            onClose={onClose}
          />
        ) : (
          <>
            <Header installer={installer} step={step} />

            {step === "slot" ? (
              <SlotPicker
                loading={slotsLoading}
                error={slotsError}
                slotsByDay={slotsByDay}
                slotsForActiveDay={slotsForActiveDay}
                activeDayKey={activeDayKey}
                onPickDay={setActiveDayKey}
                selectedSlot={selectedSlot}
                onPickSlot={setSelectedSlot}
                onContinue={() => setStep("form")}
              />
            ) : (
              <FormStep
                installer={installer}
                slot={selectedSlot}
                contactName={contactName}
                setContactName={setContactName}
                contactEmail={contactEmail}
                setContactEmail={setContactEmail}
                contactPhone={contactPhone}
                setContactPhone={setContactPhone}
                phoneInvalid={phoneInvalid}
                phoneEmpty={phoneEmpty}
                onBlurPhone={() => setPhoneTouched(true)}
                notes={notes}
                setNotes={setNotes}
                submitting={submitting}
                error={submitError}
                errorId={errorId}
                onBack={() => setStep("slot")}
                onSubmit={submit}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function Header({
  installer,
  step,
}: {
  installer: InstallerCard;
  step: "slot" | "form";
}) {
  const subtitle =
    step === "slot"
      ? "Pick a day and time that works for you."
      : "Confirm your details and we'll lock in the slot.";
  return (
    <div className="p-5 sm:p-6 border-b border-slate-100">
      <p className="text-xs font-semibold uppercase tracking-wider text-coral">
        Book a site visit
      </p>
      <h2
        id="booking-title"
        className="mt-1 text-xl font-bold text-navy leading-tight"
      >
        {installer.companyName}
      </h2>
      {(installer.postcode || installer.distanceKm != null) && (
        <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {installer.postcode && `Based in ${installer.postcode}`}
          {installer.postcode && installer.distanceKm != null && " · "}
          {installer.distanceKm != null &&
            `${Math.round(installer.distanceKm * 0.621371 * 10) / 10} miles away`}
        </p>
      )}
      <p className="mt-3 text-sm text-slate-600 leading-relaxed">{subtitle}</p>
    </div>
  );
}

// ─── Step 1: slot picker ────────────────────────────────────────────────

function SlotPicker({
  loading,
  error,
  slotsByDay,
  slotsForActiveDay,
  activeDayKey,
  onPickDay,
  selectedSlot,
  onPickSlot,
  onContinue,
}: {
  loading: boolean;
  error: string | null;
  slotsByDay: { dayKey: string; dayLabel: string; slots: BookableSlot[] }[];
  slotsForActiveDay: BookableSlot[];
  activeDayKey: string | null;
  onPickDay: (key: string) => void;
  selectedSlot: BookableSlot | null;
  onPickSlot: (s: BookableSlot) => void;
  onContinue: () => void;
}) {
  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-sm text-slate-500">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading available slots…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {error}
        </p>
      </div>
    );
  }

  if (slotsByDay.length === 0) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
          <p className="font-semibold">
            No slots available in the next 28 days.
          </p>
          <p className="mt-1.5">
            This installer&rsquo;s diary is fully booked. Try another from
            the list — there are plenty of MCS-certified options nearby.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      {/* Day strip — horizontally scrollable so the modal doesn't have
          to widen as the window stretches across 28 days. */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1.5">
          <Calendar className="w-3 h-3" />
          Choose a day
        </p>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {slotsByDay.map((d) => {
            const active = d.dayKey === activeDayKey;
            const slotCount = d.slots.length;
            return (
              <button
                key={d.dayKey}
                type="button"
                onClick={() => onPickDay(d.dayKey)}
                className={`shrink-0 rounded-xl border px-3 py-2 text-left transition-all ${
                  active
                    ? "border-coral bg-coral-pale/40 ring-2 ring-coral/30"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-xs font-semibold text-navy whitespace-nowrap">
                  {d.dayLabel}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  {slotCount} slot{slotCount === 1 ? "" : "s"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
          Choose a time
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {slotsForActiveDay.map((s) => {
            const active = selectedSlot?.startUtc === s.startUtc;
            return (
              <button
                key={s.startUtc}
                type="button"
                onClick={() => onPickSlot(s)}
                className={`h-11 rounded-lg border text-sm font-semibold tabular-nums transition-colors ${
                  active
                    ? "border-coral bg-coral text-white shadow-sm"
                    : "border-slate-200 bg-white text-navy hover:border-coral/40 hover:bg-coral-pale/30"
                }`}
              >
                {s.timeLabel}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          1-hour visit. Times shown in UK time (Europe/London).
        </p>
      </div>

      {/* Continue */}
      <button
        type="button"
        onClick={onContinue}
        disabled={!selectedSlot}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
      >
        {selectedSlot
          ? `Continue with ${selectedSlot.dayLabel} at ${selectedSlot.timeLabel}`
          : "Pick a slot to continue"}
      </button>
    </div>
  );
}

// ─── Step 2: form ───────────────────────────────────────────────────────

function FormStep({
  installer,
  slot,
  contactName,
  setContactName,
  contactEmail,
  setContactEmail,
  contactPhone,
  setContactPhone,
  phoneInvalid,
  phoneEmpty,
  onBlurPhone,
  notes,
  setNotes,
  submitting,
  error,
  errorId,
  onBack,
  onSubmit,
}: {
  installer: InstallerCard;
  slot: BookableSlot | null;
  contactName: string;
  setContactName: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  contactPhone: string;
  setContactPhone: (v: string) => void;
  phoneInvalid: boolean;
  phoneEmpty: boolean;
  onBlurPhone: () => void;
  notes: string;
  setNotes: (v: string) => void;
  submitting: boolean;
  error: string | null;
  errorId: string;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!slot) return null;
  return (
    <form
      onSubmit={onSubmit}
      className="p-5 sm:p-6 space-y-4"
      aria-describedby={error ? errorId : undefined}
    >
      {/* Selected slot recap — coral pill so it's visually anchored
          to the booking action. */}
      <div className="rounded-xl bg-coral-pale/40 border border-coral/30 p-3 flex items-center gap-3">
        <span className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-white text-coral border border-coral/30">
          <Calendar className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-coral-dark font-semibold">
            Booking for
          </p>
          <p className="text-sm font-bold text-navy">
            {slot.dayLabel} · {slot.timeLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="shrink-0 inline-flex items-center gap-1 text-xs text-coral-dark hover:underline"
        >
          <ChevronLeft className="w-3 h-3" />
          Change
        </button>
      </div>

      <Field label="Your name *">
        <input
          type="text"
          required
          value={contactName}
          onChange={(e) => setContactName(e.target.value)}
          placeholder="Sarah Jones"
          className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
          autoComplete="name"
        />
      </Field>

      <Field label="Email *">
        <input
          type="email"
          required
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
          autoComplete="email"
        />
      </Field>

      <Field
        label="Mobile number *"
        icon={<Phone className="w-3.5 h-3.5" />}
      >
        <input
          type="tel"
          required
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          onBlur={onBlurPhone}
          placeholder="07700 900123"
          aria-invalid={phoneInvalid || phoneEmpty}
          className={`w-full h-11 px-3 rounded-lg border bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral ${
            phoneInvalid || phoneEmpty
              ? "border-red-300"
              : "border-[var(--border)]"
          }`}
          autoComplete="tel"
        />
        {phoneEmpty && (
          <p className="mt-1 text-xs text-red-600">
            We need a mobile so the installer can confirm the visit.
          </p>
        )}
        {phoneInvalid && (
          <p className="mt-1 text-xs text-red-600">
            That doesn&rsquo;t look like a UK mobile — try 07… or +44 7…
          </p>
        )}
        {!phoneInvalid && !phoneEmpty && (
          <p className="mt-1 text-[11px] text-slate-500">
            Used by the installer to confirm your visit. We never share it
            with anyone else.
          </p>
        )}
      </Field>

      <Field
        label="Anything else worth them knowing? (optional)"
        icon={<MessageSquare className="w-3.5 h-3.5" />}
      >
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Roof was redone in 2022, scaffolding access via the side gate, planning permission approved for the loft conversion…"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral resize-y"
        />
      </Field>

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-sm transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Booking…
          </>
        ) : (
          <>Book site survey with {installer.companyName}</>
        )}
      </button>

      <p className="text-[11px] text-slate-500 text-center leading-relaxed">
        By booking, we&rsquo;ll share your contact info, address, and report
        with this installer only. We never sell your details.
      </p>
    </form>
  );
}

// ─── Step 3: confirmation ───────────────────────────────────────────────

function ConfirmationView({
  installer,
  slot,
  contactName,
  contactEmail,
  propertyAddress,
  onClose,
}: {
  installer: InstallerCard;
  slot: BookableSlot;
  contactName: string;
  contactEmail: string;
  propertyAddress: string | null;
  onClose: () => void;
}) {
  return (
    <div className="p-6 sm:p-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
        <CheckCircle2 className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-navy">You&rsquo;re booked in</h2>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        We&rsquo;ll send a calendar invite and confirmation email to{" "}
        <strong className="text-navy">{contactEmail}</strong> shortly.
      </p>

      {/* Summary card — same layout the user will see in the
          confirmation email so the moment is reassuring rather than
          surprising. */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-left text-sm space-y-2">
        <SummaryRow label="Name" value={contactName} />
        <SummaryRow label="Company" value={installer.companyName} />
        {propertyAddress && (
          <SummaryRow label="Address for survey" value={propertyAddress} />
        )}
        <SummaryRow label="Date" value={slot.dayLabel} />
        <SummaryRow label="Time" value={`${slot.timeLabel} (UK time)`} />
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm"
      >
        Back to the directory
      </button>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-navy text-right break-words">
        {value}
      </span>
    </div>
  );
}

// ─── Field wrapper ──────────────────────────────────────────────────────

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  // Asterisk in the label is decorative — the matching <input required>
  // already announces the field as required to screen readers.
  const trimmed = label.replace(/\s*\*\s*$/, "");
  const showStar = trimmed !== label;
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-navy mb-1.5 inline-flex items-center gap-1.5">
        {icon}
        <span>
          {trimmed}
          {showStar && (
            <span className="text-coral ml-0.5" aria-hidden="true">
              *
            </span>
          )}
        </span>
      </span>
      {children}
    </label>
  );
}
