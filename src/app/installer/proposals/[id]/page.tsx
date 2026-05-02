// /installer/proposals/[id] — installer-side read-only view of a
// single proposal. Sent / accepted / declined proposals are
// uneditable; clicking through this page shows the same content the
// homeowner sees, plus internal-only metadata (sent / viewed /
// accepted timestamps, decline reason, link to the homeowner page).
//
// Drafts redirect back to the builder — there's no read-only state
// for an unfinished proposal.
//
// Auth: must be signed in + bound to the installer that owns the
// proposal. Cross-installer access is blocked.

import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import {
  CheckCircle2,
  Eye,
  ExternalLink,
  FileEdit,
  Send,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal-shell";
import { formatGbp, type LineItem } from "@/lib/proposals/schema";
import type { Database, Json } from "@/types/database";

export const dynamic = "force-dynamic";

type ProposalRow = Database["public"]["Tables"]["installer_proposals"]["Row"];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/auth/login?redirect=/installer/proposals/${id}`);
  }

  const admin = createAdminClient();

  const { data: installer } = await admin
    .from("installers")
    .select("id, company_name")
    .eq("user_id", user.id)
    .maybeSingle<{ id: number; company_name: string }>();
  if (!installer) {
    return (
      <PortalShell
        portalName="Installer"
        pageTitle="Proposal"
        backLink={{ href: "/installer/proposals", label: "Back to proposals" }}
      >
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900 leading-relaxed">
            Your account isn&rsquo;t linked to an installer profile yet.
          </p>
        </div>
      </PortalShell>
    );
  }

  const { data: proposal } = await admin
    .from("installer_proposals")
    .select("*")
    .eq("id", id)
    .eq("installer_id", installer.id)
    .maybeSingle<ProposalRow>();
  if (!proposal) {
    notFound();
  }

  // Drafts go back to the builder so there's only one editing surface.
  if (proposal.status === "draft") {
    redirect(`/installer/leads/${proposal.installer_lead_id}/propose`);
  }

  // Lead context for header.
  const { data: lead } = await admin
    .from("installer_leads")
    .select(
      "id, contact_name, contact_email, contact_phone, property_address, property_postcode",
    )
    .eq("id", proposal.installer_lead_id)
    .maybeSingle();

  const appBaseUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "https://propertoasty.com"
  ).replace(/\/+$/, "");
  const homeownerUrl = `${appBaseUrl}/p/${proposal.homeowner_token}`;

  const lineItems = parseLineItems(proposal.line_items);

  return (
    <PortalShell
      portalName="Installer"
      pageTitle={
        lead?.property_address ?? lead?.property_postcode ?? "Proposal"
      }
      pageSubtitle={
        lead?.contact_name
          ? `Quote sent to ${lead.contact_name}`
          : "Quote detail"
      }
      backLink={{ href: "/installer/proposals", label: "Back to proposals" }}
    >
      {/* Status strip */}
      <StatusStrip proposal={proposal} />

      {/* Quote total card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 mb-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
              Quote total
            </p>
            <p className="text-3xl font-bold text-navy leading-none">
              {formatGbp(proposal.total_pence)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {proposal.vat_rate_bps === 0
                ? "0% VAT (zero-rated)"
                : "incl. 20% VAT"}
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <p>
              Subtotal{" "}
              <span className="text-slate-900 font-semibold ml-1">
                {formatGbp(proposal.subtotal_pence)}
              </span>
            </p>
            <p>
              VAT{" "}
              <span className="text-slate-900 font-semibold ml-1">
                {formatGbp(proposal.vat_pence)}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Cover message */}
      {proposal.cover_message && (
        <div className="rounded-2xl border-l-4 border-coral bg-white p-5 border-y border-r border-slate-200 rounded-l-none mb-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Your cover message
          </p>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {proposal.cover_message}
          </p>
        </div>
      )}

      {/* Line items */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden mb-5">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-navy">Line items</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr className="border-b border-slate-200">
              <th className="text-left px-5 py-2.5">Item</th>
              <th className="text-right px-2 py-2.5 hidden sm:table-cell">
                Qty
              </th>
              <th className="text-right px-2 py-2.5 hidden sm:table-cell">
                Unit
              </th>
              <th className="text-right px-5 py-2.5">Line</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, idx) => {
              const linePence = Math.round(row.quantity * row.unit_price_pence);
              return (
                <tr
                  key={row.id ?? idx}
                  className="border-b border-slate-200 last:border-b-0"
                >
                  <td className="px-5 py-3 text-slate-800">
                    {row.description}
                    <div className="sm:hidden text-xs text-slate-500 mt-0.5">
                      {row.quantity} × {formatGbp(row.unit_price_pence)}
                    </div>
                  </td>
                  <td className="text-right px-2 py-3 text-slate-700 hidden sm:table-cell">
                    {row.quantity}
                  </td>
                  <td className="text-right px-2 py-3 text-slate-700 hidden sm:table-cell">
                    {formatGbp(row.unit_price_pence)}
                  </td>
                  <td className="text-right px-5 py-3 font-semibold text-navy">
                    {formatGbp(linePence)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <a
          href={homeownerUrl}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          <Eye className="w-4 h-4" />
          Preview homeowner view
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
        {(proposal.status === "sent" || proposal.status === "declined") && (
          <Link
            href={`/installer/leads/${proposal.installer_lead_id}/propose`}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            <FileEdit className="w-4 h-4" />
            Build a revised v2
          </Link>
        )}
      </div>

      {/* Homeowner contact reminder for accepted */}
      {proposal.status === "accepted" && lead && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
            Reach the homeowner
          </p>
          <p className="text-sm text-emerald-900 mb-2 leading-relaxed">
            {lead.contact_name ?? "The homeowner"} accepted — get in
            touch to confirm install dates.
          </p>
          <div className="text-sm space-y-1">
            <p>
              📧{" "}
              <a
                href={`mailto:${lead.contact_email}`}
                className="text-coral-dark hover:text-coral underline"
              >
                {lead.contact_email}
              </a>
            </p>
            {lead.contact_phone && (
              <p>
                📞{" "}
                <a
                  href={`tel:${lead.contact_phone}`}
                  className="text-coral-dark hover:text-coral underline"
                >
                  {lead.contact_phone}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Decline reason for declined */}
      {proposal.status === "declined" && proposal.decline_reason && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-2">
            Reason given
          </p>
          <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-wrap">
            {proposal.decline_reason}
          </p>
        </div>
      )}
    </PortalShell>
  );
}

function StatusStrip({ proposal }: { proposal: ProposalRow }) {
  const items: { icon: React.ReactNode; label: string; value: string }[] = [];
  if (proposal.sent_at) {
    items.push({
      icon: <Send className="w-3.5 h-3.5 text-sky-700" />,
      label: "Sent",
      value: formatDate(proposal.sent_at),
    });
  }
  if (proposal.viewed_at) {
    items.push({
      icon: <Eye className="w-3.5 h-3.5 text-slate-600" />,
      label: "Viewed",
      value: formatDate(proposal.viewed_at),
    });
  }
  if (proposal.accepted_at) {
    items.push({
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
      label: "Accepted",
      value: formatDate(proposal.accepted_at),
    });
  }
  if (proposal.declined_at) {
    items.push({
      icon: <XCircle className="w-3.5 h-3.5 text-slate-600" />,
      label: "Declined",
      value: formatDate(proposal.declined_at),
    });
  }
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      {items.map((it, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1.5 text-slate-600"
        >
          {it.icon}
          <span className="font-semibold text-slate-700">{it.label}</span>
          <span>{it.value}</span>
        </span>
      ))}
    </div>
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

function parseLineItems(raw: Json): LineItem[] {
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof (row as { description?: unknown }).description !== "string" ||
      typeof (row as { quantity?: unknown }).quantity !== "number" ||
      typeof (row as { unit_price_pence?: unknown }).unit_price_pence !== "number"
    ) {
      return [];
    }
    const r = row as {
      id?: unknown;
      description: string;
      quantity: number;
      unit_price_pence: number;
    };
    return [
      {
        id: typeof r.id === "string" ? r.id : `row-${Math.random()}`,
        description: r.description,
        quantity: r.quantity,
        unit_price_pence: r.unit_price_pence,
      },
    ];
  });
}
