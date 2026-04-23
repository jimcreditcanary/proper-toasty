"use client";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Flame,
  Info,
  Landmark,
  MapPin,
  Shield,
  Sun,
  Waves,
  Zap,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import type {
  AnalyseResponse,
} from "@/lib/schemas/analyse";
import { useCheckWizard } from "./context";
import { SavingsCalculator } from "./savings-calculator";

export function Step6Report() {
  const { state, reset, back } = useCheckWizard();
  const a = state.analysis;
  const addr = state.address;

  if (!a || !addr || !a.eligibility || !a.finance) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <p className="text-slate-600">We don&rsquo;t have analysis results yet.</p>
        <button onClick={back} className="mt-6 text-sm text-coral hover:underline">
          Go back and run the analysis
        </button>
      </div>
    );
  }

  const headline = buildHeadline(a);
  const satelliteUrl = `/api/imagery/satellite?${new URLSearchParams({
    lat: String(addr.latitude),
    lng: String(addr.longitude),
    zoom: "20",
    w: "640",
    h: "360",
  }).toString()}`;

  return (
    <div className="max-w-4xl mx-auto w-full">
      {/* Headline */}
      <div className="text-center mb-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Your report
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy leading-tight">
          {headline}
        </h2>
        <p className="mt-4 text-sm text-slate-500 max-w-2xl mx-auto">
          A pre-survey indication based on public data, satellite imagery, and your floorplan — not
          a final quote. An on-site heat-loss survey by an MCS installer will refine the numbers.
        </p>
      </div>

      {/* Property summary */}
      <PropertyCard address={addr.formattedAddress} satelliteUrl={satelliteUrl} epc={a.epc} enrichments={a.enrichments} />

      {/* Heat pump + Solar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <HeatPumpSection a={a} />
        <SolarSection a={a} />
      </div>

      {/* Live savings calculator (Octopus pricing API) */}
      <SavingsCalculator
        analysis={a}
        electricityTariff={state.electricityTariff}
        gasTariff={state.gasTariff}
      />

      {/* Floorplan analysis */}
      <FloorplanSection a={a} />

      {/* Site considerations */}
      <SiteConsiderations a={a} />

      {/* Installer questions */}
      <InstallerQuestions a={a} />

      {/* Next steps + disclaimer */}
      <NextSteps />

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
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          Start another check
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <p className="mt-10 pt-6 border-t border-slate-200 text-xs text-slate-500 leading-relaxed">
        Solar yield via PVGIS v5.3 (EU JRC). Eligibility logic against Ofgem Boiler Upgrade Scheme
        guidance — confirm figures against the current version before applying. Listed building and
        planning-area data from Historic England and planning.data.gov.uk. Flood warnings from the
        Environment Agency. Report generated {new Date().toLocaleDateString("en-GB")}.
      </p>
    </div>
  );
}

// ─── headline ────────────────────────────────────────────────────────────────
function buildHeadline(a: AnalyseResponse): string {
  const hp = a.eligibility.heatPump;
  const solar = a.eligibility.solar;
  const kwp = solar.recommendedKWp;
  const solarPhrase =
    solar.rating === "Excellent" || solar.rating === "Good"
      ? `${kwp ? `a ${kwp} kWp ` : ""}solar array`
      : null;

  if (hp.verdict === "eligible" && solarPhrase) {
    return `Your home looks like a strong candidate for an air source heat pump and ${solarPhrase}.`;
  }
  if (hp.verdict === "eligible") {
    return "Your home looks suitable for a heat pump. Solar is a less obvious win here.";
  }
  if (hp.verdict === "conditional" && solarPhrase) {
    return `Rooftop solar looks great. A heat pump is possible but a couple of things need sorting first.`;
  }
  if (hp.verdict === "conditional") {
    return "A heat pump is possible, but there are a few warnings to address before applying.";
  }
  if (solarPhrase) {
    return `Rooftop solar looks great, but a heat pump isn't a straightforward fit right now.`;
  }
  return "We've flagged the key things an installer would want to know about your property.";
}

