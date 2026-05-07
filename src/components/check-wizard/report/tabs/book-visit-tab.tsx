"use client";

// Book a site visit tab — 2-column grid of MCS-certified installers.
//
// Layout (top → bottom):
//   - Filter pills (read-only — toggles live in Overview / Savings tabs)
//   - "Already contacted" section (if any) — installers the homeowner
//     has already booked a meeting with, shown above the main grid
//     with a status pill so the user can see "yes, sent" at a glance
//   - Main 2-column grid (5 rows = 10 tiles per page)
//   - Pagination
//
// Each tile shows:
//   - Company name
//   - Cert body badge (NICEIC / NAPIT / MCS / RECC etc) + BUS pill
//   - Distance from the user
//   - Years in business (from Companies House enrichment)
//   - Reviews (Checkatrade — fetched lazy on tile render, 90-day cached)
//   - Capability chips (HP / Solar / Battery)
//   - Phone + website if available
//   - "Book a meeting" CTA — or status pill if already contacted

import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Battery,
  Calendar,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Globe,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Sun,
} from "lucide-react";
import type { AnalyseResponse } from "@/lib/schemas/analyse";
import type {
  InstallerCard,
  NearbyInstallersResponse,
} from "@/lib/schemas/installers";
import {
  isValidUkMobile,
  type AvailabilityResponse,
  type BookableSlot,
} from "@/lib/schemas/booking";
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
  /**
   * - "homeowner" : full nearby-installers grid (default)
   * - "presurvey" : homeowner is committed to a specific installer who
   *                 sent the report — replace the grid with a focused
   *                 "your visit with X is the next step" card. We still
   *                 want to leave the tab visible so they can find
   *                 booking guidance, just not surface other installers.
   */
  audience?: "homeowner" | "presurvey" | "installer";
  preSurveyInstallerName?: string | null;
}

const PAGE_SIZE = 10;

