"use client";

// Homeowner-facing quote viewer.
//
// Loads via /api/proposals/[token]/load, renders the quote with
// accept/decline buttons and a message form. After accept/decline
// the page swaps to a confirmation state instead of redirecting
// (so refresh-friendly).
//
// Lines are grouped by category (heat pump / solar / battery /
// other) with subheadings. The BUS grant deduction shows under the
// heat pump block and reflects the capped value if applicable.

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  PhoneCall,
  Send,
} from "lucide-react";
import { Logo } from "@/components/logo";
import {
  formatGbp,
  groupByCategory,
  computeTotals,
  CATEGORY_LABELS,
  type LineItem,
  type LineItemCategory,
} from "@/lib/proposals/schema";
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
  homeowner_messages: Json;
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

interface HomeownerMessage {
  id: string;
  body: string;
  sent_at: string;
  channel?: "message" | "callback";
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

type MessageState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent" }
  | { kind: "error"; message: string };

interface Props {
  token: string;
}

export function ProposalViewClient({ token }: Props) {
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [respond, setRespond] = useState<RespondState>({ kind: "idle" });
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [messageState, setMessageState] = useState<MessageState>({ kind: "idle" });
  const [showMessageForm, setShowMessageForm] = useState(false);
  const [messageBody, setMessageBody] = useState("");
  const [messageChannel, setMessageChannel] = useState<"message" | "callback">("message");

  // Hooks must run unconditionally — derive lineItems/messages/totals
  // from `state` at the top of the component, with an empty fallback
  // when the proposal hasn't loaded yet, so the early returns below
  // don't reorder the hook list across renders.
  const proposalLineItemsRaw =
    state.kind === "ok" ? state.proposal.line_items : null;
  const proposalMessagesRaw =
    state.kind === "ok" ? state.proposal.homeowner_messages : null;
  const vatRateBps =
    state.kind === "ok" ? state.proposal.vat_rate_bps : 0;
  const lineItems = useMemo(
    () => parseLineItems(proposalLineItemsRaw),
    [proposalLineItemsRaw],
  );
  const messages = useMemo(
    () => parseMessages(proposalMessagesRaw),
    [proposalMessagesRaw],
  );
  const grouped = useMemo(() => groupByCategory(lineItems), [lineItems]);
  const totals = useMemo(() => {
    const t = computeTotals(lineItems, vatRateBps);
    const byId: Record<string, number> = {};
    lineItems.forEach((li, i) => {
      byId[li.id] = t.appliedLineTotals[i] ?? 0;
    });
    return { ...t, appliedLineTotalsByRowId: byId };
  }, [lineItems, vatRateBps]);

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

  async function submitMessage() {
    if (!messageBody.trim()) return;
    setMessageState({ kind: "sending" });
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(token)}/message`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          body: messageBody.trim(),
          channel: messageChannel,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessageState({
          kind: "error",
          message: j.error ?? "Could not send your message",
        });
        return;
      }
      // Append the new message into local state so the receipt shows.
      setState((s) => {
        if (s.kind !== "ok") return s;
        const existing = parseMessages(s.proposal.homeowner_messages);
        const updated = [...existing, j.message as HomeownerMessage];
        return {
          ...s,
          proposal: {
            ...s.proposal,
            homeowner_messages: updated as unknown as Json,
          },
        };
      });
      setMessageBody("");
      setMessageState({ kind: "sent" });
      setShowMessageForm(false);
    } catch (e) {
      setMessageState({
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
  // (lineItems, messages, grouped, totals computed at the top via
  // useMemo — referenced directly here.)

  const vatLabel =
    proposal.vat_rate_bps === 0 ? "0% VAT (zero-rated)" : "incl. 20% VAT";

  const installerName = installer?.company_name ?? "your installer";

  return (
    <div className="space-y-5">
      {/* Brand strip */}
      <div className="flex items-center justify-between">
        <a href="https://propertoasty.com" className="block">
          <Logo size="sm" variant="light" />
        </a>
        <span className="text-xs text-slate-500 text-right">
          Quote from{" "}
          <strong className="text-navy">{installerName}</strong>
        </span>
      </div>

      {/* Quote header card */}
      <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-wider text-coral mb-2">
          Quote for {lead?.contact_name ?? "you"}
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold text-navy leading-tight">
          {installerName} sent you a written quote
        </h1>
        {lead?.property_address && (
          <p className="text-sm text-slate-600 mt-2">
            {lead.property_address}
            {lead.property_postcode && ` · ${lead.property_postcode}`}
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
            Note from {installerName}
          </p>
          <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
            {proposal.cover_message}
          </p>
        </div>
      )}

      {/* Grouped line items */}
      <div className="rounded-2xl border border-[var(--border)] bg-white overflow-hidden">
        <div className="px-5 sm:px-6 py-3 border-b border-[var(--border)] bg-slate-50">
          <h2 className="text-sm font-semibold text-navy">
            What&rsquo;s included
          </h2>
        </div>
        {(["heat_pump", "solar", "battery", "other"] as const).map((cat) => {
          const rows = grouped[cat];
          if (rows.length === 0) return null;
          return (
            <CategoryBlock
              key={cat}
              category={cat}
              rows={rows}
              appliedTotals={totals.appliedLineTotalsByRowId}
            />
          );
        })}
        {/* Totals footer */}
        <div className="px-5 sm:px-6 py-3 border-t border-[var(--border)] bg-slate-50 text-sm">
          <div className="flex justify-between text-slate-600">
            <span>Subtotal</span>
            <span className="font-semibold text-slate-900">
              {formatGbp(proposal.subtotal_pence)}
            </span>
          </div>
          <div className="flex justify-between text-slate-600 mt-1">
            <span>VAT ({proposal.vat_rate_bps === 0 ? "0%" : "20%"})</span>
            <span className="font-semibold text-slate-900">
              {formatGbp(proposal.vat_pence)}
            </span>
          </div>
        </div>
        <div className="px-5 sm:px-6 py-4 bg-coral-pale border-t-2 border-coral/30 flex justify-between items-center">
          <span className="text-sm font-bold text-navy">Total</span>
          <span className="text-xl font-bold text-navy">
            {formatGbp(proposal.total_pence)}
          </span>
        </div>
      </div>

      {/* Installer contact card */}
      {installer && (installer.email || installer.telephone || installer.website) && (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Got questions?
          </p>
          <p className="text-sm text-slate-700 mb-3 leading-relaxed">
            Reach{" "}
            <strong className="text-navy">{installer.company_name}</strong>
            {" "}directly:
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

      {/* Action panel — accept / decline / responded */}
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
        installerName={installerName}
      />

      {/* Message / callback section */}
      {proposal.status !== "draft" && (
        <MessagePanel
          installerName={installerName}
          messages={messages}
          messageState={messageState}
          showForm={showMessageForm}
          messageBody={messageBody}
          messageChannel={messageChannel}
          onShowForm={(channel) => {
            setMessageChannel(channel);
            setShowMessageForm(true);
            setMessageState({ kind: "idle" });
          }}
          onCancel={() => setShowMessageForm(false)}
          onChangeBody={setMessageBody}
          onSubmit={submitMessage}
        />
      )}

      <div className="text-center pt-2">
        <a href="https://propertoasty.com" className="inline-block">
          <Logo size="sm" variant="light" className="mx-auto opacity-80" />
        </a>
        <p className="text-[11px] text-slate-400 mt-2">
          Quote sent via Propertoasty
        </p>
      </div>
    </div>
  );
}

// ─── Subviews ─────────────────────────────────────────────────────

function CategoryBlock({
  category,
  rows,
  appliedTotals,
}: {
  category: LineItemCategory;
  rows: LineItem[];
  appliedTotals: Record<string, number>;
}) {
  return (
    <div>
      <div className="px-5 sm:px-6 py-2 border-b border-[var(--border)] bg-white">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          {CATEGORY_LABELS[category]}
        </p>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {rows.map((row) => {
            const applied = appliedTotals[row.id] ?? 0;
            return (
              <tr
                key={row.id}
                className="border-b border-[var(--border)] last:border-b-0"
              >
                <td className="px-5 sm:px-6 py-3 text-slate-800">
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <span className={row.is_bus_grant ? "font-medium text-emerald-800" : ""}>
                      {row.description}
                    </span>
                    <span className="text-xs text-slate-500">
                      {row.is_bus_grant
                        ? "Paid by Ofgem to installer"
                        : `${row.quantity} × ${formatGbp(row.unit_price_pence)}`}
                    </span>
                  </div>
                </td>
                <td className={`px-5 sm:px-6 py-3 text-right font-semibold whitespace-nowrap ${
                  applied < 0 ? "text-emerald-700" : "text-navy"
                }`}>
                  {formatGbp(applied)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
          {installerName}{" "}has been notified and will be in touch
          shortly to confirm install dates. If you don&rsquo;t hear
          from them within a couple of working days, drop them an
          email or give them a ring directly.
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
          {installerName}{" "}has been notified. If you change your
          mind, contact them directly and they can re-send a fresh
          quote.
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

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-navy text-center">
        Ready to go ahead?
      </h2>
      <p className="text-sm text-slate-600 mt-1 mb-5 text-center max-w-md mx-auto leading-relaxed">
        Accepting tells {installerName} to get in touch and book your
        install. You can ask questions either way using the buttons
        below.
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

function MessagePanel(props: {
  installerName: string;
  messages: HomeownerMessage[];
  messageState: MessageState;
  showForm: boolean;
  messageBody: string;
  messageChannel: "message" | "callback";
  onShowForm: (channel: "message" | "callback") => void;
  onCancel: () => void;
  onChangeBody: (s: string) => void;
  onSubmit: () => void;
}) {
  const {
    installerName,
    messages,
    messageState,
    showForm,
    messageBody,
    messageChannel,
    onShowForm,
    onCancel,
    onChangeBody,
    onSubmit,
  } = props;
  const isCallback = messageChannel === "callback";
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-sky-100 text-sky-700 shrink-0">
          <MessageCircle className="w-4 h-4" />
        </span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-navy">
            Got a question or want to chat?
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Send a message or request a callback — {installerName} gets
            it straight to their inbox.
          </p>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="mt-4 space-y-2">
          {messages.map((m) => (
            <div
              key={m.id}
              className="rounded-lg bg-sky-50 border border-sky-100 p-3 text-xs"
            >
              <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 mb-1">
                {m.channel === "callback" ? "Callback requested" : "Sent"} ·{" "}
                {formatRelative(m.sent_at)}
              </p>
              <p className="text-sky-900 whitespace-pre-wrap leading-relaxed">
                {m.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {!showForm && messageState.kind !== "sent" && (
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            type="button"
            onClick={() => onShowForm("message")}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Send a message
          </button>
          <button
            type="button"
            onClick={() => onShowForm("callback")}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-sky-300 hover:bg-sky-50 text-sky-800 font-semibold text-sm transition-colors"
          >
            <PhoneCall className="w-4 h-4" />
            Request a callback
          </button>
        </div>
      )}

      {messageState.kind === "sent" && !showForm && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-emerald-900 leading-relaxed">
            Sent. {installerName} will be in touch shortly.
          </p>
        </div>
      )}

      {showForm && (
        <div className="mt-4 space-y-3">
          <label className="block text-sm font-semibold text-navy">
            {isCallback ? "Best time to reach you (and a quick note)" : "Your message"}
          </label>
          <textarea
            value={messageBody}
            onChange={(e) => onChangeBody(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={
              isCallback
                ? "e.g. Best to call after 6pm weekdays — would love to chat through the heat pump options."
                : "e.g. Could you break down the radiator changes? Want to understand which rooms need work."
            }
            className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 resize-y"
          />
          {messageState.kind === "error" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 flex items-start gap-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 text-red-700 shrink-0 mt-0.5" />
              <p className="text-red-900">{messageState.message}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={messageState.kind === "sending"}
              className="flex-1 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={messageState.kind === "sending" || !messageBody.trim()}
              className="flex-1 h-11 rounded-full bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-wait inline-flex items-center justify-center gap-1.5"
            >
              {messageState.kind === "sending" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isCallback ? "Request callback" : "Send message"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────

function parseLineItems(raw: Json | null): LineItem[] {
  if (raw == null) return [];
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
      category?: unknown;
      is_bus_grant?: unknown;
    };
    const validCats = ["heat_pump", "solar", "battery", "other"] as const;
    const cat =
      typeof r.category === "string" &&
      (validCats as readonly string[]).includes(r.category)
        ? (r.category as (typeof validCats)[number])
        : "other";
    return [
      {
        id: typeof r.id === "string" ? r.id : `row-${Math.random()}`,
        description: r.description,
        quantity: r.quantity,
        unit_price_pence: r.unit_price_pence,
        category: cat,
        is_bus_grant: r.is_bus_grant === true,
      },
    ];
  });
}

function parseMessages(raw: Json | null): HomeownerMessage[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return [];
  return (raw as unknown[]).flatMap((row) => {
    if (
      !row ||
      typeof row !== "object" ||
      typeof (row as { id?: unknown }).id !== "string" ||
      typeof (row as { body?: unknown }).body !== "string" ||
      typeof (row as { sent_at?: unknown }).sent_at !== "string"
    ) {
      return [];
    }
    const r = row as { id: string; body: string; sent_at: string; channel?: unknown };
    return [
      {
        id: r.id,
        body: r.body,
        sent_at: r.sent_at,
        channel:
          r.channel === "callback" || r.channel === "message"
            ? r.channel
            : undefined,
      },
    ];
  });
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / (1000 * 60));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
