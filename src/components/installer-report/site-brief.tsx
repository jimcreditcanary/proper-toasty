// Installer site-visit brief.
//
// Replaces the homeowner-flavoured ReportShell for the installer
// audience. Where the homeowner view leans on tabs + savings stories
// + booking CTAs, this is a dense single-page briefing aimed at a
// technical reader (the engineer arriving at the property).
//
// Sections (top → bottom, no tabs):
//   1. Header — customer, address, contact, status
//   2. At a glance — five quick-stat tiles
//   3. Property — type, age, floor area, fabric (EPC), per-room table
//   4. Heat pump scope — verdict, outdoor space, locations, concerns
//   5. Solar + battery — roof segments, recommended kWp, yield
//   6. Site context — flood / listed / planning constraints
//   7. Energy + tariffs — current suppliers + rates
//   8. Floorplan + map links — printable assets
//
// Server component — all data is passed in as props from the route
// so we don't pay any client JS for the dense content.

import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownCircle,
  Battery,
  CheckCircle2,
  Compass,
  ExternalLink,
  Flame,
  Home,
  Info,
  Mail,
  MapPin,
  Phone,
  Sun,
  Thermometer,
  XCircle,
  Zap,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FuelTariff } from "@/lib/schemas/bill";
import type { AddressMetadata } from "@/lib/schemas/address-lookup";
import { epcCertificateUrl } from "@/lib/schemas/epc";
import { PrintButton } from "./print-button";

// ─── Types the route hands us ───────────────────────────────────────

export interface InstallerSiteBriefProps {
  /** From installer_leads — the contact details the homeowner provided. */
  contact: {
    name: string | null;
    email: string | null;
    phone: string | null;
  };
  /** Property identification. UPRN is the key for matching to EPC + admin records. */
  property: {
    address: string | null;
    postcode: string | null;
    uprn: string | null;
    latitude: number | null;
    longitude: number | null;
    /** OS Places rich-fields blob. Optional — legacy leads predate
     *  migration 057. */
    metadata?: AddressMetadata | null;
  };
  /** Lead status + key milestones. */
  lead: {
    status: string;
    acceptedAt: string | null;
    visitBookedFor: string | null;
    wantsHeatPump: boolean;
    wantsSolar: boolean;
    wantsBattery: boolean;
  };
  /** Full analysis snapshot — the same blob the homeowner saw. */
  analysis: AnalyseResponse;
  /** User-edited floorplan with extracted metrics + AI placements. */
  floorplan: FloorplanAnalysis | null;
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
  /** Object key from the matching check row, when we can link. Lets us
   *  serve the floorplan image via /api/floorplan/image. */
  floorplanObjectKey: string | null;
}

// ─── Component ──────────────────────────────────────────────────────

export function InstallerSiteBrief(props: InstallerSiteBriefProps) {
  const { contact, property, lead, analysis, floorplan, electricityTariff, gasTariff } = props;

  return (
    <div className="space-y-6 print:space-y-3">
      <HeaderCard contact={contact} property={property} lead={lead} />
      <AtAGlance analysis={analysis} floorplan={floorplan} />
      <PropertyCard
        analysis={analysis}
        floorplan={floorplan}
        floorplanObjectKey={props.floorplanObjectKey}
      />
      <HeatPumpCard analysis={analysis} floorplan={floorplan} />
      <SolarCard analysis={analysis} property={property} />
      <SiteContextCard analysis={analysis} />
      <TariffCard electricityTariff={electricityTariff} gasTariff={gasTariff} />
      <AssetsFooter
        property={property}
        floorplanObjectKey={props.floorplanObjectKey}
      />
    </div>
  );
}

// ─── Header ─────────────────────────────────────────────────────────

function HeaderCard({
  contact,
  property,
  lead,
}: Pick<InstallerSiteBriefProps, "contact" | "property" | "lead">) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:border-0 print:p-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
            Site visit brief
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
            {property.address ?? property.postcode ?? "Unknown address"}
          </h1>
          {property.uprn && (
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              UPRN {property.uprn}
              {property.metadata?.parentUprn && (
                <span className="ml-2">
                  · parent UPRN {property.metadata.parentUprn}
                </span>
              )}
            </p>
          )}
          {property.metadata?.classificationDescription && (
            <p className="text-xs text-slate-500 mt-0.5">
              <span className="font-mono uppercase tracking-wide">
                {property.metadata.classificationCode ?? "—"}
              </span>{" "}
              {property.metadata.classificationDescription}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={lead.status} />
          {/* Print is the most-used action for installers reviewing
              en-route. Native browser print covers it. */}
          <PrintButton />
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <ContactRow
          icon={<Home className="w-4 h-4 text-slate-400" />}
          label="Customer"
          value={contact.name ?? "—"}
        />
        {contact.phone ? (
          <ContactRow
            icon={<Phone className="w-4 h-4 text-slate-400" />}
            label="Phone"
            value={
              <a
                href={`tel:${contact.phone}`}
                className="text-navy hover:text-coral font-mono"
              >
                {contact.phone}
              </a>
            }
          />
        ) : (
          <ContactRow
            icon={<Phone className="w-4 h-4 text-slate-400" />}
            label="Phone"
            value="—"
          />
        )}
        {contact.email ? (
          <ContactRow
            icon={<Mail className="w-4 h-4 text-slate-400" />}
            label="Email"
            value={
              <a
                href={`mailto:${contact.email}`}
                className="text-navy hover:text-coral truncate"
              >
                {contact.email}
              </a>
            }
          />
        ) : (
          <ContactRow
            icon={<Mail className="w-4 h-4 text-slate-400" />}
            label="Email"
            value="—"
          />
        )}
      </div>

      {lead.visitBookedFor && (
        <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Visit booked: {formatDateTime(lead.visitBookedFor)}
        </div>
      )}
    </section>
  );
}

function ContactRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <p className="text-sm text-navy truncate">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; label: string }> = {
    new: { cls: "bg-slate-100 text-slate-700", label: "New" },
    sent_to_installer: { cls: "bg-amber-100 text-amber-800", label: "Sent" },
    installer_acknowledged: {
      cls: "bg-sky-100 text-sky-800",
      label: "Accepted",
    },
    visit_booked: { cls: "bg-emerald-100 text-emerald-800", label: "Visit booked" },
    visit_completed: {
      cls: "bg-emerald-200 text-emerald-900",
      label: "Visit completed",
    },
    closed_won: { cls: "bg-coral text-white", label: "Won" },
    closed_lost: { cls: "bg-rose-100 text-rose-800", label: "Lost" },
    cancelled: { cls: "bg-slate-100 text-slate-500", label: "Cancelled" },
  };
  const cfg = map[status] ?? { cls: "bg-slate-100 text-slate-700", label: status };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.cls}`}
    >
      {cfg.label}
    </span>
  );
}

// ─── At a glance ─────────────────────────────────────────────────────

function AtAGlance({
  analysis,
  floorplan,
}: {
  analysis: AnalyseResponse;
  floorplan: FloorplanAnalysis | null;
}) {
  const epc = analysis.epc.found ? analysis.epc.certificate : null;
  const totalAreaM2 =
    floorplan?.metrics?.totalAreaM2 ??
    epc?.totalFloorAreaM2 ??
    null;
  const totalAreaSqFt =
    floorplan?.metrics?.totalAreaSqFt ??
    (totalAreaM2 ? Math.round(totalAreaM2 * 10.7639) : null);
  const roomCount = floorplan?.metrics?.rooms.length ?? null;
  const floorsCount = floorplan?.metrics?.floorsCount ?? null;
  const habitableRooms = epc?.numberHabitableRooms ?? null;
  const hpVerdict = analysis.eligibility.heatPump.verdict;
  const solarRating = analysis.eligibility.solar.rating;
  const recommendedKWp = analysis.eligibility.solar.recommendedKWp;
  const annualKwh = analysis.eligibility.solar.estimatedAnnualKWh;

  return (
    <section>
      <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        At a glance
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Tile
          icon={<Zap className="w-4 h-4" />}
          label="EPC"
          primary={
            epc
              ? `${epc.currentEnergyBand ?? "—"} → ${epc.potentialEnergyBand ?? "—"}`
              : "—"
          }
          secondary={
            epc?.currentEnergyRating != null
              ? `Score ${epc.currentEnergyRating} / 100`
              : "Not on register"
          }
        />
        <Tile
          icon={<Home className="w-4 h-4" />}
          label="Floor area"
          primary={
            totalAreaM2
              ? `${totalAreaM2.toFixed(1)} m²`
              : "—"
          }
          secondary={totalAreaSqFt ? `${totalAreaSqFt.toLocaleString("en-GB")} sq ft` : "—"}
        />
        <Tile
          icon={<Compass className="w-4 h-4" />}
          label="Rooms / floors"
          primary={
            roomCount != null
              ? `${roomCount} rooms`
              : habitableRooms != null
                ? `${habitableRooms} habitable`
                : "—"
          }
          secondary={
            floorsCount != null
              ? `${floorsCount} floor${floorsCount === 1 ? "" : "s"}`
              : epc?.builtForm
                ? epc.builtForm
                : "—"
          }
        />
        <Tile
          icon={<Flame className="w-4 h-4" />}
          label="Heat pump"
          primary={hpVerdictLabel(hpVerdict)}
          secondary={
            analysis.eligibility.heatPump.estimatedGrantGBP > 0
              ? `BUS £${analysis.eligibility.heatPump.estimatedGrantGBP.toLocaleString("en-GB")}`
              : "No grant"
          }
          accent={hpVerdict === "eligible" ? "emerald" : hpVerdict === "blocked" ? "rose" : "amber"}
        />
        <Tile
          icon={<Sun className="w-4 h-4" />}
          label="Solar"
          primary={
            recommendedKWp != null
              ? `${recommendedKWp.toFixed(1)} kWp`
              : solarRating
          }
          secondary={
            annualKwh != null
              ? `~${Math.round(annualKwh).toLocaleString("en-GB")} kWh/yr`
              : `Rating: ${solarRating}`
          }
          accent={
            solarRating === "Excellent" || solarRating === "Good"
              ? "emerald"
              : solarRating === "Marginal"
                ? "amber"
                : "rose"
          }
        />
      </div>
    </section>
  );
}

function hpVerdictLabel(v: "eligible" | "conditional" | "blocked"): string {
  if (v === "eligible") return "Eligible";
  if (v === "conditional") return "Conditional";
  return "Blocked";
}

function Tile({
  icon,
  label,
  primary,
  secondary,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  primary: string;
  secondary: string;
  accent?: "emerald" | "amber" | "rose";
}) {
  const ringCls =
    accent === "emerald"
      ? "ring-1 ring-emerald-200"
      : accent === "amber"
        ? "ring-1 ring-amber-200"
        : accent === "rose"
          ? "ring-1 ring-rose-200"
          : "";
  const iconCls =
    accent === "emerald"
      ? "bg-emerald-50 text-emerald-700"
      : accent === "amber"
        ? "bg-amber-50 text-amber-700"
        : accent === "rose"
          ? "bg-rose-50 text-rose-700"
          : "bg-slate-100 text-slate-500";
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${ringCls}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${iconCls}`}>
          {icon}
        </span>
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="text-base font-bold text-navy leading-tight">{primary}</p>
      <p className="text-[11px] text-slate-500 mt-1 leading-snug">{secondary}</p>
    </div>
  );
}