// ─── section components ──────────────────────────────────────────────────────
function PropertyCard({
  address,
  satelliteUrl,
  epc,
  enrichments,
}: {
  address: string;
  satelliteUrl: string;
  epc: AnalyseResponse["epc"];
  enrichments: AnalyseResponse["enrichments"];
}) {
  const listedCount = enrichments.listed?.matches.length ?? 0;
  const floodCount = enrichments.flood?.activeWarnings.length ?? 0;
  const conservationCount =
    (enrichments.planning?.conservationAreas.length ?? 0) +
    (enrichments.planning?.aonb.length ?? 0) +
    (enrichments.planning?.nationalParks.length ?? 0);

  return (
    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-5">
        <div className="relative sm:col-span-2 aspect-[16/10] sm:aspect-auto bg-slate-100">
          <Image
            src={satelliteUrl}
            alt="Satellite view"
            fill
            sizes="(max-width: 640px) 100vw, 40vw"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="sm:col-span-3 p-5 sm:p-6">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 mt-0.5 text-coral shrink-0" />
            <p className="text-sm font-medium text-navy">{address}</p>
          </div>

          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            {epc.found && (
              <>
                <div>
                  <dt className="text-slate-500">EPC rating</dt>
                  <dd className="font-medium text-navy">
                    {epc.certificate.currentEnergyBand || "—"}
                    {epc.certificate.potentialEnergyBand
                      ? ` → ${epc.certificate.potentialEnergyBand}`
                      : ""}
                  </dd>
                </div>
                {epc.certificate.propertyType && (
                  <div>
                    <dt className="text-slate-500">Property</dt>
                    <dd className="font-medium text-navy">
                      {epc.certificate.propertyType}
                      {epc.certificate.builtForm ? ` · ${epc.certificate.builtForm}` : ""}
                    </dd>
                  </div>
                )}
                {epc.certificate.constructionAgeBand && (
                  <div>
                    <dt className="text-slate-500">Age band</dt>
                    <dd className="font-medium text-navy">{epc.certificate.constructionAgeBand}</dd>
                  </div>
                )}
                {epc.certificate.totalFloorAreaM2 != null && (
                  <div>
                    <dt className="text-slate-500">Floor area</dt>
                    <dd className="font-medium text-navy">{Math.round(epc.certificate.totalFloorAreaM2)} m²</dd>
                  </div>
                )}
                {epc.certificate.mainFuel && (
                  <div>
                    <dt className="text-slate-500">Main fuel</dt>
                    <dd className="font-medium text-navy">{epc.certificate.mainFuel}</dd>
                  </div>
                )}
              </>
            )}
            {!epc.found && <p className="col-span-2 text-slate-500">{epc.reason}</p>}
          </dl>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {listedCount > 0 && <Badge tone="amber">Listed building</Badge>}
            {conservationCount > 0 && <Badge tone="amber">Conservation / protected area</Badge>}
            {floodCount > 0 && <Badge tone="red">Active flood warning</Badge>}
          </div>
        </div>
      </div>
    </div>
  );
}