export function BookVisitTab({
  analysis,
  postcode,
  latitude,
  longitude,
  selection,
  audience = "homeowner",
  preSurveyInstallerName,
}: Props) {
  const { state } = useCheckWizard();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<NearbyInstallersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingFor, setBookingFor] = useState<InstallerCard | null>(null);
  // Bumped when a booking completes so the installer list re-fetches
  // and the just-booked tile moves into the "Already contacted" section
  // without the user having to manually refresh.
  const [bookingsVersion, setBookingsVersion] = useState(0);

  // Visible installer mutations — lets the lazy Checkatrade refresh
  // patch scores into the UI without re-fetching the whole list.
  const [reviewPatches, setReviewPatches] = useState<
    Record<number, { score: number | null; count: number | null; url: string | null }>
  >({});

  // Battery alone isn't a valid filter — collapse into solar+battery
  // if the user only ticked battery.
  const wantsSolar = selection.hasSolar || selection.hasBattery;
  const wantsBattery = selection.hasBattery;
  const wantsHeatPump = selection.hasHeatPump;
  const filterKey = `${wantsHeatPump}-${wantsSolar}-${wantsBattery}`;

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
            // Pass the homeowner_lead_id so the API can flag installers
            // we've already booked a meeting with → contacted section.
            homeownerLeadId: state.leadId ?? null,
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
  }, [latitude, longitude, wantsHeatPump, wantsSolar, wantsBattery, page, state.leadId, bookingsVersion]);

  // Fire Checkatrade refresh for the visible tiles (90-day cache lives
  // server-side; this just kicks the cron-by-render).
  useEffect(() => {
    const ids = (data?.installers ?? [])
      .filter((i) => i.checkatradeScore == null)
      .map((i) => i.id);
    if (ids.length === 0) return;
    void (async () => {
      try {
        const res = await fetch("/api/installers/checkatrade-refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids }),
        });
        if (!res.ok) return;
        const json = (await res.json()) as {
          ok?: boolean;
          results?: Array<{
            id: number;
            checkatradeScore: number | null;
            checkatradeReviewCount: number | null;
            checkatradeUrl: string | null;
          }>;
        };
        if (!json.ok || !json.results) return;
        const patches: typeof reviewPatches = {};
        for (const r of json.results) {
          patches[r.id] = {
            score: r.checkatradeScore,
            count: r.checkatradeReviewCount,
            url: r.checkatradeUrl,
          };
        }
        setReviewPatches((prev) => ({ ...prev, ...patches }));
      } catch {
        // best-effort — silent
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.installers]);

  // Apply patches + split into contacted vs available.
  const { contacted, available } = useMemo(() => {
    const list = (data?.installers ?? []).map((i) => {
      const p = reviewPatches[i.id];
      if (!p) return i;
      return {
        ...i,
        checkatradeScore: p.score,
        checkatradeReviewCount: p.count,
        checkatradeUrl: p.url ?? i.checkatradeUrl,
      };
    });
    return {
      contacted: list.filter((i) => i.contactedByMe),
      available: list.filter((i) => !i.contactedByMe),
    };
  }, [data?.installers, reviewPatches]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.totalCount / PAGE_SIZE));
  }, [data]);

  const techPhrase = describeTech(wantsHeatPump, wantsSolar, wantsBattery);

  // Pre-survey audience: the homeowner is already engaged with a
  // specific installer, so swapping in a generic "find an installer"
  // grid is off-message. Render a focused booking card with the
  // installer's actual availability slots so the homeowner can lock
  // in a time directly from the report.
  if (audience === "presurvey") {
    return (
      <PreSurveyBookingCard
        installerName={preSurveyInstallerName ?? "your installer"}
        techPhrase={techPhrase}
      />
    );
  }
  // Note: when state.preSurveyMeetingStatus === "booked" the report
  // shell hides this tab entirely and shows the meeting banner —
  // we only get here when the installer flagged "not_booked".

  return (
    <div className="space-y-6">
      <SectionCard
        title={`MCS-certified installers near ${postcode}`}
        subtitle={`Sorted by distance. Filtered to specialists in ${techPhrase}.`}
        icon={<MapPin className="w-5 h-5" />}
      >
        {/* Filter pills (read-only) */}
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
            {/* Already contacted — pinned above the grid so the user
                can see what they've already done at a glance. */}
            {contacted.length > 0 && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 mb-3 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Already contacted
                </p>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {contacted.map((i) => (
                    <InstallerTile
                      key={i.id}
                      installer={i}
                      onBook={() => setBookingFor(i)}
                      compact
                    />
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-600">
                  We&rsquo;ll let you know when {contacted.length === 1 ? "they get" : "they get"} back to you.
                  Future versions of this page will show meeting status,
                  proposals received, and let you compare quotes side-by-side.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-3">
              {data.totalCount.toLocaleString()} installer
              {data.totalCount === 1 ? "" : "s"} match — showing{" "}
              {(page - 1) * PAGE_SIZE + 1}–
              {Math.min(page * PAGE_SIZE, data.totalCount)}
            </p>

            {/* The 2-column grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
              {available.map((i) => (
                <InstallerTile
                  key={i.id}
                  installer={i}
                  onBook={() => setBookingFor(i)}
                />
              ))}
            </div>

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

      {/* The "What to ask an installer" checklist used to live here.
          Moved into the Overview tab's "Working with installers" card
          so the prep checklist is the first thing the homeowner sees,
          not buried at the bottom of the booking flow. */}

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
          onBooked={() => setBookingsVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}

// ─── Installer tile ─────────────────────────────────────────────────────────

function InstallerTile({
  installer,
  onBook,
  compact,
}: {
  installer: InstallerCard;
  onBook: () => void;
  compact?: boolean;
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

  const hasCheckatrade =
    installer.checkatradeScore != null && installer.checkatradeScore > 0;

  // Distance in miles, one decimal. Server returns km; client converts
  // for presentation so the API doesn't need a duplicate field.
  const distanceMiles =
    installer.distanceKm != null
      ? Math.round(installer.distanceKm * 0.621371 * 10) / 10
      : null;

  // Single location line: "Based in {postcode} · 1.6 miles away".
  // Postcode-only (no town lookup) per spec — postcodes.io would add
  // an API hop we don't need. Distance follows directly so the user
  // sees the relevant info in one read.
  const locationParts: string[] = [];
  if (installer.postcode) locationParts.push(`Based in ${installer.postcode}`);
  if (distanceMiles != null) locationParts.push(`${distanceMiles} miles away`);

  return (
    <div
      className={`rounded-xl border ${installer.contactedByMe ? "border-emerald-200 bg-white" : "border-slate-200 bg-white hover:border-coral/30 hover:shadow-sm"} p-4 sm:p-5 transition-all flex flex-col`}
    >
      {/* Top: name + location/distance combined */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-navy leading-tight">
          {installer.companyName}
        </h3>
        {locationParts.length > 0 && (
          <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400" />
            {locationParts.join(" · ")}
          </p>
        )}
      </div>

      {/* Trust signals — labelled rows for clarity rather than icon-only pills.
          Order: certifying body → BUS (only when yes) → trading since →
          Checkatrade reviews. */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3">
        <LabelledBadge
          icon={<Award className="w-3 h-3" />}
          label="Certified by"
          value={installer.certificationBody}
          tone={certTone(installer.certificationBody)}
        />
        {installer.busRegistered && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            <ShieldCheck className="w-3 h-3" />
            BUS Certified
          </span>
        )}
        {installer.incorporationYear && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 rounded-full px-2 py-0.5">
            <Clock className="w-3 h-3" />
            Trading since {installer.incorporationYear}
          </span>
        )}
        {hasCheckatrade && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
            {installer.checkatradeScore!.toFixed(1)}
            {installer.checkatradeReviewCount != null &&
              ` · ${installer.checkatradeReviewCount} reviews`}
          </span>
        )}
      </div>

      {/* Areas of focus — explicit header above the capability chips so
          the user knows what they're looking at. */}
      {!compact && capChips.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
            Areas of focus
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {capChips.map((c, i) => (
              <CapChip key={i} icon={c.icon} label={c.label} />
            ))}
          </div>
        </div>
      )}

      {/* Contact */}
      {!compact && (installer.telephone || installer.website) && (
        <p className="text-xs text-slate-600 inline-flex flex-wrap items-center gap-2 mb-3">
          {installer.telephone && (
            <a
              href={`tel:${installer.telephone}`}
              className="inline-flex items-center gap-1 hover:text-navy hover:underline"
            >
              <Phone className="w-3 h-3" />
              {installer.telephone}
            </a>
          )}
          {installer.telephone && installer.website && (
            <span className="text-slate-300">·</span>
          )}
          {installer.website && (
            <a
              href={installer.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-navy hover:underline"
            >
              <Globe className="w-3 h-3" />
              Website
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
        </p>
      )}

      {/* CTA — book or status */}
      <div className="mt-auto">
        {installer.contactedByMe ? (
          <ContactedStatusRow status={installer.contactedStatus} />
        ) : (
          <button
            type="button"
            onClick={onBook}
            className="w-full inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Book a meeting
          </button>
        )}
      </div>
    </div>
  );
}

// Status pill + secondary line for the contacted tile.
//
//   pending  — "Booking sent · Awaiting reply"
//   booked   — "Visit confirmed · Calendar invite sent"
//   taken    — "Lead accepted · Awaiting reschedule"
//   declined — "Installer declined · Pick someone else"
function ContactedStatusRow({
  status,
}: {
  status: InstallerCard["contactedStatus"];
}) {
  const config: {
    pillCls: string;
    pillIcon: React.ReactNode;
    pillText: string;
    detailIcon: React.ReactNode;
    detailText: string;
  } =
    status === "booked"
      ? {
          pillCls: "text-emerald-700 bg-emerald-50 border-emerald-200",
          pillIcon: <CheckCircle2 className="w-3.5 h-3.5" />,
          pillText: "Visit confirmed",
          detailIcon: <Calendar className="w-3 h-3" />,
          detailText: "Calendar invite sent",
        }
      : status === "taken"
        ? {
            pillCls: "text-emerald-700 bg-emerald-50 border-emerald-200",
            pillIcon: <CheckCircle2 className="w-3.5 h-3.5" />,
            pillText: "Lead accepted",
            detailIcon: <Clock className="w-3 h-3" />,
            detailText: "Awaiting reschedule",
          }
        : status === "declined"
          ? {
              pillCls: "text-slate-700 bg-slate-50 border-slate-200",
              pillIcon: <CheckCircle2 className="w-3.5 h-3.5" />,
              pillText: "Installer declined",
              detailIcon: <Calendar className="w-3 h-3" />,
              detailText: "Pick another installer",
            }
          : {
              pillCls: "text-emerald-700 bg-emerald-50 border-emerald-200",
              pillIcon: <CheckCircle2 className="w-3.5 h-3.5" />,
              pillText: "Booking sent",
              detailIcon: <Calendar className="w-3 h-3" />,
              detailText: "Awaiting reply",
            };
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold border rounded-full px-2.5 py-1 ${config.pillCls}`}
      >
        {config.pillIcon}
        {config.pillText}
      </span>
      <span className="text-xs text-slate-500 inline-flex items-center gap-1">
        {config.detailIcon}
        {config.detailText}
      </span>
    </div>
  );
}

// ─── Atoms ──────────────────────────────────────────────────────────────────

// Tone classes for the certifying body — used by the LabelledBadge so
// the body name still gets a recognisable colour without losing the
// "Certified by:" label.
function certTone(body: string): string {
  switch (body) {
    case "NICEIC":
      return "bg-blue-50 text-blue-800 border-blue-200";
    case "NAPIT":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "MCS":
      return "bg-coral-pale text-coral-dark border-coral/40";
    case "RECC":
      return "bg-violet-50 text-violet-800 border-violet-200";
    case "HIES":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
}

// "Certified by: NAPIT" style badge — explicit label + value rather
// than icon-only so non-technical users understand what the colour
// means without needing to hover.
function LabelledBadge({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold rounded-full pl-2 pr-2 py-0.5 border ${tone}`}
    >
      {icon}
      <span className="font-medium opacity-80">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

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

// Pre-survey audience booking card. The homeowner clicked through
// from a pre-survey email where the installer ticked "site visit
// NOT yet booked" — so they need to lock a slot in. Renders a
// focused single-installer slot picker for the requesting installer
// and books the meeting via /api/pre-survey-requests/book (which
// hangs the meeting off the EXISTING installer_lead row, rather than
// creating a new one).
//
// On success the wizard state flips to booked → the parent tab nav
// drops the Book tab and the meeting banner appears at the top of
// the report. No reload required.
function PreSurveyBookingCard({
  installerName,
  techPhrase,
}: {
  installerName: string;
  techPhrase: string;
}) {
  const { state, update } = useCheckWizard();
  const installerId = state.preSurveyInstallerId;
  const homeownerToken = state.preSurveyToken;
  const requestId = state.preSurveyRequestId;

  const [slots, setSlots] = useState<BookableSlot[] | null>(null);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [activeDayKey, setActiveDayKey] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<BookableSlot | null>(null);

  const [phone, setPhone] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ scheduledAtUtc: string } | null>(null);

  // Fetch the installer's availability once we have the id.
  useEffect(() => {
    if (!installerId) return;
    let cancelled = false;
    setSlotsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/installers/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installerId }),
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
        if (cancelled) return;
        setSlotsError(e instanceof Error ? e.message : "Network error");
        setSlots([]);
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [installerId]);

  // Group slots by day for the picker.
  const slotsByDay = useMemo(() => {
    const map = new Map<string, { dayLabel: string; slots: BookableSlot[] }>();
    for (const s of slots ?? []) {
      const entry = map.get(s.dayKey);
      if (entry) entry.slots.push(s);
      else map.set(s.dayKey, { dayLabel: s.dayLabel, slots: [s] });
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

  const phoneInvalid =
    phoneTouched && phone.trim() !== "" && !isValidUkMobile(phone);
  const phoneEmpty = phoneTouched && phone.trim() === "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPhoneTouched(true);
    setSubmitError(null);
    if (!selectedSlot) {
      setSubmitError("Pick a time first.");
      return;
    }
    if (!isValidUkMobile(phone)) {
      setSubmitError("Enter a valid UK mobile so the installer can confirm.");
      return;
    }
    if (!requestId || !homeownerToken) {
      setSubmitError("This booking link is missing — try opening it from the email again.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/pre-survey-requests/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preSurveyRequestId: requestId,
          homeownerToken,
          scheduledAtUtc: selectedSlot.startUtc,
          contactPhone: phone.trim(),
          notes: notes.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok: boolean;
        error?: string;
        meetingAtUtc?: string;
      };
      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? `Couldn't save (${res.status})`);
      }
      // Flip the wizard state — the report shell watches this and
      // will hide the Book tab + show the meeting banner up top.
      update({
        preSurveyMeetingStatus: "booked",
        preSurveyMeetingAt: data.meetingAtUtc ?? selectedSlot.startUtc,
      });
      setSuccess({ scheduledAtUtc: data.meetingAtUtc ?? selectedSlot.startUtc });
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong — try again",
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Done state — shown briefly before the parent shell re-renders
  // and hides the tab. Acts as a confirmation for users whose
  // wizard state takes a beat to propagate.
  if (success) {
    let formatted: string;
    try {
      formatted = new Date(success.scheduledAtUtc).toLocaleString("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      formatted = success.scheduledAtUtc;
    }
    return (
      <div className="space-y-6">
        <SectionCard
          title={`Visit booked with ${installerName}`}
          subtitle="They'll confirm by email — a calendar invite will follow."
          icon={<CalendarCheck2 className="w-5 h-5 text-emerald-700" />}
        >
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">{formatted}</p>
            <p className="mt-1 text-xs text-emerald-800">
              We&rsquo;ve sent the request to {installerName} and a copy to your
              inbox. They&rsquo;ll reach out on the phone you provided to
              confirm.
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  // Defensive fallback — if the link landed on the report but didn't
  // carry the installer id (older tokens, edge cases) we can't fetch
  // availability. Fall back to the previous "they'll be in touch"
  // copy rather than render a broken empty picker.
  if (!installerId || !requestId || !homeownerToken) {
    return (
      <div className="space-y-6">
        <SectionCard
          title={`Your visit with ${installerName}`}
          subtitle="That visit's the next step — here's what to expect."
          icon={<MapPin className="w-5 h-5" />}
        >
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
            <p>
              {/* Explicit {" "} separators around the company name —
                  literal-space JSX text was occasionally rendering
                  as `Ltdshared` in production builds (formatter +
                  React string-children whitespace folding). The
                  spacers make it unambiguous. */}
              <strong className="text-navy">{installerName}</strong>
              {" "}shared this report with you ahead of the visit, so
              you&rsquo;re both starting from the same numbers on{" "}
              {techPhrase}. They&rsquo;ll be in touch to confirm a time
              if they haven&rsquo;t already.
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={`Book your visit with ${installerName}`}
        subtitle={`Pick a time that works for you. ${installerName} will confirm by email + phone.`}
        icon={<CalendarDays className="w-5 h-5" />}
      >
        <form onSubmit={submit} className="space-y-5">
          {/* Slot picker */}
          {slotsLoading ? (
            <div className="flex items-center justify-center py-10 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Loading {installerName}&rsquo;s next available slots…
            </div>
          ) : slotsError ? (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-4">
              {slotsError}
            </div>
          ) : (slots?.length ?? 0) === 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
              <p className="font-semibold">No slots available right now.</p>
              <p className="mt-1.5 leading-relaxed">
                {installerName} hasn&rsquo;t opened any visit slots yet. They
                may reach out by phone or email to arrange a time directly.
              </p>
            </div>
          ) : (
            <>
              {/* Day tabs */}
              <div className="flex flex-wrap gap-1.5">
                {slotsByDay.map((d) => {
                  const active = d.dayKey === activeDayKey;
                  return (
                    <button
                      key={d.dayKey}
                      type="button"
                      onClick={() => setActiveDayKey(d.dayKey)}
                      className={`px-3 h-9 rounded-full text-sm font-semibold transition-colors ${
                        active
                          ? "bg-coral text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-coral-pale/40 hover:text-coral-dark"
                      }`}
                    >
                      {d.dayLabel}
                    </button>
                  );
                })}
              </div>

              {/* Time pills */}
              <div className="flex flex-wrap gap-1.5">
                {slotsForActiveDay.map((s) => {
                  const isSelected =
                    selectedSlot?.startUtc === s.startUtc;
                  return (
                    <button
                      key={s.startUtc}
                      type="button"
                      onClick={() => setSelectedSlot(s)}
                      className={`px-3 h-10 rounded-lg text-sm font-medium border transition-colors ${
                        isSelected
                          ? "bg-coral text-white border-coral"
                          : "bg-white text-slate-700 border-slate-200 hover:border-coral/40 hover:text-coral-dark"
                      }`}
                    >
                      {s.timeLabel}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Phone + notes — only show once a slot is picked so the
              UI doesn't feel like a giant form on first paint. */}
          {selectedSlot && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-navy inline-flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  Mobile number
                  <span className="text-coral" aria-hidden="true">
                    *
                  </span>
                </span>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => setPhoneTouched(true)}
                  placeholder="07700 900123"
                  className={`mt-1 w-full h-11 rounded-lg border bg-white px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral ${
                    phoneInvalid || phoneEmpty
                      ? "border-red-300"
                      : "border-slate-200"
                  }`}
                  autoComplete="tel"
                  inputMode="tel"
                />
                <span className="mt-1 block text-[11px] text-slate-500">
                  So {installerName} can confirm the slot quickly.
                </span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-navy">
                  Anything to mention? (optional)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Access, parking, parts of the property to focus on…"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-coral focus-visible:border-coral"
                />
              </label>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || !selectedSlot || (slots?.length ?? 0) === 0}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Booking…
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                {selectedSlot
                  ? `Book ${selectedSlot.timeLabel} with ${installerName}`
                  : "Pick a time to continue"}
              </>
            )}
          </button>
        </form>
      </SectionCard>
    </div>
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
