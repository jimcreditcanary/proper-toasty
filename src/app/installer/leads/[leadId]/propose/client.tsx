"use client";

import Link from "next/link";

// Builder UI for an installer proposal.
//
// State machine:
//   1. Mount with `seed` line items (from preset or previous draft).
//   2. Edit freely — line items, cover message, VAT toggle.
//   3. "Save draft" — POSTs to /api/installer/proposals (or PATCHes
//      an existing draft). Establishes a backing row so we can use
//      its id for subsequent saves.
//   4. "Send proposal" — saves first then POSTs the send endpoint.
//      Confirmation modal so the installer can review the headline
//      total before firing the email.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Send,
  Loader2,
  Save,
  AlertCircle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import {
  computeTotals,
  formatGbp,
  VAT_RATE_OPTIONS,
  type LineItem,
} from "@/lib/proposals/schema";

interface LeadContext {
  contactName: string | null;
  propertyAddress: string | null;
  propertyPostcode: string | null;
  wantsHeatPump: boolean;
  wantsSolar: boolean;
  wantsBattery: boolean;
}

interface ExistingDraft {
  id: string;
  status: "draft" | "sent" | "accepted" | "declined";
  line_items: LineItem[];
  cover_message: string | null;
  vat_rate_bps: number;
  homeowner_token: string;
}

interface Props {
  leadId: string;
  leadContext: LeadContext;
  existingDraft: ExistingDraft | null;
  seed: {
    lineItems: LineItem[];
    coverMessage: string | null;
    vatRateBps: number;
  };
}

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "sending" }
  | { kind: "error"; message: string }
  | { kind: "saved" }
  | { kind: "sent"; proposalUrl: string; emailSkipped: boolean };