function HeatPumpSection({ a }: { a: AnalyseResponse }) {
  const hp = a.eligibility.heatPump;
  const f = a.finance.heatPump;
  const tone: "green" | "amber" | "red" =
    hp.verdict === "eligible" ? "green" : hp.verdict === "conditional" ? "amber" : "red";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-pale text-coral">
          <Flame className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-navy">Heat pump</h3>
        <VerdictBadge tone={tone} label={hp.verdict.toUpperCase()} />
      </div>

      {hp.blockers.length > 0 && <IssueList kind="blocker" items={hp.blockers} />}
      {hp.warnings.length > 0 && <IssueList kind="warning" items={hp.warnings} />}

      <dl className="mt-4 space-y-2 text-sm">
        <Row label="Estimated BUS grant">
          <span className="font-semibold text-navy">£{hp.estimatedGrantGBP.toLocaleString()}</span>
        </Row>
        {hp.recommendedSystemKW != null && (
          <Row label="Planning-estimate system size">
            <span className="font-medium text-navy">{hp.recommendedSystemKW} kW</span>
          </Row>
        )}
        {f.estimatedNetInstallCostRangeGBP && (
          <Row label="Estimated cost after grant">
            <span className="font-medium text-navy">
              £{f.estimatedNetInstallCostRangeGBP[0].toLocaleString()}–£{f.estimatedNetInstallCostRangeGBP[1].toLocaleString()}
            </span>
          </Row>
        )}
      </dl>

      {a.floorplan.analysis && (
        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600 space-y-2">
          <p>
            <strong className="text-navy">Cylinder space:</strong>{" "}
            {a.floorplan.analysis.hotWaterCylinderSpace.likelyPresent
              ? `Likely — ${a.floorplan.analysis.hotWaterCylinderSpace.location ?? "location unclear"}.`
              : "Not obvious from the floorplan — installer will need to find space for a new cylinder."}
          </p>
          {a.floorplan.analysis.heatPumpInstallationConcerns.length > 0 && (
            <ul className="list-disc pl-4 space-y-0.5">
              {a.floorplan.analysis.heatPumpInstallationConcerns.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {hp.notes.length > 0 && (
        <ul className="mt-3 text-xs text-slate-500 space-y-1 list-disc pl-4">
          {hp.notes.map((n, i) => (
            <li key={i}>{n}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

function SolarSection({ a }: { a: AnalyseResponse }) {
  const s = a.eligibility.solar;
  const f = a.finance.solar;
  const tone: "green" | "amber" | "red" =
    s.rating === "Excellent" || s.rating === "Good"
      ? "green"
      : s.rating === "Marginal"
      ? "amber"
      : "red";

  const segments = a.solar.coverage ? a.solar.data.solarPotential.roofSegmentStats ?? [] : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-coral-pale text-coral">
          <Sun className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-navy">Solar PV</h3>
        <VerdictBadge tone={tone} label={s.rating} />
      </div>

      {s.reason && <p className="text-sm text-slate-500 mb-3">{s.reason}</p>}

      <dl className="space-y-2 text-sm">
        {s.recommendedPanels != null && (
          <Row label="Recommended array">
            <span className="font-medium text-navy">
              {s.recommendedPanels} × 400 W · {s.recommendedKWp?.toFixed(1)} kWp
            </span>
          </Row>
        )}
        {s.estimatedAnnualKWh != null && (
          <Row label="Estimated production">
            <span className="font-medium text-navy">{s.estimatedAnnualKWh.toLocaleString()} kWh/year</span>
          </Row>
        )}
        {f.installCostGBP != null && (
          <Row label="Estimated install cost">
            <span className="font-medium text-navy">£{f.installCostGBP.toLocaleString()}</span>
          </Row>
        )}
        {f.annualSavingsRangeGBP && (
          <Row label="Estimated annual savings">
            <span className="font-medium text-navy">
              £{f.annualSavingsRangeGBP[0].toLocaleString()}–£{f.annualSavingsRangeGBP[1].toLocaleString()}
            </span>
          </Row>
        )}
        {f.paybackYearsRange && (
          <Row label="Payback">
            <span className="font-medium text-navy">
              {f.paybackYearsRange[0]}–{f.paybackYearsRange[1]} years
            </span>
          </Row>
        )}
      </dl>

      {segments.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Roof segments
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="text-left font-normal pb-1.5">Azimuth</th>
                  <th className="text-left font-normal pb-1.5">Pitch</th>
                  <th className="text-right font-normal pb-1.5">Area</th>
                </tr>
              </thead>
              <tbody>
                {segments.slice(0, 5).map((seg, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="py-1.5 text-navy">{describeAzimuth(seg.azimuthDegrees)}</td>
                    <td className="py-1.5 text-navy">
                      {seg.pitchDegrees != null ? `${Math.round(seg.pitchDegrees)}°` : "—"}
                    </td>
                    <td className="py-1.5 text-navy text-right">
                      {seg.stats?.areaMeters2 != null ? `${Math.round(seg.stats.areaMeters2)} m²` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Yield source: PVGIS v5.3. 0% VAT on solar until 31 March 2027.
      </p>
    </section>
  );
}

function FloorplanSection({ a }: { a: AnalyseResponse }) {
  const fp = a.floorplan.analysis;
  if (!fp) {
    return (
      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
          <Shield className="w-5 h-5 text-coral" /> Floorplan analysis
        </h3>
        <p className="mt-2 text-sm text-slate-500">
          {a.floorplan.reason ?? "We couldn't read the floorplan — your installer will assess on-site."}
        </p>
      </section>
    );
  }

  const byType = fp.roomsByType;
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-navy flex items-center gap-2">
        <Shield className="w-5 h-5 text-coral" /> Floorplan analysis
        <span className="ml-auto text-xs font-normal text-slate-500">
          Confidence: {fp.confidence}
        </span>
      </h3>

      <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Stat label="Rooms" value={fp.roomCount} />
        <Stat label="Bedrooms" value={byType.bedrooms} />
        <Stat label="Bathrooms" value={byType.bathrooms} />
        <Stat label="Floors" value={fp.floorsVisible} />
        {fp.radiatorsVisible != null && <Stat label="Radiators" value={fp.radiatorsVisible} />}
        {fp.estimatedTotalAreaM2 != null && (
          <Stat label="Estimated area" value={`${Math.round(fp.estimatedTotalAreaM2)} m²`} />
        )}
        {fp.boilerLocation && <Stat label="Boiler" value={fp.boilerLocation} />}
        <Stat label="Wall exposure" value={fp.externalWallExposure} />
      </div>

      {fp.confidenceNotes && (
        <p className="mt-4 text-xs text-slate-500">{fp.confidenceNotes}</p>
      )}
    </section>
  );
}

function SiteConsiderations({ a }: { a: AnalyseResponse }) {
  const { flood, listed, planning } = a.enrichments;
  const items: Array<{ icon: React.ReactNode; label: string; body: string; tone: "neutral" | "amber" | "red" }> = [];

  if (listed && listed.matches.length > 0) {
    const top = listed.matches[0];
    items.push({
      icon: <Landmark className="w-4 h-4" />,
      label: "Listed building",
      body: `${top.name ?? "Listed structure"}${top.grade ? ` (${top.grade})` : ""}${top.distanceMeters != null ? ` · ~${top.distanceMeters} m away` : ""}. External works typically need listed-building consent.`,
      tone: "amber",
    });
  }
  if (planning?.conservationAreas.length) {
    items.push({
      icon: <Landmark className="w-4 h-4" />,
      label: "Conservation area",
      body: `Within ${planning.conservationAreas[0].name ?? "a designated conservation area"} — check local planning guidance for external installations.`,
      tone: "amber",
    });
  }
  if (planning?.aonb.length) {
    items.push({
      icon: <Landmark className="w-4 h-4" />,
      label: "AONB",
      body: `Within an Area of Outstanding Natural Beauty${planning.aonb[0].name ? ` (${planning.aonb[0].name})` : ""}. Visual impact considerations may apply.`,
      tone: "amber",
    });
  }
  if (planning?.nationalParks.length) {
    items.push({
      icon: <Landmark className="w-4 h-4" />,
      label: "National park",
      body: `Within ${planning.nationalParks[0].name ?? "a national park"}. Check park-authority planning rules before external installs.`,
      tone: "amber",
    });
  }
  if (flood && flood.activeWarnings.length > 0) {
    items.push({
      icon: <Waves className="w-4 h-4" />,
      label: "Active flood warning",
      body: `${flood.activeWarnings[0].severity} in effect nearby${flood.activeWarnings[0].areaName ? ` (${flood.activeWarnings[0].areaName})` : ""}.`,
      tone: "red",
    });
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-navy flex items-center gap-2 mb-4">
        <Info className="w-5 h-5 text-coral" /> Site considerations
      </h3>
      <ul className="space-y-3">
        {items.map((i, idx) => (
          <li
            key={idx}
            className={`flex items-start gap-3 rounded-lg p-3 text-sm ${
              i.tone === "red"
                ? "bg-red-50 border border-red-100 text-red-900"
                : "bg-amber-50 border border-amber-100 text-amber-900"
            }`}
          >
            <span className="shrink-0 mt-0.5">{i.icon}</span>
            <span>
              <strong>{i.label}.</strong> {i.body}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function InstallerQuestions({ a }: { a: AnalyseResponse }) {
  const fromFp = a.floorplan.analysis?.recommendedInstallerQuestions ?? [];
  const fromHp = a.eligibility.heatPump.warnings;
  const all = [...fromFp, ...fromHp].slice(0, 8);
  if (all.length === 0) return null;

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-navy flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-coral" /> Ask the installer
      </h3>
      <ul className="space-y-2 text-sm text-slate-700 list-disc pl-5">
        {all.map((q, i) => (
          <li key={i}>{q}</li>
        ))}
      </ul>
    </section>
  );
}

function NextSteps() {
  return (
    <section className="mt-8 rounded-2xl bg-navy text-white p-6 sm:p-8">
      <h3 className="text-lg font-semibold">What&rsquo;s next?</h3>
      <p className="mt-2 text-sm text-slate-300">
        Get in touch with an MCS-certified installer to turn this indication into a real quote.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <a
          href="https://www.mcscertified.com/find-an-installer/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 h-11 px-5 rounded-lg bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
        >
          Find an MCS installer
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </section>
  );
}

// ─── little bits ─────────────────────────────────────────────────────────────
function Badge({ tone, children }: { tone: "amber" | "red"; children: React.ReactNode }) {
  const cls =
    tone === "red"
      ? "bg-red-100 text-red-700 border border-red-200"
      : "bg-amber-100 text-amber-800 border border-amber-200";
  return <span className={`inline-flex items-center text-xs font-medium rounded-full px-2 py-0.5 ${cls}`}>{children}</span>;
}

function VerdictBadge({ tone, label }: { tone: "green" | "amber" | "red"; label: string }) {
  const cls =
    tone === "green"
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : tone === "amber"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-700 border-red-200";
  return (
    <span className={`ml-auto inline-flex items-center text-[11px] font-semibold uppercase tracking-wider rounded-full px-2 py-0.5 border ${cls}`}>
      {label}
    </span>
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

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-2">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-navy">{String(value)}</div>
    </div>
  );
}

function IssueList({ kind, items }: { kind: "blocker" | "warning"; items: string[] }) {
  const Icon = kind === "blocker" ? AlertTriangle : CheckCircle2;
  const cls =
    kind === "blocker"
      ? "bg-red-50 border-red-100 text-red-900"
      : "bg-amber-50 border-amber-100 text-amber-900";
  return (
    <ul className={`mt-3 rounded-lg border ${cls} p-3 space-y-1.5 text-sm`}>
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icon className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function describeAzimuth(az: number | undefined): string {
  if (az == null) return "—";
  const a = ((az % 360) + 360) % 360;
  const names = [
    [22.5, "N"],
    [67.5, "NE"],
    [112.5, "E"],
    [157.5, "SE"],
    [202.5, "S"],
    [247.5, "SW"],
    [292.5, "W"],
    [337.5, "NW"],
  ] as const;
  for (const [threshold, name] of names) if (a < threshold) return `${name} (${Math.round(a)}°)`;
  return `N (${Math.round(a)}°)`;
}
