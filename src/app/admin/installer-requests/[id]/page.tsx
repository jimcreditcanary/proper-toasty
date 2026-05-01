// /admin/installer-requests/[id] — F3 review page.
//
// Renders the full request payload + a client-island action panel
// (approve / reject) that POSTs to /api/admin/installer-requests/[id]/action.
//
// Approve flow (handled server-side):
//   - Insert a public.installers row using the request payload (with
//     any field overrides the admin tweaked).
//   - Mark the request approved + record approved_installer_id.
//   - Send the requester an email with a /installer-signup?id=<new_id>
//     claim link.
//
// Reject flow:
//   - Mark the request rejected with an admin note.
//   - Send the requester a polite "we can't approve this" email
//     including the admin note as the reason.

import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { ArrowLeft, Building2, Calendar, Mail, Phone, ShieldCheck, Zap } from "lucide-react";
import { ReviewActions } from "./review-actions";
import type { Database } from "@/types/database";

export const dynamic = "force-dynamic";

type RequestRow = Database["public"]["Tables"]["installer_signup_requests"]["Row"];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ReviewRequestPage({ params }: PageProps) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("installer_signup_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle<RequestRow>();
  if (error || !data) notFound();

  // If approved, surface the resulting installer record so admins
  // can click straight through to the directory entry.
  let approvedInstallerName: string | null = null;
  if (data.approved_installer_id) {
    const { data: inst } = await admin
      .from("installers")
      .select("company_name")
      .eq("id", data.approved_installer_id)
      .maybeSingle<{ company_name: string }>();
    approvedInstallerName = inst?.company_name ?? null;
  }

  return (
    <PortalShell
      portalName="Admin"
      pageTitle={data.company_name}
      pageSubtitle={`Submitted ${formatDate(data.created_at)}`}
    >
      <div className="mb-4">
        <Link
          href="/admin/installer-requests"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-coral"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to queue
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-5">
        {/* Left: request payload */}
        <div className="space-y-5">
          <Section title="Company">
            <Field label="Company name" value={data.company_name} icon={<Building2 className="w-3.5 h-3.5" />} />
            {data.company_number && (
              <Field
                label="Companies House number"
                value={
                  <a
                    href={`https://find-and-update.company-information.service.gov.uk/company/${data.company_number}`}
                    target="_blank"
                    rel="noopener"
                    className="text-coral hover:text-coral-dark underline"
                  >
                    {data.company_number}
                  </a>
                }
              />
            )}
            {data.ch_address && <Field label="Registered address" value={data.ch_address} />}
            {data.ch_incorporation_date && (
              <Field
                label="Incorporated"
                value={data.ch_incorporation_date}
                icon={<Calendar className="w-3.5 h-3.5" />}
              />
            )}
          </Section>

          <Section title="Contact">
            <Field label="Name" value={data.contact_name} />
            <Field
              label="Email"
              icon={<Mail className="w-3.5 h-3.5" />}
              value={
                <a
                  href={`mailto:${data.contact_email}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {data.contact_email}
                </a>
              }
            />
            <Field
              label="Phone"
              icon={<Phone className="w-3.5 h-3.5" />}
              value={
                <a
                  href={`tel:${data.contact_phone}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {data.contact_phone}
                </a>
              }
            />
          </Section>

          <Section title="Specialities">
            <div className="flex flex-wrap gap-2">
              <Pill on={data.bus_registered} label="BUS registered" tone="emerald" />
              <Pill on={data.cap_heat_pump} label="Heat pumps" tone="coral" />
              <Pill on={data.cap_solar_pv} label="Solar PV" tone="coral" />
              <Pill on={data.cap_battery_storage} label="Battery storage" tone="coral" />
            </div>
          </Section>

          <Section title="MCS certification">
            <Field
              label="Body"
              icon={<ShieldCheck className="w-3.5 h-3.5" />}
              value={data.certification_body ?? "—"}
            />
            <Field
              label="Number"
              value={
                data.certification_pending
                  ? "⏳ Pending certification"
                  : data.certification_number ?? "—"
              }
            />
          </Section>

          {data.notes && (
            <Section title="Notes from requester">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {data.notes}
              </p>
            </Section>
          )}

          {data.admin_notes && (
            <Section title="Admin note">
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-amber-50 border border-amber-200 rounded-lg p-3">
                {data.admin_notes}
              </p>
            </Section>
          )}

          {data.status === "approved" && data.approved_installer_id && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
              <p className="font-semibold text-emerald-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Approved
              </p>
              <p className="text-emerald-900 text-xs mt-1">
                Installer record created: <strong>{approvedInstallerName ?? "(unknown)"}</strong>{" "}
                (id #{data.approved_installer_id}).
              </p>
            </div>
          )}
        </div>

        {/* Right: action panel */}
        <div>
          <div className="sticky top-4">
            {data.status === "pending" ? (
              <ReviewActions
                id={data.id}
                companyName={data.company_name}
                contactEmail={data.contact_email}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
                <p className="font-semibold text-navy mb-1">
                  Already {data.status}
                </p>
                <p className="text-xs text-slate-600">
                  Reviewed {data.reviewed_at ? formatDate(data.reviewed_at) : "—"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PortalShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-600 mb-3">
        {title}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      {icon && (
        <span className="shrink-0 mt-1 inline-flex items-center justify-center w-5 h-5 rounded text-slate-400">
          {icon}
        </span>
      )}
      <span className="flex-1 grid grid-cols-[140px,1fr] gap-2">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <span className="text-slate-800">{value}</span>
      </span>
    </div>
  );
}

function Pill({
  on,
  label,
  tone,
}: {
  on: boolean;
  label: string;
  tone: "coral" | "emerald";
}) {
  if (!on) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-400 line-through">
        {label}
      </span>
    );
  }
  const cls =
    tone === "coral"
      ? "bg-coral/10 text-coral"
      : "bg-emerald-100 text-emerald-800";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}
    >
      ✓ {label}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}
