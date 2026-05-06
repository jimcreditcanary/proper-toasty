"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  CheckCircle2,
  Flame,
  Sun,
  Zap,
  Info,
  Loader2,
} from "lucide-react";
import { useCheckWizard } from "./context";
import type { BuildingInsightsResponse } from "@/lib/schemas/solar";
import type { EpcByAddressResponse } from "@/lib/schemas/epc";

interface Loadable<T> {
  status: "idle" | "loading" | "ready" | "error";
  data: T | null;
  error: string | null;
}

function initial<T>(): Loadable<T> {
  return { status: "idle", data: null, error: null };
}

export function Step2Preview() {
  const { state, update, back, next } = useCheckWizard();
  const address = state.address;

  const [solar, setSolar] = useState<Loadable<BuildingInsightsResponse>>(initial);
  const [epc, setEpc] = useState<Loadable<EpcByAddressResponse>>(initial);

  useEffect(() => {
    if (!address) return;
    let cancelled = false;

    setSolar({ status: "loading", data: null, error: null });
    fetch("/api/solar/building", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lat: address.latitude, lng: address.longitude }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as BuildingInsightsResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setSolar({ status: "ready", data, error: null });
      })
      .catch((e) => {
        if (cancelled) return;
        setSolar({ status: "error", data: null, error: e.message ?? "Solar lookup failed" });
      });

    if (address.uprn || (address.postcode && address.line1)) {
      setEpc({ status: "loading", data: null, error: null });
      // Only include `uprn` in the body when it's a real UPRN.
      // Sending null/empty would either fail the route's zod
      // validation or — worse — cause the EPC service to skip
      // the postcode+address fallback path it needs in PAF-only
      // postcodes (HX3 7DG and similar multi-flat blocks).
      const body: {
        uprn?: string;
        postcode: string;
        addressLine1: string;
        addressFull?: string;
      } = {
        postcode: address.postcode,
        addressLine1: address.line1,
        // Pass the FULL summary (e.g. "Flat 12, The Old Mill, Mill Road, Halifax")
        // so the EPC fuzzy matcher has more to work with than addressLine1
        // alone in multi-occupancy buildings.
        addressFull: address.formattedAddress || undefined,
      };
      if (address.uprn) body.uprn = address.uprn;
      fetch("/api/epc/by-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as EpcByAddressResponse;
        })
        .then((data) => {
          if (cancelled) return;
          setEpc({ status: "ready", data, error: null });

          // UPRN backfill from EPC.
          //
          // Postcoder doesn't always return UPRNs (depends on plan tier).
          // The EPC API does — every certificate row carries the UPRN of
          // the property it was lodged against. When our address has no
          // UPRN but the matched EPC does, copy it back into wizard state
          // so every downstream call (analyse, share, book) carries a
          // real OS UPRN, and the next /api/checks/upsert persists it
          // to checks.uprn for future runs.
          //
          // We only backfill when:
          //   - the EPC was actually found (not a 'no match' response)
          //   - the cert carries a non-empty UPRN
          //   - the wizard's current address has no UPRN
          //   - postcodes match (sanity check — the cert's UPRN is for
          //     this property, not a neighbour from a fuzzy mismatch)
          if (
            data.found &&
            data.certificate.uprn &&
            !address.uprn &&
            (data.certificate.postcode ?? "").replace(/\s+/g, "").toUpperCase() ===
              address.postcode.replace(/\s+/g, "").toUpperCase()
          ) {
            console.info(
              `[wizard] backfilled UPRN ${data.certificate.uprn} from EPC for ${address.formattedAddress}`
            );
            update({ address: { ...address, uprn: data.certificate.uprn } });
          }
        })
        .catch((e) => {
          if (cancelled) return;
          setEpc({ status: "error", data: null, error: e.message ?? "EPC lookup failed" });
        });
    } else {
      setEpc({ status: "ready", data: { found: false, reason: "No postcode available." }, error: null });
    }

    return () => {
      cancelled = true;
    };
    // `update` is the wizard reducer dispatch — stable across renders.
    // It's referenced inside the EPC backfill block but doesn't need
    // to retrigger the effect when the address hasn't changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  const satelliteUrl = useMemo(() => {
    if (!address) return null;
    const qs = new URLSearchParams({
      lat: String(address.latitude),
      lng: String(address.longitude),
      zoom: "21",
      w: "800",
      h: "600",
    });
    return `/api/imagery/satellite?${qs.toString()}`;
  }, [address]);

  if (!address) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <p className="text-slate-600">We need an address first.</p>
        <button onClick={back} className="mt-6 text-sm text-coral hover:underline">
          Go back to step 1
        </button>
      </div>
    );
  }

  const ready = solar.status !== "loading" && epc.status !== "loading";

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl text-navy">Is this your home?</h1>
      </div>

      {/* Side-by-side: compact satellite + address card with inline CTAs so the
          decision is always above the fold. */}
      <div className="rounded-2xl overflow-hidden border border-[var(--border)] bg-white shadow-sm grid grid-cols-1 md:grid-cols-5">
        <div className="relative md:col-span-2 aspect-[4/3] md:aspect-auto md:min-h-[260px] bg-slate-100">
          {satelliteUrl && (
            <Image
              src={satelliteUrl}
              alt="Satellite view of your property"
              fill
              sizes="(max-width: 768px) 100vw, 400px"
              className="object-cover"
              unoptimized
              priority
            />
          )}
        </div>

        <div className="md:col-span-3 p-5 sm:p-6 flex flex-col">
          <div className="flex-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-brand)] mb-2">
              The address we&rsquo;ve got
            </p>
            <p className="text-base font-medium text-navy leading-snug">
              {address.formattedAddress}
            </p>
            <p className="mt-2 text-xs text-[var(--muted-brand)]">
              {state.country ? `${state.country} · ` : ""}
              {address.postcode ?? `${address.latitude.toFixed(4)}, ${address.longitude.toFixed(4)}`}
            </p>
          </div>

          {/* Stacked on mobile (full-width buttons, primary on top
              via flex-col-reverse). Inline on desktop. The flex-1
              vs flex-initial trick was meant to expand the primary
              button on mobile, but `inline-flex` items keep their
              content width unless told otherwise. Replaced with
              explicit w-full sm:w-auto so both buttons stretch
              cleanly on phones. */}
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
            <button
              type="button"
              onClick={back}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted-brand)] hover:text-navy hover:border-navy transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              No, different address
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!ready}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-cream font-semibold text-sm transition-colors shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4" />
              Yes, that&rsquo;s my home
            </button>
          </div>
        </div>
      </div>

      {/* Detail cards — supporting info, not blockers for advancing. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
        <SolarCard state={solar} />
        <EpcCard state={epc} />
      </div>
    </div>
  );
}

function CardShell({
  icon,
  title,
  headerRight,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  /** Optional content rendered at the top-right of the card header.
   *  Used by the EPC card to host the "Matched Exactly" badge. */
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-coral-pale text-coral">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
        {headerRight && <div className="ml-auto">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}

function SolarCard({ state }: { state: Loadable<BuildingInsightsResponse> }) {
  if (state.status === "loading") {
    return (
      <CardShell icon={<Sun className="w-4 h-4" />} title="Solar potential">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Checking roof…
        </div>
      </CardShell>
    );
  }

  if (state.status === "error" || !state.data) {
    return (
      <CardShell icon={<Sun className="w-4 h-4" />} title="Solar potential">
        <p className="text-sm text-slate-500">
          Couldn&rsquo;t check rooftop data — we&rsquo;ll fall back to a manual estimate in the report.
        </p>
      </CardShell>
    );
  }

  if (!state.data.coverage) {
    return (
      <CardShell icon={<Sun className="w-4 h-4" />} title="Solar potential">
        <p className="text-sm text-slate-500">{state.data.reason}</p>
        <p className="mt-2 text-xs text-slate-500">
          We&rsquo;ll still size a system for you from climate data.
        </p>
      </CardShell>
    );
  }

  const sp = state.data.data.solarPotential;
  const panels = sp.maxArrayPanelsCount;
  const segments = sp.roofSegmentStats?.length;
  const sunshine = sp.maxSunshineHoursPerYear;

  return (
    <CardShell icon={<Sun className="w-4 h-4" />} title="Solar potential">
      <dl className="space-y-1.5 text-sm">
        {typeof panels === "number" && (
          <Row label="Max panels that fit">
            <span className="font-medium text-navy">{panels}</span>
          </Row>
        )}
        {typeof segments === "number" && (
          <Row label="Roof segments">
            <span className="font-medium text-navy">{segments}</span>
          </Row>
        )}
        {typeof sunshine === "number" && (
          <Row label="Sunshine hours / yr">
            <span className="font-medium text-navy">{Math.round(sunshine).toLocaleString()}</span>
          </Row>
        )}
        <Row label="Imagery quality">
          <span className="text-xs uppercase tracking-wider text-slate-500">
            {state.data.quality}
          </span>
        </Row>
      </dl>
    </CardShell>
  );
}

function EpcCard({ state }: { state: Loadable<EpcByAddressResponse> }) {
  if (state.status === "loading") {
    return (
      <CardShell icon={<Zap className="w-4 h-4" />} title="EPC">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          Looking up your EPC…
        </div>
      </CardShell>
    );
  }

  if (state.status === "error" || !state.data) {
    return (
      <CardShell icon={<Zap className="w-4 h-4" />} title="EPC">
        <p className="text-sm text-slate-500">Couldn&rsquo;t reach the EPC register right now.</p>
      </CardShell>
    );
  }

  if (!state.data.found) {
    return (
      <CardShell icon={<Zap className="w-4 h-4" />} title="EPC">
        <p className="text-sm text-slate-500">{state.data.reason}</p>
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2 flex items-start gap-2">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span>A valid EPC (under 10 years old) is required before applying for the Boiler Upgrade Scheme. Typical cost £60–£120.</span>
        </p>
      </CardShell>
    );
  }

  const c = state.data.certificate;
  const stale = c.expired;

  // Compact "Matched Exactly" / "Matched (postcode)" badge for the
  // top-right of the card header. Tells installers at a glance how
  // confident the match is.
  const matchBadge =
    state.data.matchMethod === "uprn" ? (
      <span
        title="Matched by OS UPRN"
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5"
      >
        <CheckCircle2 className="w-3 h-3" />
        Matched Exactly
      </span>
    ) : (
      <span
        title="Matched by postcode + address fuzzy match"
        className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5"
      >
        Postcode match
      </span>
    );

  return (
    <CardShell
      icon={<Zap className="w-4 h-4" />}
      title="EPC"
      headerRight={matchBadge}
    >
      {/* Rating squares — current + potential side-by-side, mirrors
          the GOV.UK certificate's headline visual. */}
      <div className="flex items-stretch gap-3">
        <RatingTile
          label="Current"
          band={c.currentEnergyBand}
          rating={c.currentEnergyRating}
        />
        <RatingTile
          label="Potential"
          band={c.potentialEnergyBand}
          rating={c.potentialEnergyRating}
        />
      </div>

      {/* Property type + valid till — the two facts an installer
          asks for first. */}
      <dl className="mt-4 space-y-1.5 text-sm">
        {(c.propertyType || c.builtForm) && (
          <Row label="Property type">
            <span className="font-medium text-navy">
              {[c.propertyType, c.builtForm].filter(Boolean).join(" · ") || "—"}
            </span>
          </Row>
        )}
        {c.validUntil && (
          <Row label="Valid till">
            <span
              className={
                stale
                  ? "font-medium text-red-700"
                  : "font-medium text-navy"
              }
            >
              {formatDate(c.validUntil)}
              {stale && <span className="ml-1 text-xs">(expired)</span>}
            </span>
          </Row>
        )}
        {c.totalFloorAreaM2 != null && (
          <Row label="Floor area">
            <span className="font-medium text-navy">{Math.round(c.totalFloorAreaM2)} m²</span>
          </Row>
        )}
        {c.mainFuel && (
          <Row label="Main fuel">
            <span className="font-medium text-navy inline-flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-coral" />
              {c.mainFuel}
            </span>
          </Row>
        )}
      </dl>

      {stale && (
        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          This EPC has expired — you&rsquo;ll need a new one (typical cost £60–£120) before a BUS application.
        </p>
      )}
    </CardShell>
  );
}

/** Tiny date formatter for the valid-till row. Returns DD MMM YYYY
 *  (e.g. "20 Nov 2034") which is unambiguous for UK readers without
 *  the day-month-year-vs-month-day confusion of all-numeric dates. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Coloured A-G band tile, mirroring the GOV.UK EPC certificate
 *  visual. The band letter is the eye-catching part; the optional
 *  numeric SAP rating sits underneath in smaller type. */
function RatingTile({
  label,
  band,
  rating,
}: {
  label: string;
  band: string | null;
  rating: number | null;
}) {
  const palette = bandPalette(band);
  return (
    <div className="flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <div
        className="mx-auto inline-flex items-center justify-center w-12 h-12 rounded-md text-white text-2xl font-bold shadow-sm"
        style={{ backgroundColor: palette.bg }}
      >
        {band ?? "—"}
      </div>
      {rating != null && (
        <p className="mt-2 text-xs text-slate-600">
          SAP <span className="font-semibold text-navy">{rating}</span>
        </p>
      )}
    </div>
  );
}

/** GOV.UK EPC band colours. Matches the canonical EPC certificate
 *  palette so a homeowner who's seen their cert recognises it. */
function bandPalette(band: string | null): { bg: string } {
  switch ((band ?? "").toUpperCase()) {
    case "A":
      return { bg: "#008054" }; // dark green
    case "B":
      return { bg: "#19b459" }; // green
    case "C":
      return { bg: "#8dce46" }; // light green
    case "D":
      return { bg: "#ffd500" }; // yellow
    case "E":
      return { bg: "#fcaa65" }; // orange
    case "F":
      return { bg: "#ef8023" }; // dark orange
    case "G":
      return { bg: "#e9153b" }; // red
    default:
      return { bg: "#94a3b8" }; // slate-400 — unknown
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
