"use client";

// Book a site visit tab — live directory of MCS-certified installers,
// distance-ranked from the user's address.
//
// Powered by /api/installers/nearby (Haversine) and the
// public.installers table (5,630 rows, scraped from mcscertified.com).
//
// Each tile has a "Book a meeting" button that opens BookingModal,
// which posts to /api/installer-leads/create. We don't email the
// installer yet — that fan-out happens in PR 4. For now the lead is
// captured in installer_leads with status='new'.

import { useEffect, useMemo, useState } from "react";
import {
  Battery,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ExternalLink,
  Flame,
  Loader2,
  MapPin,
  Phone,
  Star,
  Sun,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type {
  InstallerCard,
  NearbyInstallersResponse,
} from "@/lib/schemas/installers";
import { useCheckWizard } from "../../context";
import type { ReportSelection } from "../report-shell";
import { SectionCard } from "../shared";
import { BookingModal } from "../booking-modal";

interface Props {
  analysis: AnalyseResponse;
  postcode: string;
  latitude: number;
  longitude: number;
  selection: ReportSelection;
}

const PAGE_SIZE = 10;

export function BookVisitTab({
  analysis,
  postcode,
  latitude,
  longitude,
  selection,
}: Props) {
  const { state } = useCheckWizard();

  const [page, setPage] = useState(1);
  const [data, setData] = useState<NearbyInstallersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingFor, setBookingFor] = useState<InstallerCard | null>(null);

  // Compose the request from the user's selection. Battery on its own
  // doesn't make sense as a search filter (every solar installer fits
  // batteries) — collapse into solar+battery if the user only ticked
  // battery.
  const wantsSolar = selection.hasSolar || selection.hasBattery;
  const wantsBattery = selection.hasBattery;
  const wantsHeatPump = selection.hasHeatPump;
  const filterKey = `${wantsHeatPump}-${wantsSolar}-${wantsBattery}`;

  // Reset to page 1 whenever the filter changes.
  useEffect(() => {
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/installers/nearby", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            wantsHeatPump,
            wantsSolar,
            wantsBattery,
            page,
            pageSize: PAGE_SIZE,
            maxDistanceKm: 80,
          }),
        });
        const json = (await res.json()) as NearbyInstallersResponse;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setData({
            ok: false,
            installers: [],
            totalCount: 0,
            page,
            pageSize: PAGE_SIZE,
            error: err instanceof Error ? err.message : "Network error",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude, wantsHeatPump, wantsSolar, wantsBattery, page]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
  }, [data]);

  const techPhrase = describeTech(wantsHeatPump, wantsSolar, wantsBattery);

  return (
    <div className="space-y-6">
      <SectionCard
        title={`MCS-certified installers near ${postcode}`}
        subtitle={`Sorted by distance. Filtered to specialists in ${techPhrase}.`}
        icon={<MapPin className="w-5 h-5" />}
      >
        {/* Filter pills (read-only — toggles live in the Overview / Savings tabs) */}
        <div className="flex flex-wrap items-center gap-2 mb-5 -mt-1">
          <span className="text-xs text-slate-500 mr-1">Filtering by:</span>
          {wantsHeatPump && (
            <FilterPill icon={<Flame className="w-3 h-3" />} label="Heat pump (BUS-registered)" />
          )}
          {wantsSolar && (
            <FilterPill icon={<Sun className="w-3 h-3" />} label="Solar PV" />
          )}
          {wantsBattery && (
            <FilterPill icon={<Battery className="w-3 h-3" />} label="Battery storage" />
          )}
          {!wantsHeatPump && !wantsSolar && !wantsBattery && (
            <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
              Pick a tech in the Overview or Savings tab to filter
            </span>
          )}
        </div>

        {/* Loading / error / results */}
        {loading && !data ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Finding installers near you…
          </div>
        ) : data?.ok === false ? (
          <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
            {data.error}
          </div>
        ) : data && data.installers.length === 0 ? (
          <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
            <p className="font-semibold">
              We couldn&rsquo;t find {techPhrase} installers within 80km of{" "}
              {postcode}.
            </p>
            <p className="mt-1.5 leading-relaxed">
              Try a wider tech filter on the Overview tab — or use the official
              MCS finder for a broader search.
            </p>
            <a
              href={`https://www.mcscertified.com/find-an-installer/?postcode=${encodeURIComponent(postcode)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-900 hover:underline"
            >
              Open the MCS finder
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : data ? (
          <>
            <p className="text-xs text-slate-500 mb-3">
              {data.totalCount.toLocaleString()} installer
              {data.totalCount === 1 ? "" : "s"} match — showing{" "}
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, data.totalCount)}
            </p>
            <div className="space-y-3">
              {data.installers.map((i) => (
                <InstallerTile
                  key={i.id}
                  installer={i}
                  onBook={() => setBookingFor(i)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <span className="text-xs text-slate-500 tabular-nums">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || loading}
                  className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        ) : null}
      </SectionCard>

      {/* What to ask checklist (kept from the placeholder version) */}
      <SectionCard
        title="What to ask an installer when they call"
        subtitle="A quick checklist so you know you're getting the right kind of quote."
        icon={<Star className="w-5 h-5" />}
      >
        <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
          <Check>
            <strong className="text-navy">MCS certification number</strong> —
            every quote should reference it. Required for the BUS grant to pay
            out and for the export-tariff scheme.
          </Check>
          <Check>
            <strong className="text-navy">Heat-loss survey on the day</strong>{" "}
            — for heat pumps, this is non-negotiable. Walk away from anyone
            happy to quote without measuring radiators and walls.
          </Check>
          <Check>
            <strong className="text-navy">Specific kit on the quote</strong> —
            heat pump model and serial, panel make + wattage, battery
            chemistry. &ldquo;A 5kW heat pump&rdquo; isn&rsquo;t enough.
          </Check>
          <Check>
            <strong className="text-navy">Warranty + aftercare</strong> — at
            least 5 years on labour, 7+ on the kit. Ask who you call if
            something breaks in year 3.
          </Check>
          <Check>
            <strong className="text-navy">References from local jobs</strong>{" "}
            — two or three properties similar to yours, with permission to
            ring those owners. Good installers volunteer this.
          </Check>
        </ul>
      </SectionCard>

      {bookingFor && (
        <BookingModal
          installer={bookingFor}
          selection={selection}
          defaults={{
            contactEmail: state.leadEmail,
            contactName: state.leadName,
            homeownerLeadId: state.leadId,
            propertyAddress: state.address?.formattedAddress,
            propertyPostcode: state.address?.postcode,
            propertyUprn: state.address?.uprn,
            propertyLatitude: state.address?.latitude,
            propertyLongitude: state.address?.longitude,
            analysisSnapshot: {
              analysis,
              floorplanAnalysis: state.floorplanAnalysis,
              electricityTariff: state.electricityTariff,
              gasTariff: state.gasTariff,
            },
          }}
          onClose={() => setBookingFor(null)}
        />
      )}
    </div>
  );
}

// ─── Installer tile ─────────────────────────────────────────────────────────

function InstallerTile({
  installer,
  onBook,
}: {
  installer: InstallerCard;
  onBook: () => void;
}) {
  const capChips: { icon: React.ReactNode; label: string }[] = [];
  if (installer.capHeatPump)
    capChips.push({
      icon: <Flame className="w-3 h-3" />,
      label: installer.busRegistered ? "Heat pump · BUS" : "Heat pump",
    });
  if (installer.capSolarPv)
    capChips.push({ icon: <Sun className="w-3 h-3" />, label: "Solar PV" });
  if (installer.capBatteryStorage)
    capChips.push({
      icon: <Battery className="w-3 h-3" />,
      label: "Battery",
    });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 hover:border-coral/30 hover:shadow-sm transition-all">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Identity + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h4 className="text-base font-bold text-navy leading-tight">
              {installer.companyName}
            </h4>
            {installer.distanceKm != null && (
              <span className="text-xs text-slate-500 inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {installer.distanceKm}km
              </span>
            )}
            <span className="text-xs text-slate-500">
              {installer.certificationBody} · {installer.certificationNumber}
            </span>
          </div>

          {(installer.county || installer.postcode) && (
            <p className="mt-1 text-xs text-slate-500">
              {[installer.county, installer.postcode]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {/* Capability chips */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {capChips.map((c, i) => (
              <CapChip key={i} icon={c.icon} label={c.label} />
            ))}
            {installer.reviewsScore > 0 && installer.reviewsCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium ml-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {installer.reviewsScore.toFixed(1)} ({installer.reviewsCount})
              </span>
            )}
          </div>

          {/* Phone link if we have one */}
          {installer.telephone && (
            <p className="mt-3 text-xs text-slate-600 inline-flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <a
                href={`tel:${installer.telephone}`}
                className="hover:text-navy hover:underline"
              >
                {installer.telephone}
              </a>
              {installer.website && (
                <>
                  <span className="text-slate-300 mx-1.5">·</span>
                  <a
                    href={installer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 hover:text-navy hover:underline"
                  >
                    Website
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </>
              )}
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          type="button"
          onClick={onBook}
          className="shrink-0 inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors w-full sm:w-auto"
        >
          <CalendarDays className="w-4 h-4" />
          Book a meeting
        </button>
      </div>
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

function CapChip({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-slate-100 rounded-full px-2 py-0.5">
      {icon}
      {label}
    </span>
  );
}

function FilterPill({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-coral-dark bg-coral-pale rounded-full px-2.5 py-1">
      {icon}
      {label}
    </span>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="shrink-0 mt-1 inline-block w-1.5 h-1.5 rounded-full bg-coral" />
      <span>{children}</span>
    </li>
  );
}

function describeTech(hp: boolean, solar: boolean, battery: boolean): string {
  const parts: string[] = [];
  if (hp) parts.push("heat pumps");
  if (solar) parts.push("solar PV");
  if (battery && !solar) parts.push("battery storage");
  if (parts.length === 0) return "the upgrades you've selected";
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

