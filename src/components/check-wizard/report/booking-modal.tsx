"use client";

// BookingModal — the lead-capture form that appears when a homeowner
// clicks "Book a meeting" on an installer tile.
//
// Submits to /api/installer-leads/create which inserts into
// public.installer_leads. We don't email the installer yet — that
// fan-out happens in PR 4 when the installer portal lands. For now
// we capture the lead, show a "we've got it, we'll be in touch"
// confirmation, and the admin team takes it from there.

import { useEffect, useState } from "react";
import { Loader2, MapPin, X, CheckCircle2, MessageSquare } from "lucide-react";
import type {
  CreateInstallerLeadRequest,
  CreateInstallerLeadResponse,
  InstallerCard,
} from "@/lib/schemas/installers";

interface Props {
  installer: InstallerCard;
  // Pre-fill defaults from the wizard / report context
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
  // Tech selection from the report shell
  selection: {
    hasHeatPump: boolean;
    hasSolar: boolean;
    hasBattery: boolean;
  };
  onClose: () => void;
}

export function BookingModal({ installer, defaults, selection, onClose }: Props) {
  const [contactEmail, setContactEmail] = useState(defaults.contactEmail ?? "");
  const [contactName, setContactName] = useState(defaults.contactName ?? "");
  const [contactPhone, setContactPhone] = useState("");
  const [contactMethod, setContactMethod] = useState<
    "email" | "phone" | "whatsapp" | "any"
  >("any");
  const [contactWindow, setContactWindow] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!contactEmail.trim()) {
      setError("Please enter your email so the installer can reply.");
      return;
    }
    if (!contactName.trim()) {
      setError("Please tell us your name.");
      return;
    }

    const body: CreateInstallerLeadRequest = {
      installerId: installer.id,
      contactEmail: contactEmail.trim(),
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim() || null,
      preferredContactMethod: contactMethod,
      preferredContactWindow: contactWindow.trim() || null,
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
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/installer-leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as CreateInstallerLeadResponse;
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Couldn't save (${res.status})`);
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal
      aria-labelledby="booking-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 inline-flex items-center justify-center w-8 h-8 rounded-full bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {done ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-bold text-navy">
              Booking sent!
            </h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              We&rsquo;ve passed your details and your report through to{" "}
              <strong className="text-navy">{installer.companyName}</strong>.
              They&rsquo;ll be in touch within a couple of working days to
              arrange a site visit.
            </p>
            <p className="mt-4 text-xs text-slate-500">
              We&rsquo;ll email you a confirmation at{" "}
              <strong>{contactEmail}</strong>.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 inline-flex items-center justify-center h-11 px-6 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm"
            >
              Back to the directory
            </button>
          </div>
        ) : (
          <>
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
              {(installer.postcode || installer.county) && (
                <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {[installer.county, installer.postcode]
                    .filter(Boolean)
                    .join(" · ")}
                  {installer.distanceKm != null &&
                    ` · ${installer.distanceKm}km from you`}
                </p>
              )}
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                We&rsquo;ll send your contact details and your full property
                report to {installer.companyName} so they can give you an
                accurate quote on the site visit.
              </p>
            </div>

            <form onSubmit={submit} className="p-5 sm:p-6 space-y-4">
              <Field label="Your name *">
                <input
                  type="text"
                  required
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Sarah Jones"
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
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
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                  autoComplete="email"
                />
              </Field>

              <Field label="Phone (optional)">
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="07…"
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Best way to reach you">
                <div className="grid grid-cols-4 gap-2">
                  {(
                    [
                      { v: "any", label: "Any" },
                      { v: "email", label: "Email" },
                      { v: "phone", label: "Phone" },
                      { v: "whatsapp", label: "WhatsApp" },
                    ] as const
                  ).map((opt) => {
                    const active = contactMethod === opt.v;
                    return (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => setContactMethod(opt.v)}
                        className={`h-10 rounded-lg border text-xs font-medium transition-colors ${
                          active
                            ? "border-coral bg-coral-pale text-coral-dark"
                            : "border-[var(--border)] bg-white text-slate-600 hover:border-slate-300"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </Field>

              <Field label="When's a good time? (optional)">
                <input
                  type="text"
                  value={contactWindow}
                  onChange={(e) => setContactWindow(e.target.value)}
                  placeholder="e.g. Weekdays after 6pm, weekends anytime"
                  className="w-full h-11 px-3 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral"
                />
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
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral/30 focus:border-coral resize-y"
                />
              </Field>

              {error && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
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
                    Sending…
                  </>
                ) : (
                  <>Send my details to {installer.companyName.split(" ")[0]}</>
                )}
              </button>

              <p className="text-[11px] text-slate-500 text-center leading-relaxed">
                By sending we&rsquo;ll share your contact info, address, and
                report with this installer only. We never sell your details.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  // If the label ends with " *", treat the asterisk as visual-only —
  // the matching `<input required>` already announces the field as
  // required to screen readers, so we don't want them to also hear
  // "asterisk" appended to the label.
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