// ─── Property card ──────────────────────────────────────────────────

function PropertyCard({
  analysis,
  floorplan,
  floorplanObjectKey,
}: {
  analysis: AnalyseResponse;
  floorplan: FloorplanAnalysis | null;
  floorplanObjectKey: string | null;
}) {
  const epc = analysis.epc.found ? analysis.epc.certificate : null;
  const rooms = floorplan?.metrics?.rooms ?? [];
  const totalAreaM2 = floorplan?.metrics?.totalAreaM2 ?? epc?.totalFloorAreaM2 ?? null;
  const totalAreaSqFt =
    floorplan?.metrics?.totalAreaSqFt ??
    (totalAreaM2 ? Math.round(totalAreaM2 * 10.7639) : null);
  const floorsCount = floorplan?.metrics?.floorsCount ?? null;

  return (
    <Section title="Property" icon={<Home className="w-4 h-4 text-coral-dark" />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Classification + EPC fabric */}
        <div className="space-y-4">
          <Subhead>Classification</Subhead>
          <Dl>
            <Dt>Property type</Dt>
            <Dd>{epc?.propertyType ?? "—"}</Dd>
            <Dt>Built form</Dt>
            <Dd>{epc?.builtForm ?? "—"}</Dd>
            <Dt>Age band</Dt>
            <Dd>{epc?.constructionAgeBand ?? "—"}</Dd>
            <Dt>Tenure</Dt>
            <Dd>{epc?.tenure ?? "—"}</Dd>
            <Dt>Total floor area</Dt>
            <Dd>
              {totalAreaM2 ? `${totalAreaM2.toFixed(1)} m²` : "—"}
              {totalAreaSqFt && (
                <span className="text-slate-400 ml-1.5">
                  ({totalAreaSqFt.toLocaleString("en-GB")} sq ft)
                </span>
              )}
            </Dd>
            <Dt>Floors</Dt>
            <Dd>{floorsCount ?? "—"}</Dd>
            <Dt>Habitable rooms</Dt>
            <Dd>{epc?.numberHabitableRooms ?? "—"}</Dd>
            <Dt>Heated rooms</Dt>
            <Dd>{epc?.numberHeatedRooms ?? "—"}</Dd>
            <Dt>Floor height</Dt>
            <Dd>{epc?.floorHeightM != null ? `${epc.floorHeightM} m` : "—"}</Dd>
            <Dt>Extensions</Dt>
            <Dd>{epc?.extensionCount ?? "—"}</Dd>
          </Dl>
        </div>

        <div className="space-y-4">
          {/* EPC heading row — assessor + valid-till + link to GOV.UK
              certificate page. Lets the installer verify everything
              against the original document in one click. */}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Subhead>EPC fabric{epc?.registrationDate ? ` (assessed ${formatDate(epc.registrationDate)})` : ""}</Subhead>
            {epc?.certificateNumber && (
              <a
                href={epcCertificateUrl(epc.certificateNumber)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-coral hover:text-coral-dark inline-flex items-center gap-1 print:hidden"
              >
                View on GOV.UK ↗
              </a>
            )}
          </div>
          {(epc?.assessorName || epc?.assessorCompany || epc?.validUntil) && (
            <div className="text-xs text-slate-600 -mt-2">
              {epc?.assessorName && <span>Assessor: <span className="font-semibold text-navy">{epc.assessorName}</span></span>}
              {epc?.assessorCompany && <span> · {epc.assessorCompany}</span>}
              {epc?.validUntil && (
                <span>
                  {epc?.assessorName || epc?.assessorCompany ? " · " : ""}
                  Valid till{" "}
                  <span className={epc.expired ? "font-semibold text-red-700" : "font-semibold text-navy"}>
                    {formatDate(epc.validUntil)}
                    {epc.expired && " (expired)"}
                  </span>
                </span>
              )}
            </div>
          )}
          <Dl>
            <Dt>Walls</Dt>
            <Dd>
              <FabricCell
                description={epc?.wallsDescription}
                rating={epc?.wallsEnergyEff}
              />
            </Dd>
            <Dt>Roof</Dt>
            <Dd>
              <FabricCell
                description={epc?.roofDescription}
                rating={epc?.roofEnergyEff}
              />
            </Dd>
            <Dt>Floor</Dt>
            <Dd>
              <FabricCell
                description={epc?.floorDescription}
                rating={epc?.floorEnergyEff}
              />
            </Dd>
            <Dt>Windows</Dt>
            <Dd>
              <FabricCell
                description={epc?.windowsDescription}
                rating={epc?.windowsEnergyEff}
              />
            </Dd>
            <Dt>Glazing</Dt>
            <Dd>
              {epc?.glazedType ?? "—"}
              {epc?.multiGlazeProportion != null &&
                ` (${epc.multiGlazeProportion}% multi-glazed)`}
            </Dd>
          </Dl>
        </div>
      </div>

      {/* Per-room breakdown — only renders when extraction found rooms. */}
      {rooms.length > 0 && (
        <div className="mt-6 pt-5 border-t border-slate-100">
          <Subhead>Per-room breakdown (from floorplan labels)</Subhead>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="text-left px-3 py-2">Room</th>
                  <th className="text-left px-3 py-2">Floor</th>
                  <th className="text-right px-3 py-2">m²</th>
                  <th className="text-right px-3 py-2">sq ft</th>
                  <th className="text-left px-3 py-2 hidden sm:table-cell">
                    Label
                  </th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((r, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-medium text-navy">
                      {r.name}
                    </td>
                    <td className="px-3 py-2 text-slate-600 capitalize">
                      {r.floor ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.sizeM2 != null ? r.sizeM2.toFixed(1) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {r.sizeSqFt != null
                        ? r.sizeSqFt.toLocaleString("en-GB")
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-slate-500 hidden sm:table-cell font-mono">
                      {r.dimensionsRaw ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {floorplan?.metrics?.confidence && (
            <p className="text-[11px] text-slate-400 mt-2">
              Extraction confidence:{" "}
              <span className="font-semibold capitalize">
                {floorplan.metrics.confidence}
              </span>
              {floorplanObjectKey && (
                <>
                  {" · "}
                  <a
                    href={`/api/floorplan/image?key=${encodeURIComponent(floorplanObjectKey)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-coral hover:underline"
                  >
                    Open uploaded floorplan ↗
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      )}
    </Section>
  );
}

function FabricCell({
  description,
  rating,
}: {
  description: string | null | undefined;
  rating: string | null | undefined;
}) {
  if (!description) return <>—</>;
  return (
    <span>
      {description}
      {rating && (
        <span className="text-[10px] uppercase tracking-wider text-slate-400 ml-1.5">
          ({rating})
        </span>
      )}
    </span>
  );
}

// ─── Heat pump card ─────────────────────────────────────────────────

function HeatPumpCard({
  analysis,
  floorplan,
}: {
  analysis: AnalyseResponse;
  floorplan: FloorplanAnalysis | null;
}) {
  const hp = analysis.eligibility.heatPump;
  const epc = analysis.epc.found ? analysis.epc.certificate : null;
  const heatPumpLocations = floorplan?.heatPumpLocations ?? [];
  const cylinderLocations = floorplan?.hotWaterCylinderCandidates ?? [];
  const concerns = floorplan?.heatPumpInstallationConcerns ?? [];
  const clarifications = floorplan?.clarificationQuestions ?? [];
  const installerQuestions = floorplan?.recommendedInstallerQuestions ?? [];
  const externalWallExposure = floorplan?.externalWallExposure ?? "unknown";
  const radiatorsVisible = floorplan?.radiators?.length ?? floorplan?.radiatorsVisible ?? null;

  return (
    <Section
      title="Heat pump scope"
      icon={<Flame className="w-4 h-4 text-coral-dark" />}
    >
      {/* Verdict + grant strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <VerdictTile
          label="Eligibility"
          value={hpVerdictLabel(hp.verdict)}
          accent={
            hp.verdict === "eligible"
              ? "emerald"
              : hp.verdict === "blocked"
                ? "rose"
                : "amber"
          }
        />
        <VerdictTile
          label="BUS grant"
          value={
            hp.estimatedGrantGBP > 0
              ? `£${hp.estimatedGrantGBP.toLocaleString("en-GB")}`
              : "Not eligible"
          }
        />
        <VerdictTile
          label="Recommended size"
          value={
            hp.recommendedSystemKW != null
              ? `${hp.recommendedSystemKW.toFixed(1)} kW`
              : "—"
          }
          sub={
            hp.heatLossPlanningEstimateW != null
              ? `Heat loss ~${(hp.heatLossPlanningEstimateW / 1000).toFixed(1)} kW`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Existing setup */}
        <div className="space-y-4">
          <Subhead>Existing heating</Subhead>
          <Dl>
            <Dt>Main fuel</Dt>
            <Dd>{epc?.mainFuel ?? "—"}</Dd>
            <Dt>Heating system</Dt>
            <Dd>{epc?.mainHeatingDescription ?? "—"}</Dd>
            <Dt>Heating efficiency</Dt>
            <Dd>{epc?.mainHeatingEnergyEff ?? "—"}</Dd>
            <Dt>Controls</Dt>
            <Dd>{epc?.mainHeatingControlsDescription ?? "—"}</Dd>
            <Dt>Hot water</Dt>
            <Dd>{epc?.hotWaterDescription ?? "—"}</Dd>
            <Dt>Mains gas</Dt>
            <Dd>{epc?.mainsGasFlag ?? "—"}</Dd>
            <Dt>External wall exposure</Dt>
            <Dd className="capitalize">{externalWallExposure}</Dd>
            <Dt>Radiators (visible)</Dt>
            <Dd>{radiatorsVisible ?? "—"}</Dd>
          </Dl>
        </div>

        {/* Outdoor space + AI placements */}
        <div className="space-y-4">
          <Subhead>Outdoor space + locations</Subhead>
          <Dl>
            <Dt>Satellite verdict</Dt>
            <Dd>
              <SatelliteVerdict
                verdict={floorplan?.outdoorSpace.satelliteVerdict ?? null}
              />
            </Dd>
            <Dt>User confirmed</Dt>
            <Dd>
              {floorplan?.outdoorSpace.userConfirmed === "yes"
                ? "Yes"
                : floorplan?.outdoorSpace.userConfirmed === "no"
                  ? "No"
                  : "—"}
            </Dd>
            <Dt>HP candidates</Dt>
            <Dd>
              {heatPumpLocations.length > 0 ? (
                <ul className="space-y-1 mt-1">
                  {heatPumpLocations.map((loc) => (
                    <li key={loc.id} className="text-xs">
                      <span className="font-semibold text-navy">
                        {loc.label}
                      </span>
                      {loc.notes && (
                        <span className="text-slate-500"> · {loc.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Dd>
            <Dt>HWC candidates</Dt>
            <Dd>
              {cylinderLocations.length > 0 ? (
                <ul className="space-y-1 mt-1">
                  {cylinderLocations.map((loc) => (
                    <li key={loc.id} className="text-xs">
                      <span className="font-semibold text-navy">
                        {loc.label}
                      </span>
                      {loc.notes && (
                        <span className="text-slate-500"> · {loc.notes}</span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                "—"
              )}
            </Dd>
          </Dl>
        </div>
      </div>

      {/* Blockers + warnings + concerns */}
      {(hp.blockers.length > 0 ||
        hp.warnings.length > 0 ||
        hp.notes.length > 0 ||
        concerns.length > 0) && (
        <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
          {hp.blockers.length > 0 && (
            <NoteList
              title="Blockers"
              items={hp.blockers}
              variant="rose"
              icon={<XCircle className="w-3.5 h-3.5" />}
            />
          )}
          {hp.warnings.length > 0 && (
            <NoteList
              title="Warnings"
              items={hp.warnings}
              variant="amber"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            />
          )}
          {concerns.length > 0 && (
            <NoteList
              title="Install concerns (from floorplan)"
              items={concerns}
              variant="amber"
              icon={<AlertTriangle className="w-3.5 h-3.5" />}
            />
          )}
          {hp.notes.length > 0 && (
            <NoteList
              title="Notes"
              items={hp.notes}
              variant="slate"
              icon={<Info className="w-3.5 h-3.5" />}
            />
          )}
        </div>
      )}

      {/* Site-visit checklist — clarifications the AI suggested + any
          questions the wizard captured for the installer. Combined so
          the engineer has one list to walk through on the day. */}
      {(clarifications.length > 0 || installerQuestions.length > 0) && (
        <div className="mt-5 pt-4 border-t border-slate-100">
          <Subhead>Site-visit checklist</Subhead>
          <ul className="mt-2 space-y-2 text-sm">
            {clarifications.map((q) => (
              <li key={q.id} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-coral">•</span>
                <div>
                  <p className="text-navy font-medium">{q.question}</p>
                  {q.context && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      {q.context}
                    </p>
                  )}
                  {q.answer && (
                    <p className="text-xs text-emerald-700 mt-0.5">
                      Customer answered: {q.answer}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {installerQuestions.map((q, i) => (
              <li key={`iq-${i}`} className="flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-coral">•</span>
                <p className="text-navy">{q}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Section>
  );
}

function SatelliteVerdict({ verdict }: { verdict: "yes" | "no" | "unsure" | null }) {
  if (verdict === "yes") {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Yes (outdoor space visible)
      </span>
    );
  }
  if (verdict === "no") {
    return (
      <span className="inline-flex items-center gap-1 text-rose-700">
        <XCircle className="w-3.5 h-3.5" />
        No outdoor space visible
      </span>
    );
  }
  if (verdict === "unsure") {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700">
        <AlertTriangle className="w-3.5 h-3.5" />
        Unclear from satellite
      </span>
    );
  }
  return <>—</>;
}

function VerdictTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "emerald" | "amber" | "rose";
}) {
  const cls =
    accent === "emerald"
      ? "border-emerald-200 bg-emerald-50/60"
      : accent === "amber"
        ? "border-amber-200 bg-amber-50/60"
        : accent === "rose"
          ? "border-rose-200 bg-rose-50/60"
          : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-3 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="text-base font-bold text-navy mt-1">{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function NoteList({
  title,
  items,
  variant,
  icon,
}: {
  title: string;
  items: string[];
  variant: "rose" | "amber" | "slate";
  icon: React.ReactNode;
}) {
  const cls =
    variant === "rose"
      ? "bg-rose-50 border-rose-200 text-rose-900"
      : variant === "amber"
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-slate-50 border-slate-200 text-slate-700";
  return (
    <div className={`rounded-lg border p-3 ${cls}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider mb-2 inline-flex items-center gap-1.5">
        {icon}
        {title}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((s, i) => (
          <li key={i} className="leading-relaxed">
            • {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Solar card ─────────────────────────────────────────────────────

function SolarCard({
  analysis,
  property,
}: {
  analysis: AnalyseResponse;
  property: InstallerSiteBriefProps["property"];
}) {
  const sol = analysis.eligibility.solar;
  const fin = analysis.finance.solar;
  const segments = analysis.solar.coverage
    ? analysis.solar.data.solarPotential.roofSegmentStats ?? []
    : [];

  const satelliteUrl =
    property.latitude != null && property.longitude != null
      ? `/api/imagery/satellite?${new URLSearchParams({
          lat: String(property.latitude),
          lng: String(property.longitude),
          zoom: "20",
          w: "640",
          h: "360",
        }).toString()}`
      : null;

  return (
    <Section title="Solar + battery" icon={<Sun className="w-4 h-4 text-coral-dark" />}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <VerdictTile
          label="Rating"
          value={sol.rating}
          accent={
            sol.rating === "Excellent" || sol.rating === "Good"
              ? "emerald"
              : sol.rating === "Marginal"
                ? "amber"
                : "rose"
          }
        />
        <VerdictTile
          label="Recommended"
          value={
            sol.recommendedKWp != null
              ? `${sol.recommendedKWp.toFixed(1)} kWp`
              : "—"
          }
          sub={
            sol.recommendedPanels != null
              ? `${sol.recommendedPanels} panels`
              : undefined
          }
        />
        <VerdictTile
          label="Annual yield"
          value={
            sol.estimatedAnnualKWh != null
              ? `${Math.round(sol.estimatedAnnualKWh).toLocaleString("en-GB")} kWh`
              : "—"
          }
          sub={
            fin.installCostGBP != null
              ? `Est. install £${fin.installCostGBP.toLocaleString("en-GB")}`
              : undefined
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div>
          <Subhead>Roof segments</Subhead>
          {segments.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">
              No segments returned from Google Solar — the address may
              not have building-insight coverage.
            </p>
          ) : (
            <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="text-left px-3 py-2">#</th>
                    <th className="text-right px-3 py-2">m²</th>
                    <th className="text-right px-3 py-2">Pitch</th>
                    <th className="text-right px-3 py-2">Aspect</th>
                    <th className="text-right px-3 py-2">Sun (kWh/m²)</th>
                  </tr>
                </thead>
                <tbody>
                  {segments.map((s, i) => (
                    <tr key={i} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-slate-700">
                        {i + 1}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.stats?.areaMeters2?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.pitchDegrees != null
                          ? `${Math.round(s.pitchDegrees)}°`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.azimuthDegrees != null
                          ? azimuthToCompass(s.azimuthDegrees)
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {s.stats?.sunshineQuantiles &&
                        s.stats.sunshineQuantiles.length > 5
                          ? Math.round(s.stats.sunshineQuantiles[5] / 1000)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Battery */}
          <div className="mt-5">
            <Subhead>Battery sizing</Subhead>
            <p className="text-sm text-slate-700 mt-1">
              <Battery className="inline w-4 h-4 text-slate-400 mr-1 align-[-3px]" />
              5 kWh recommended for a typical UK home. Sizes up to{" "}
              {sol.recommendedKWp != null
                ? `${(sol.recommendedKWp * 1.2).toFixed(1)} kWh`
                : "10 kWh"}{" "}
              if the homeowner wants to maximise self-consumption.
            </p>
          </div>
        </div>

        {/* Satellite preview */}
        <div>
          <Subhead>Satellite</Subhead>
          {satelliteUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={satelliteUrl}
              alt="Satellite view of the roof"
              className="mt-2 w-full rounded-lg border border-slate-200"
              loading="lazy"
            />
          ) : (
            <p className="text-sm text-slate-500 mt-2">
              No coords on the lead — open in Maps via the link below.
            </p>
          )}
          {sol.reason && (
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {sol.reason}
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}

function azimuthToCompass(deg: number): string {
  // 8-point compass — finer than N/E/S/W, coarser than 16-point.
  // 0=N, 90=E, 180=S, 270=W. Wrap then bucket.
  const norm = ((deg % 360) + 360) % 360;
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(norm / 45) % 8;
  return `${dirs[idx]} ${Math.round(norm)}°`;
}

// ─── Site context ───────────────────────────────────────────────────

function SiteContextCard({ analysis }: { analysis: AnalyseResponse }) {
  const flood = analysis.enrichments.flood;
  const listed = analysis.enrichments.listed;
  const planning = analysis.enrichments.planning;

  // Skip the section entirely if we have no enrichment data — saves
  // the installer a "———" panel for properties outside England/Wales.
  if (!flood && !listed && !planning) return null;

  return (
    <Section
      title="Site context"
      icon={<MapPin className="w-4 h-4 text-coral-dark" />}
    >
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
        {flood && (
          <div>
            <Subhead>Flood risk</Subhead>
            <FloodSummary flood={flood} />
          </div>
        )}
        {listed && (
          <div>
            <Subhead>Listed building</Subhead>
            <ListedSummary listed={listed} />
          </div>
        )}
        {planning && (
          <div>
            <Subhead>Planning</Subhead>
            <PlanningSummary planning={planning} />
          </div>
        )}
      </div>
    </Section>
  );
}

function FloodSummary({ flood }: { flood: NonNullable<AnalyseResponse["enrichments"]["flood"]> }) {
  const warnings = flood.activeWarnings ?? [];
  const top = warnings[0] ?? null;
  return (
    <div className="mt-2">
      <p className="font-medium text-navy">
        {top ? top.severity : "No active warnings"}
      </p>
      {top?.description && (
        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
          {top.description}
        </p>
      )}
      {!top && (
        <p className="text-xs text-slate-500 mt-1">
          Cross-check on{" "}
          <a
            href="https://check-for-flooding.service.gov.uk/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-coral hover:underline"
          >
            gov.uk flood map
          </a>{" "}
          for the long-term flood-zone classification.
        </p>
      )}
    </div>
  );
}

function ListedSummary({ listed }: { listed: NonNullable<AnalyseResponse["enrichments"]["listed"]> }) {
  const matches = listed.matches ?? [];
  const isListed = matches.length > 0;
  return (
    <div className="mt-2">
      <p className="font-medium text-navy">{isListed ? "Listed" : "Not listed"}</p>
      {isListed && (
        <ul className="text-xs text-slate-500 mt-1 space-y-1">
          {matches.slice(0, 2).map((e, i) => (
            <li key={i}>
              {e.grade ?? "—"} · {e.name ?? "Unnamed entry"}
              {e.distanceMeters != null && (
                <span className="text-slate-400">
                  {" "}({Math.round(e.distanceMeters)} m away)
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PlanningSummary({ planning }: { planning: NonNullable<AnalyseResponse["enrichments"]["planning"]> }) {
  const conservation = planning.conservationAreas ?? [];
  const aonb = planning.aonb ?? [];
  const parks = planning.nationalParks ?? [];
  const inConservation = conservation.length > 0;
  const inAonb = aonb.length > 0;
  const inPark = parks.length > 0;
  const flagged = inConservation || inAonb || inPark;

  return (
    <div className="mt-2">
      <p className="font-medium text-navy">
        {inConservation
          ? `In conservation area${conservation[0]?.name ? ` (${conservation[0].name})` : ""}`
          : "Not in conservation area"}
      </p>
      <ul className="text-xs text-slate-500 mt-1 space-y-1">
        {inPark && (
          <li>
            · National park{parks[0]?.name ? `: ${parks[0].name}` : ""}
          </li>
        )}
        {inAonb && (
          <li>
            · AONB{aonb[0]?.name ? `: ${aonb[0].name}` : ""}
          </li>
        )}
        {!flagged && <li>· No special planning constraints flagged</li>}
      </ul>
    </div>
  );
}

// ─── Tariff card ─────────────────────────────────────────────────────

function TariffCard({
  electricityTariff,
  gasTariff,
}: {
  electricityTariff: FuelTariff | null;
  gasTariff: FuelTariff | null;
}) {
  if (!electricityTariff && !gasTariff) return null;
  return (
    <Section
      title="Energy + tariffs"
      icon={<Thermometer className="w-4 h-4 text-coral-dark" />}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {electricityTariff && (
          <TariffPanel label="Electricity" tariff={electricityTariff} />
        )}
        {gasTariff && <TariffPanel label="Gas" tariff={gasTariff} />}
      </div>
    </Section>
  );
}

function TariffPanel({ label, tariff }: { label: string; tariff: FuelTariff }) {
  // Tariff schema is a discriminated union — we try to surface the
  // headline values (supplier, unit rate, standing charge) regardless
  // of which variant we got. Anything else becomes a tiny key/value list
  // so we don't drop information.
  const t = tariff as unknown as Record<string, unknown>;
  const supplier = (t.supplier as string | undefined) ?? "—";
  const unitRate = numberOrNull(t.unitRatePencePerKWh) ?? numberOrNull(t.unitRate);
  const standing = numberOrNull(t.standingChargePence) ?? numberOrNull(t.standingCharge);

  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
        {label}
      </p>
      <Dl>
        <Dt>Supplier</Dt>
        <Dd>{supplier}</Dd>
        <Dt>Unit rate</Dt>
        <Dd>{unitRate != null ? `${unitRate.toFixed(2)} p/kWh` : "—"}</Dd>
        <Dt>Standing charge</Dt>
        <Dd>{standing != null ? `${standing.toFixed(2)} p/day` : "—"}</Dd>
      </Dl>
    </div>
  );
}

function numberOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

// ─── Footer / assets ────────────────────────────────────────────────

function AssetsFooter({
  property,
  floorplanObjectKey,
}: {
  property: InstallerSiteBriefProps["property"];
  floorplanObjectKey: string | null;
}) {
  const mapsUrl =
    property.latitude != null && property.longitude != null
      ? `https://www.google.com/maps/search/?api=1&query=${property.latitude},${property.longitude}`
      : property.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(property.address)}`
        : null;

  return (
    <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 print:hidden">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
        Quick access
      </p>
      <div className="flex flex-wrap gap-2">
        {mapsUrl && (
          <Link
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-coral/40 text-xs font-semibold text-slate-700 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5" />
            Open in Maps
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
        {floorplanObjectKey && (
          <Link
            href={`/api/floorplan/image?key=${encodeURIComponent(floorplanObjectKey)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-coral/40 text-xs font-semibold text-slate-700 transition-colors"
          >
            <ArrowDownCircle className="w-3.5 h-3.5" />
            Floorplan image
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
        <PrintButton variant="full">Print this brief</PrintButton>
      </div>
      <p className="text-[10px] text-slate-400 mt-3">
        Pre-survey indication only. Verify on site before specifying or
        quoting. Built from the homeowner&rsquo;s wizard inputs + EPC
        register + Google Solar API + Claude floorplan vision.
      </p>
    </section>
  );
}

// ─── Layout primitives ──────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 print:border print:border-slate-300 print:p-4">
      <h2 className="text-base font-bold text-navy flex items-center gap-2 mb-4">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function Subhead({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
      {children}
    </p>
  );
}

function Dl({ children }: { children: React.ReactNode }) {
  return (
    <dl className="grid grid-cols-[140px,1fr] gap-y-1.5 gap-x-3 text-sm">
      {children}
    </dl>
  );
}

function Dt({ children }: { children: React.ReactNode }) {
  return (
    <dt className="text-[11px] uppercase tracking-wider text-slate-400 mt-0.5">
      {children}
    </dt>
  );
}

function Dd({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dd className={`text-navy ${className ?? ""}`}>{children}</dd>;
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

