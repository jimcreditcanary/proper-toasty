// /check/octopus/order — Tesla-style booking flow.
//
// Single screen, progressive disclosure:
//   1. Pick a day  (next 6 working days)
//   2. Pick a time (3 fixed slots — AM / lunch / evening)
//   3. Enter contact details (name / email / mobile — the minimum
//      Octopus needs to call you for the check-in)
//   4. Confirm
//
// Posts to /api/installer-leads/create with installerId = 9864
// (Octopus Energy Services Limited — already in the directory).
// On success, swaps the form for a clean confirmation view.
//
// The check-in is a short 30-minute call, NOT a paid commitment —
// so there's no Stripe / no card capture. The lead row is the
// commitment.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarCheck,
  Check,
  Loader2,
  MapPin,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LandingFooter } from "@/components/landing-footer";
import { OCTOPUS_PARTNER } from "@/lib/services/boiler-comparison";

// Hard-coded illustrative property (matches /check/octopus). Lat/lng
// are an approximate Worsley centroid — fine for the demo lead row.
const DEMO_ADDRESS = {
  formattedAddress: "2 Curtels Close, Worsley, Manchester, M28 2JR",
  postcode: "M28 2JR",
  uprn: null as string | null,
  latitude: 53.5083,
  longitude: -2.3877,
};

// Three offered slots per day (UK local hour, 24h clock).
const SLOT_HOURS = [10, 14, 18] as const;

interface Day {
  date: Date;
  weekday: string;
  dayMonth: string;
}

/** Next 6 working days (skips Sundays). Built at mount time only —
 *  see the useEffect below — to avoid an SSR/client hydration drift on
 *  `new Date()`. */
function buildDays(): Day[] {
  const out: Day[] = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (out.length < 6) {
    cursor.setDate(cursor.getDate() + 1);
    if (cursor.getDay() === 0) continue; // skip Sundays
    out.push({
      date: new Date(cursor),
      weekday: cursor.toLocaleDateString("en-GB", { weekday: "short" }),
      dayMonth: cursor.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
      }),
    });
  }
  return out;
}

