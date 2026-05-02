"use client";

// Homeowner-facing proposal viewer.
//
// Loads via /api/proposals/[token]/load, renders the quote with
// accept/decline buttons. After accept/decline the page swaps to a
// confirmation state instead of redirecting (so refresh-friendly).
//
// VAT, line items, totals all server-validated — we just display
// what came back. The accept/decline POST is also server-side
// idempotent (CAS on status='sent') so a fast double-click can't
// fire twice.

import { useEffect, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { formatGbp, type LineItem } from "@/lib/proposals/schema";
import type { Json } from "@/types/database";

interface Proposal {
  id: string;
  installer_id: number;
  installer_lead_id: string;
  status: "draft" | "sent" | "accepted" | "declined";
  line_items: Json;
  cover_message: string | null;
  vat_rate_bps: number;
  subtotal_pence: number;
  vat_pence: number;
  total_pence: number;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
}

interface InstallerCard {
  company_name: string;
  email: string | null;
  telephone: string | null;
  website: string | null;
  postcode: string | null;
}

interface LeadCard {
  contact_name: string | null;
  contact_email: string;
  property_address: string | null;
  property_postcode: string | null;
  wants_heat_pump: boolean;
  wants_solar: boolean;
  wants_battery: boolean;
}

type LoadState =
  | { kind: "loading" }
  | {
      kind: "ok";
      proposal: Proposal;
      installer: InstallerCard | null;
      lead: LeadCard | null;
    }
  | { kind: "error"; message: string };

type RespondState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

interface Props {
  token: string;
}

export function ProposalViewClient({ token }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [respond, setRespond] = useState<RespondState>({ kind: "idle" });
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/proposals/${encodeURIComponent(token)}/load`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({
            kind: "error",
            message: data.error ?? "Couldn't load this quote",
          });
          return;
        }
        setState({
          kind: "ok",
          proposal: data.proposal as Proposal,
          installer: data.installer as InstallerCard | null,
          lead: data.lead as LeadCard | null,
        });
      } catch (e) {
        if (cancelled) return;
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitDecision(decision: "accepted" | "declined") {
    setRespond({ kind: "submitting" });
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(token)}/respond`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          decision,
          reason: decision === "declined" ? declineReason.trim() || undefined : undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        setRespond({
          kind: "error",
          message: j.error ?? "Could not submit your response",
        });
        return;
      }
      // Swap state into "responded" by mutating the proposal locally.
      setState((s) => {
        if (s.kind !== "ok") return s;
        const nowIso = new Date().toISOString();
        return {
          ...s,
          proposal: {
            ...s.proposal,
            status: decision,
            accepted_at: decision === "accepted" ? nowIso : s.proposal.accepted_at,
            declined_at: decision === "declined" ? nowIso : s.proposal.declined_at,
          },
        };
      });
      setRespond({ kind: "idle" });
      setShowDeclineForm(false);
    } catch (e) {
      setRespond({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  if (state.kind === "loading") {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
        <Loader2 className="w-6 h-6 animate-spin text-coral mx-auto mb-3" />
        <p className="text-sm text-slate-500">Loading the quote…</p>
      </div>
    );
  }
  if (state.kind === "error") {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
        <XCircle className="w-7 h-7 text-red-600 mx-auto mb-3" />
        <p className="text-base font-semibold text-red-900">
          Couldn&rsquo;t open this quote
        </p>
        <p className="text-sm text-red-900 mt-2 leading-relaxed max-w-md mx-auto">
          {state.message}
        </p>
        <p className="text-xs text-red-800 mt-4">
          If you got this link from your installer, ask them to re-send
          it. Or email{" "}
          <a
            className="underline font-semibold"
            href="mailto:hello@propertoasty.com"
          >
            hello@propertoasty.com
          </a>{" "}
          and we&rsquo;ll help.
        </p>
      </div>
    );
  }

  const { proposal, installer, lead } = state;
  const lineItems = parseLineItems(proposal.line_items);
  const vatLabel =
    proposal.vat_rate_bps === 0 ? "0% VAT (zero-rated)" : "incl. 20% VAT";
  const wants = [
    lead?.wants_heat_pump && "Heat pump",
    lead?.wants_solar && "Solar PV",
    lead?.wants_battery && "Battery",
  ]
    .filter(Boolean)
    .join(" + ");

  return (
    <div className="space-y-5">
      {/* Brand strip — Propertoasty + installer */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <a
          href="https://propertoasty.com"
          className="font-bold tracking-tight text-navy text-base"
        >
          Propertoasty
        </a>
        <span>Quote from {installer?.company_name ?? "your installer"}</span>
      </div>

      {/* Quote header card */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-coral mb-2">
          Quote for {lead?.contact_name ?? "you"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
          {installer?.company_name ?? "Your installer"} sent you a written quote
        </h1>
        {lead?.property_address && (
          <p className="text-sm text-slate-600 mt-2">
            {lead.property_address}
            {lead.property_postcode && ` · ${lead.property_postcode}`}
          </p>
        )}
        {wants && (
          <p className="text-xs text-slate-500 mt-1">
            Discussing: <span className="font-medium text-slate-700">{wants}</span>
          </p>
        )}

        {/* Big total */}
        <div className="bg-coral-pale border border-coral/20 rounded-xl p-5 mt-5 text-center">
          <p className="text-[11px] font-bold uppercase tracking-wider text-coral-dark mb-1">
            Quote total
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-navy leading-none">
            {formatGbp(proposal.total_pence)}
          </p>
          <p className="text-xs text-coral-dark mt-2">{vatLabel}</p>
        </div>
      </div>

      {/* Cover message */}
      {proposal.cover_message && (
        <div className="rounded-2xl border-l-4 border-coral bg-white p-5 border-y border-r border-[var(--border)] rounded-l-none">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">
            Note from {installer?.company_name ?? "your installer"}
          </p>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {proposal.cover_message}
          </p>
        </div>
      )}

      {/* Line items table */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-[var(--border)] bg-slate-50">
          <h2 className="text-sm font-semibold text-navy">What&rsquo;s included</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            <tr className="border-b border-[var(--border)]">
              <th className="text-left px-5 sm:px-6 py-2.5">Item</th>
              <th className="text-right px-2 py-2.5 hidden sm:table-cell">Qty</th>
              <th className="text-right px-2 py-2.5 hidden sm:table-cell">Unit</th>
              <th className="text-right px-5 sm:px-6 py-2.5">Total</th>
            </tr>
          </thead>
          <tbody>
            {lineItems.map((row, idx) => {
              const linePence = Math.round(row.quantity * row.unit_price_pence);
              return (
                <tr
                  key={row.id ?? idx}
                  className="border-b border-[var(--border)] last:border-b-0"
                >
                  <td className="px-5 sm:px-6 py-3 text-slate-800">
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
                  <td className="text-right px-5 sm:px-6 py-3 font-semibold text-navy">
                    {formatGbp(linePence)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-[var(--border)]">
              <td colSpan={3} className="px-5 sm:px-6 py-2.5 text-right text-xs text-slate-500">
                Subtotal
              </td>
              <td className="text-right px-5 sm:px-6 py-2.5 text-sm text-slate-700">
                {formatGbp(proposal.subtotal_pence)}
              </td>
            </tr>
            <tr className="bg-slate-50">
              <td colSpan={3} className="px-5 sm:px-6 py-2.5 text-right text-xs text-slate-500">
                VAT ({proposal.vat_rate_bps === 0 ? "0%" : "20%"})
              </td>
              <td className="text-right px-5 sm:px-6 py-2.5 text-sm text-slate-700">
                {formatGbp(proposal.vat_pence)}
              </td>
            </tr>
            <tr className="bg-coral-pale border-t-2 border-coral/30">
              <td colSpan={3} className="px-5 sm:px-6 py-3 text-right text-sm font-bold text-navy">
                Total
              </td>
              <td className="text-right px-5 sm:px-6 py-3 text-lg font-bold text-navy">
                {formatGbp(proposal.total_pence)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Installer contact card */}
      {installer && (installer.email || installer.telephone || installer.website) && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Got questions?
          </p>
          <p className="text-sm text-slate-700 mb-3 leading-relaxed">
            Reach <strong className="text-navy">{installer.company_name}</strong> directly:
          </p>
          <div className="space-y-1.5 text-sm">
            {installer.email && (
              <p className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <a
                  href={`mailto:${installer.email}`}
                  className="text-coral hover:text-coral-dark underline"
                >
                  {installer.email}
                </a>
              </p>
            )}
            {installer.telephone && (
              <p className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-slate-400" />
                <a
                  href={`tel:${installer.telephone}`}
                  className="text-navy hover:text-coral"
                >
                  {installer.telephone}
                </a>
              </p>
            )}
            {installer.website && (
              <p className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-slate-400" />
                <a
                  href={installer.website}
                  target="_blank"
                  rel="noopener"
                  className="text-coral hover:text-coral-dark underline"
                >
                  {installer.website}
                </a>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Action panel — accept / decline / responded confirmations */}
      <ResponsePanel
        status={proposal.status}
        respondState={respond}
        onAccept={() => submitDecision("accepted")}
        onShowDecline={() => setShowDeclineForm(true)}
        onCancelDecline={() => setShowDeclineForm(false)}
        onSubmitDecline={() => submitDecision("declined")}
        showDeclineForm={showDeclineForm}
        declineReason={declineReason}
        setDeclineReason={setDeclineReason}
        installerName={installer?.company_name ?? "the installer"}
      />

      {/* Friendly nudge — get other quotes */}
      {proposal.status === "sent" && (
        <p className="text-xs text-slate-500 leading-relaxed text-center max-w-xl mx-auto px-2">
          A friendly reminder: it&rsquo;s worth getting two or three
          quotes before committing. Even great installers vary 20–30% on
          the same job.
        </p>
      )}

      <p className="text-[11px] text-slate-400 text-center pt-2">
        Sent via{" "}
        <a
          href="https://propertoasty.com"
          className="underline hover:text-slate-600"
        >
          Propertoasty
        </a>
      </p>
    </div>
  );
}

function ResponsePanel(props: {
  status: Proposal["status"];
  respondState: RespondState;
  onAccept: () => void;
  onShowDecline: () => void;
  onCancelDecline: () => void;
  onSubmitDecline: () => void;
  showDeclineForm: boolean;
  declineReason: string;
  setDeclineReason: (s: string) => void;
  installerName: string;
}) {
  const {
    status,
    respondState,
    onAccept,
    onShowDecline,
    onCancelDecline,
    onSubmitDecline,
    showDeclineForm,
    declineReason,
    setDeclineReason,
    installerName,
  } = props;

  if (status === "accepted") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 text-center">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-emerald-900">
          You&rsquo;ve accepted this quote
        </h2>
        <p className="text-sm text-emerald-900 mt-2 leading-relaxed max-w-md mx-auto">
          {installerName} has been notified and will be in touch shortly
          to confirm install dates. If you don&rsquo;t hear from them
          within a couple of working days, drop them an email or give
          them a ring directly.
        </p>
      </div>
    );
  }

  if (status === "declined") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 sm:p-8 text-center">
        <XCircle className="w-8 h-8 text-slate-500 mx-auto mb-3" />
        <h2 className="text-lg font-semibold text-navy">
          You&rsquo;ve declined this quote
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-md mx-auto">
          {installerName} has been notified. If you change your mind,
          contact them directly and they can re-send a fresh quote.
        </p>
      </div>
    );
  }

  if (status === "draft") {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <p className="text-sm text-amber-900">
          This quote isn&rsquo;t ready yet. {installerName} is still
          editing it.
        </p>
      </div>
    );
  }

  // status === "sent" — show buttons
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-navy text-center">
        Ready to go ahead?
      </h2>
      <p className="text-sm text-slate-600 mt-1 mb-5 text-center max-w-md mx-auto leading-relaxed">
        Accepting tells {installerName} to get in touch and book your
        install. You can still ask questions either way using the
        contact details above.
      </p>

      {respondState.kind === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-red-900">{respondState.message}</p>
        </div>
      )}

      {!showDeclineForm ? (
        <div className="flex flex-col sm:flex-row gap-2 justify-center">
          <button
            type="button"
            onClick={onAccept}
            disabled={respondState.kind === "submitting"}
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
          >
            {respondState.kind === "submitting" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            Accept this quote
          </button>
          <button
            type="button"
            onClick={onShowDecline}
            disabled={respondState.kind === "submitting"}
            className="inline-flex items-center justify-center gap-1.5 h-12 px-6 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-60"
          >
            Not for me
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block text-sm font-semibold text-navy">
            Quick reason (optional — helps the installer learn)
          </label>
          <textarea
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="e.g. price was higher than expected, going with someone else, decided to wait, etc."
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 resize-y"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancelDecline}
              className="flex-1 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSubmitDecline}
              disabled={respondState.kind === "submitting"}
              className="flex-1 h-11 rounded-full bg-slate-700 hover:bg-slate-800 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-1.5"
            >
              {respondState.kind === "submitting" && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Decline this quote
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
