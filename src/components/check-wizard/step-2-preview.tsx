"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowLeft, CheckCircle2, Flame, Sun, Zap, Info, Loader2 } from "lucide-react";
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
  const { state, back, next } = useCheckWizard();
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
      fetch("/api/epc/by-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uprn: address.uprn,
          postcode: address.postcode,
          addressLine1: address.line1,
        }),
      })
        .then(async (r) => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return (await r.json()) as EpcByAddressResponse;
        })
        .then((data) => {
          if (cancelled) return;
          setEpc({ status: "ready", data, error: null });
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
        <h2 className="text-3xl sm:text-4xl text-navy">Is this your home?</h2>
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

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-full border border-[var(--border)] text-sm font-medium text-[var(--muted-brand)] hover:text-navy hover:border-navy transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              No, different address
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!ready}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-cream font-semibold text-sm transition-colors shadow-sm flex-1 sm:flex-initial"
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
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-coral-pale text-coral">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-navy">{title}</h3>
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
  const age = state.data.ageYears;
  const stale = typeof age === "number" && age > 10;

  return (
    <CardShell icon={<Zap className="w-4 h-4" />} title="EPC">
      <dl className="space-y-1.5 text-sm">
        <Row label="Current rating">
          <span className="font-medium text-navy">
            {c.currentEnergyBand || "—"}
            {c.currentEnergyRating != null ? ` · ${c.currentEnergyRating}` : ""}
          </span>
        </Row>
        {c.potentialEnergyBand && (
          <Row label="Potential">
            <span className="font-medium text-navy">{c.potentialEnergyBand}</span>
          </Row>
        )}
        {c.propertyType && (
          <Row label="Type">
            <span className="font-medium text-navy">
              {c.propertyType}
              {c.builtForm ? ` · ${c.builtForm}` : ""}
            </span>
          </Row>
        )}
        {c.constructionAgeBand && (
          <Row label="Age band">
            <span className="font-medium text-navy">{c.constructionAgeBand}</span>
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
      <p className="mt-3 text-xs text-slate-500">
        Matched by {state.data.matchMethod === "uprn" ? "UPRN (exact)" : "postcode + address"}.
      </p>
      {stale && (
        <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-3 py-2">
          This EPC is over 10 years old — you&rsquo;ll need a new one for a BUS application.
        </p>
      )}
    </CardShell>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-right">{children}</dd>
    </div>
  );
}