export default function OctopusOrderPage() {
  // Days are computed client-side to avoid SSR hydration drift.
  const [days, setDays] = useState<Day[]>([]);
  useEffect(() => setDays(buildDays()), []);

  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Date | null>(null);

  const contactValid = useMemo(
    () =>
      name.trim().length >= 1 &&
      /.+@.+\..+/.test(email) &&
      phone.replace(/\D/g, "").length >= 7,
    [name, email, phone],
  );

  async function submit() {
    if (!selectedSlot || !contactValid || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/installer-leads/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installerId: OCTOPUS_PARTNER.installerId,
          contactEmail: email.trim(),
          contactName: name.trim(),
          contactPhone: phone.trim(),
          wantsHeatPump: true,
          wantsSolar: false,
          wantsBattery: false,
          propertyAddress: DEMO_ADDRESS.formattedAddress,
          propertyPostcode: DEMO_ADDRESS.postcode,
          propertyUprn: DEMO_ADDRESS.uprn,
          propertyLatitude: DEMO_ADDRESS.latitude,
          propertyLongitude: DEMO_ADDRESS.longitude,
          // 30-minute call; no travel buffer (it's not a site visit).
          meeting: {
            scheduledAtUtc: selectedSlot.toISOString(),
            durationMin: 30,
            travelBufferMin: 0,
          },
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Couldn't book — ${res.status}`);
      }
      setBooked(selectedSlot);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Couldn't book — please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (booked) {
    return <Booked slot={booked} name={name} phone={phone} />;
  }

  return (
    <div className="theme-octopus bg-cream min-h-[100dvh] flex flex-col">
      <MinimalHeader backHref="/check/octopus" />

      <main className="flex-1">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12 sm:py-16">
          <p className="eyebrow">Pre-install check-in</p>
          <h1 className="mt-3 text-4xl sm:text-5xl text-navy tracking-tight leading-tight">
            Pick a time.
            <br />
            We&rsquo;ll call.
          </h1>
          <p className="mt-4 text-[var(--muted-brand)] leading-relaxed max-w-xl">
            A 30-minute call with the Octopus team to confirm sizing,
            answer any questions, and lock in your install date. No
            site visit, no commitment.
          </p>

          {/* Property line */}
          <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-white border border-[var(--border)] px-3.5 py-2 text-xs text-[var(--muted-brand)] shadow-sm">
            <MapPin className="w-3.5 h-3.5 text-coral shrink-0" />
            <span className="text-navy font-medium">
              {DEMO_ADDRESS.formattedAddress}
            </span>
          </div>

          {/* Step 1 — day */}
          <Step n={1} title="Which day?">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {days.length === 0 && (
                <div className="col-span-full text-sm text-[var(--muted-brand)]">
                  Loading available days…
                </div>
              )}
              {days.map((d) => {
                const active =
                  selectedDay?.toDateString() === d.date.toDateString();
                return (
                  <button
                    key={d.date.toISOString()}
                    type="button"
                    onClick={() => {
                      setSelectedDay(d.date);
                      setSelectedSlot(null);
                    }}
                    className={`rounded-2xl border p-3 text-center transition-colors ${
                      active
                        ? "bg-coral text-cream border-coral shadow-lg"
                        : "bg-white border-[var(--border)] text-navy hover:bg-coral-pale"
                    }`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wider ${
                        active ? "text-cream/80" : "text-[var(--muted-brand)]"
                      }`}
                    >
                      {d.weekday}
                    </p>
                    <p className="mt-1 text-lg font-bold">{d.dayMonth}</p>
                  </button>
                );
              })}
            </div>
          </Step>

          {/* Step 2 — time */}
          {selectedDay && (
            <Step n={2} title="What time?">
              <div className="grid grid-cols-3 gap-3">
                {SLOT_HOURS.map((h) => {
                  const slot = new Date(selectedDay);
                  slot.setHours(h, 0, 0, 0);
                  const active =
                    selectedSlot?.getTime() === slot.getTime();
                  const label = `${h.toString().padStart(2, "0")}:00`;
                  const tag =
                    h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`rounded-2xl border p-4 text-center transition-colors ${
                        active
                          ? "bg-coral text-cream border-coral shadow-lg"
                          : "bg-white border-[var(--border)] text-navy hover:bg-coral-pale"
                      }`}
                    >
                      <p className="text-2xl font-bold">{label}</p>
                      <p
                        className={`mt-1 text-[10px] font-semibold uppercase tracking-wider ${
                          active ? "text-cream/80" : "text-[var(--muted-brand)]"
                        }`}
                      >
                        {tag}
                      </p>
                    </button>
                  );
                })}
              </div>
            </Step>
          )}

          {/* Step 3 — contact */}
          {selectedSlot && (
            <Step n={3} title="Where can we reach you?">
              <div className="grid grid-cols-1 gap-3">
                <Field
                  label="Your name"
                  value={name}
                  onChange={setName}
                  autoComplete="name"
                />
                <Field
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  autoComplete="email"
                />
                <Field
                  label="Mobile number"
                  type="tel"
                  value={phone}
                  onChange={setPhone}
                  autoComplete="tel"
                />
              </div>
            </Step>
          )}

          {/* Confirm */}
          {selectedSlot && (
            <div className="mt-10">
              <button
                type="button"
                onClick={submit}
                disabled={!contactValid || submitting}
                className="w-full inline-flex items-center justify-center gap-2.5 h-16 px-10 rounded-full bg-coral hover:bg-coral-dark disabled:opacity-50 disabled:cursor-not-allowed text-cream font-bold text-lg transition-colors shadow-2xl"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Booking…
                  </>
                ) : (
                  <>
                    Confirm booking
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
              {error && (
                <p className="mt-4 text-sm text-coral text-center">
                  {error}
                </p>
              )}
              <p className="mt-4 text-xs text-[var(--muted-brand)] text-center max-w-md mx-auto">
                Illustrative booking for research purposes only. No
                payment will be taken.
              </p>
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

// ── Booked (success) view ─────────────────────────────────────────

function Booked({
  slot,
  name,
  phone,
}: {
  slot: Date;
  name: string;
  phone: string;
}) {
  const day = slot.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const time = slot.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return (
    <div className="theme-octopus bg-cream min-h-[100dvh] flex flex-col">
      <MinimalHeader backHref="/check/octopus" />
      <main className="flex-1 flex items-center">
        <div className="mx-auto max-w-xl px-4 sm:px-6 py-20 text-center">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-coral-pale text-coral">
            <CalendarCheck className="w-10 h-10" />
          </span>
          <p className="eyebrow mt-6">Booked</p>
          <h1 className="mt-3 text-4xl sm:text-5xl text-navy tracking-tight">
            You&rsquo;re in.
          </h1>
          <p className="mt-5 text-xl text-navy">
            <span className="font-bold">{day}</span> at{" "}
            <span className="font-bold">{time}</span>.
          </p>
          <p className="mt-3 text-[var(--muted-brand)] leading-relaxed">
            Thanks {name.split(" ")[0]} — the Octopus team will call you
            on {phone} at that time. No prep needed.
          </p>
          <Link
            href="/octopus"
            className="mt-10 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold transition-colors"
          >
            Done
            <Check className="w-4 h-4" />
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}

// ── Layout primitives ─────────────────────────────────────────────

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-brand)]">
        <span className="text-coral">{n}.</span> {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: "text" | "email" | "tel";
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)] mb-1.5">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full h-12 px-4 rounded-xl border border-[var(--border)] bg-white text-base text-navy placeholder:text-[var(--muted-brand)] focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent"
      />
    </label>
  );
}

function MinimalHeader({ backHref }: { backHref: string }) {
  return (
    <header className="border-b border-[var(--border)] bg-cream/80 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 shrink-0 text-[var(--muted-brand)] hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <Logo size="sm" variant="light" />
        </Link>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-brand)] shrink-0">
          Illustrative
        </span>
      </div>
    </header>
  );
}