export function ProposalBuilderClient({
  leadId,
  leadContext,
  existingDraft,
  seed,
}: Props) {
  const router = useRouter();

  const [proposalId, setProposalId] = useState<string | null>(
    existingDraft?.id ?? null,
  );
  const [lineItems, setLineItems] = useState<LineItem[]>(seed.lineItems);
  const [coverMessage, setCoverMessage] = useState<string>(
    seed.coverMessage ?? "",
  );
  const [vatRateBps, setVatRateBps] = useState<number>(seed.vatRateBps);
  const [save, setSave] = useState<SaveState>({ kind: "idle" });
  const [showConfirm, setShowConfirm] = useState(false);

  const totals = useMemo(
    () => computeTotals(lineItems, vatRateBps),
    [lineItems, vatRateBps],
  );

  function updateRow(idx: number, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, ...patch } : row)),
    );
  }
  function addRow() {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price_pence: 0,
      },
    ]);
  }
  function removeRow(idx: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Build the API payload. `quantity` ends up coming from the input
  // as a string-coerced number; we sanitise once here so the
  // server-side zod parse doesn't choke on NaN.
  function buildPayload() {
    return {
      installer_lead_id: leadId,
      line_items: lineItems.map((row) => ({
        id: row.id,
        description: row.description.trim(),
        quantity: Number.isFinite(row.quantity) ? row.quantity : 0,
        unit_price_pence: Math.round(row.unit_price_pence),
      })),
      cover_message: coverMessage.trim() || null,
      vat_rate_bps: vatRateBps,
    };
  }

  async function persist(): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
    const payload = buildPayload();
    if (proposalId) {
      const res = await fetch(`/api/installer/proposals/${proposalId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        return { ok: false, error: j.error ?? "Save failed" };
      }
      return { ok: true, id: proposalId };
    }
    const res = await fetch("/api/installer/proposals", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok || !j.id) {
      return { ok: false, error: j.error ?? "Could not create draft" };
    }
    setProposalId(j.id);
    return { ok: true, id: j.id };
  }

  async function onSaveDraft() {
    if (!validate()) return;
    setSave({ kind: "saving" });
    const result = await persist();
    if (!result.ok) {
      setSave({ kind: "error", message: result.error });
      return;
    }
    setSave({ kind: "saved" });
  }

  async function onSendProposal() {
    if (!validate()) return;
    setSave({ kind: "sending" });
    setShowConfirm(false);

    const persisted = await persist();
    if (!persisted.ok) {
      setSave({ kind: "error", message: persisted.error });
      return;
    }

    const res = await fetch(
      `/api/installer/proposals/${persisted.id}/send`,
      { method: "POST" },
    );
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSave({ kind: "error", message: j.error ?? "Send failed" });
      return;
    }

    setSave({
      kind: "sent",
      proposalUrl: j.proposalUrl,
      emailSkipped: j.emailSkipped === true,
    });
    // Refresh the server tree so the inbox + reports list pick up
    // the new state if the installer navigates away.
    router.refresh();
  }

  function validate(): boolean {
    if (lineItems.length === 0) {
      setSave({
        kind: "error",
        message: "Add at least one line item before saving.",
      });
      return false;
    }
    const blank = lineItems.findIndex((r) => !r.description.trim());
    if (blank !== -1) {
      setSave({
        kind: "error",
        message: `Line ${blank + 1} needs a description.`,
      });
      return false;
    }
    if (totals.totalPence <= 0) {
      setSave({
        kind: "error",
        message: "Total is zero — add prices to your line items.",
      });
      return false;
    }
    return true;
  }

  // ── Sent confirmation view ────────────────────────────────────
  if (save.kind === "sent") {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8 text-center">
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 mb-3">
          <CheckCircle2 className="w-6 h-6" />
        </span>
        <h2 className="text-xl font-semibold text-emerald-900">
          {save.emailSkipped
            ? "Proposal sent (email pending)"
            : "Proposal sent"}
        </h2>
        <p className="text-sm text-emerald-900 mt-2 leading-relaxed max-w-md mx-auto">
          {save.emailSkipped
            ? "Saved successfully but the email layer isn't configured in this environment. Share the link below directly with the homeowner."
            : `${leadContext.contactName ?? "The homeowner"} just received an email with the link to review and accept your quote.`}
        </p>
        <div className="bg-white border border-emerald-200 rounded-xl p-3 mt-5 max-w-lg mx-auto">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-1.5">
            Homeowner link
          </p>
          <p className="text-xs font-mono text-emerald-900 break-all">
            {save.proposalUrl}
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mt-6">
          <a
            href={save.proposalUrl}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Preview as homeowner →
          </a>
          <Link
            href="/installer/proposals"
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-colors"
          >
            All proposals
          </Link>
        </div>
      </div>
    );
  }

  // ── Builder ────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Lead context strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
          Quoting for
        </p>
        <p className="text-sm font-semibold text-navy">
          {leadContext.contactName ?? "Homeowner"}
        </p>
        {leadContext.propertyAddress && (
          <p className="text-xs text-slate-600 mt-0.5">
            {leadContext.propertyAddress}
            {leadContext.propertyPostcode && ` · ${leadContext.propertyPostcode}`}
          </p>
        )}
        <p className="text-xs text-slate-500 mt-2">
          Asked about:{" "}
          <span className="font-medium text-slate-700">
            {[
              leadContext.wantsHeatPump && "Heat pump",
              leadContext.wantsSolar && "Solar PV",
              leadContext.wantsBattery && "Battery",
            ]
              .filter(Boolean)
              .join(" + ") || "Energy upgrades"}
          </span>
        </p>
      </div>

      {/* Line items editor */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Receipt className="w-4 h-4 text-slate-500" />
              Line items
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Edit the presets or add your own. Use a negative price
              for grants and discounts.
            </p>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add row
          </button>
        </div>

        <div className="space-y-2">
          {/* Header strip — only on sm+ */}
          <div className="hidden sm:grid grid-cols-[1fr,80px,120px,120px,40px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price (£)</span>
            <span className="text-right">Line total</span>
            <span></span>
          </div>

          {lineItems.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center">
              <p className="text-xs text-slate-500">
                No line items yet. Click <strong>Add row</strong> to start.
              </p>
            </div>
          )}

          {lineItems.map((row, idx) => {
            const linePence = Math.round(row.quantity * row.unit_price_pence);
            return (
              <div
                key={row.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr,80px,120px,120px,40px] gap-2 items-start"
              >
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) =>
                    updateRow(idx, { description: e.target.value })
                  }
                  placeholder="Description"
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={Number.isFinite(row.quantity) ? row.quantity : ""}
                  onChange={(e) =>
                    updateRow(idx, {
                      quantity: e.target.value === "" ? 0 : Number(e.target.value),
                    })
                  }
                  step="0.1"
                  min="0"
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 text-right focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
                <input
                  type="number"
                  inputMode="decimal"
                  value={
                    row.unit_price_pence === 0
                      ? ""
                      : (row.unit_price_pence / 100).toString()
                  }
                  onChange={(e) =>
                    updateRow(idx, {
                      unit_price_pence:
                        e.target.value === ""
                          ? 0
                          : Math.round(Number(e.target.value) * 100),
                    })
                  }
                  step="0.01"
                  placeholder="0.00"
                  className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 text-right focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
                <div className="h-10 px-3 rounded-lg bg-slate-50 border border-slate-200 text-sm font-semibold text-navy text-right flex items-center justify-end">
                  {formatGbp(linePence)}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  className="h-10 w-10 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                  aria-label="Remove line"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* VAT + totals strip */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
              VAT rate
            </label>
            <select
              value={vatRateBps}
              onChange={(e) => setVatRateBps(Number(e.target.value))}
              className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 w-full sm:w-auto"
            >
              {VAT_RATE_OPTIONS.map((opt) => (
                <option key={opt.bps} value={opt.bps}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed max-w-xs">
              UK heat pumps + solar PV + battery are zero-rated for
              VAT until 2027 under the green tech relief.
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">
              Subtotal{" "}
              <span className="text-slate-900 font-semibold ml-1">
                {formatGbp(totals.subtotalPence)}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              VAT{" "}
              <span className="text-slate-900 font-semibold ml-1">
                {formatGbp(totals.vatPence)}
              </span>
            </div>
            <div className="text-2xl font-bold text-navy mt-2 leading-none">
              {formatGbp(totals.totalPence)}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-500 mt-1">
              Total
            </div>
          </div>
        </div>
      </div>

      {/* Cover message */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <label className="text-sm font-semibold text-navy block mb-2">
          Cover message{" "}
          <span className="text-slate-400 font-normal text-xs">
            (optional)
          </span>
        </label>
        <textarea
          value={coverMessage}
          onChange={(e) => setCoverMessage(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder={`Hi ${leadContext.contactName?.split(" ")[0] ?? "there"}, here's the quote we discussed at the visit. Let me know if you have any questions.`}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 resize-y"
        />
        <p className="text-[10px] text-slate-400 mt-1.5 text-right">
          {coverMessage.length} / 2000
        </p>
      </div>

      {/* Status / actions */}
      {save.kind === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-red-900">{save.message}</p>
        </div>
      )}
      {save.kind === "saved" && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-start gap-2 text-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="text-emerald-900">
            Draft saved. The homeowner won&rsquo;t see anything until you
            click <strong>Send proposal</strong>.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 sticky bottom-3 bg-white/85 backdrop-blur-sm border border-slate-200 rounded-2xl p-3 shadow-sm">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={save.kind === "saving" || save.kind === "sending"}
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {save.kind === "saving" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save draft
        </button>
        <div className="flex-1 text-xs text-slate-500 text-center">
          {save.kind === "idle" &&
            (proposalId ? "Editing existing draft" : "Not saved yet")}
        </div>
        <button
          type="button"
          onClick={() => {
            if (validate()) setShowConfirm(true);
          }}
          disabled={save.kind === "saving" || save.kind === "sending"}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {save.kind === "sending" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send proposal
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-navy">
              Send this quote?
            </h3>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {leadContext.contactName ?? "The homeowner"} will be
              emailed a link to review and accept the quote.
            </p>
            <div className="bg-slate-50 rounded-xl p-3 mt-4 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>{lineItems.length} line items</span>
                <span>{formatGbp(totals.subtotalPence)}</span>
              </div>
              <div className="flex justify-between text-slate-600 mt-1">
                <span>{vatRateBps === 0 ? "0% VAT" : "20% VAT"}</span>
                <span>{formatGbp(totals.vatPence)}</span>
              </div>
              <div className="flex justify-between text-navy font-bold text-lg mt-2 pt-2 border-t border-slate-200">
                <span>Total</span>
                <span>{formatGbp(totals.totalPence)}</span>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
              >
                Back to edit
              </button>
              <button
                type="button"
                onClick={onSendProposal}
                className="flex-1 h-11 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors inline-flex items-center justify-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
