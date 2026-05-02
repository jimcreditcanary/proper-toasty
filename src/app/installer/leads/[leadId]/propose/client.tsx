"use client";

import Link from "next/link";

// Builder UI for an installer quote.
//
// Top-level: three category checkboxes (heat pump / solar / battery)
// — toggling one in/out adds the preset rows or strips them. Lines
// are grouped under category subheadings so the homeowner sees a
// coherent breakdown.
//
// BUS grant lives as a checkbox at the foot of the heat-pump section.
// When ticked, the grant line is added (-£7,500) but the totals
// engine caps the magnitude at the heat-pump install subtotal — so
// a £6k install never shows a negative total.
//
// Save / Send: identical pattern to the previous builder. Save first,
// then POST the send endpoint. Confirmation modal before fire.

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
  Info,
} from "lucide-react";
import {
  computeTotals,
  formatGbp,
  groupByCategory,
  presetsFor,
  HEAT_PUMP_PRESETS,
  SOLAR_PV_PRESETS,
  BATTERY_PRESETS,
  BUS_GRANT_PRESET,
  BUS_GRANT_CAP_PENCE,
  CATEGORY_LABELS,
  VAT_RATE_OPTIONS,
  type LineItem,
  type LineItemCategory,
  type LineItemPreset,
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

function presetToLine(p: LineItemPreset): LineItem {
  return {
    id: crypto.randomUUID(),
    description: p.description,
    quantity: p.quantity,
    unit_price_pence: p.unit_price_pence,
    category: p.category,
    is_bus_grant: p.is_bus_grant ?? false,
  };
}

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

  // Category visibility derived from line items — if any item with
  // a category is present, the section is "on".
  const grouped = useMemo(() => groupByCategory(lineItems), [lineItems]);
  const sectionOn = useMemo(
    () => ({
      heat_pump: grouped.heat_pump.length > 0,
      solar: grouped.solar.length > 0,
      battery: grouped.battery.length > 0,
    }),
    [grouped],
  );

  // BUS grant on/off is whether any heat-pump line has the flag.
  const busGrantOn = useMemo(
    () => lineItems.some((li) => li.is_bus_grant),
    [lineItems],
  );

  const totals = useMemo(
    () => computeTotals(lineItems, vatRateBps),
    [lineItems, vatRateBps],
  );

  // Toggle a category section on/off. Off → strip all items in that
  // category. On → seed presets if the section was previously empty.
  function toggleCategory(category: "heat_pump" | "solar" | "battery") {
    setLineItems((prev) => {
      const isOn = prev.some((li) => li.category === category);
      if (isOn) {
        return prev.filter((li) => li.category !== category);
      }
      const presets =
        category === "heat_pump"
          ? [...HEAT_PUMP_PRESETS, BUS_GRANT_PRESET]
          : category === "solar"
            ? SOLAR_PV_PRESETS
            : BATTERY_PRESETS;
      return [...prev, ...presets.map(presetToLine)];
    });
  }

  function toggleBusGrant() {
    setLineItems((prev) => {
      const has = prev.some((li) => li.is_bus_grant);
      if (has) {
        return prev.filter((li) => !li.is_bus_grant);
      }
      return [...prev, presetToLine(BUS_GRANT_PRESET)];
    });
  }

  function updateRow(id: string, patch: Partial<LineItem>) {
    setLineItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, ...patch } : row)),
    );
  }
  function addRow(category: LineItemCategory) {
    setLineItems((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: "",
        quantity: 1,
        unit_price_pence: 0,
        category,
        is_bus_grant: false,
      },
    ]);
  }
  function removeRow(id: string) {
    setLineItems((prev) => prev.filter((r) => r.id !== id));
  }

  function buildPayload() {
    return {
      installer_lead_id: leadId,
      line_items: lineItems.map((row) => ({
        id: row.id,
        description: row.description.trim(),
        quantity: Number.isFinite(row.quantity) ? row.quantity : 0,
        unit_price_pence: Math.round(row.unit_price_pence),
        category: row.category,
        is_bus_grant: row.is_bus_grant,
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
            ? "Quote sent (email pending)"
            : "Quote sent"}
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
            All quotes
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
      </div>

      {/* Category toggles */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
        <p className="text-sm font-semibold text-navy mb-1">
          What does this quote cover?
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Toggle systems on or off — preset line items load below for
          you to edit.
        </p>
        <div className="flex flex-wrap gap-2">
          {(["heat_pump", "solar", "battery"] as const).map((cat) => {
            const on = sectionOn[cat];
            return (
              <button
                key={cat}
                type="button"
                onClick={() => toggleCategory(cat)}
                className={`inline-flex items-center gap-2 h-10 px-4 rounded-full text-sm font-semibold transition-colors border ${
                  on
                    ? "bg-coral text-white border-coral hover:bg-coral-dark"
                    : "bg-white text-slate-600 border-slate-200 hover:border-coral/40"
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-4 h-4 rounded border ${
                    on
                      ? "bg-white border-white text-coral"
                      : "border-slate-300"
                  }`}
                >
                  {on && <CheckCircle2 className="w-3 h-3" strokeWidth={3} />}
                </span>
                {CATEGORY_LABELS[cat]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Per-category line items */}
      {(["heat_pump", "solar", "battery", "other"] as const).map((cat) => {
        const rows = grouped[cat];
        // Skip empty non-other sections (the toggles above are the
        // only way to turn them on). "Other" is always present so
        // installers can add bespoke rows.
        if (cat !== "other" && rows.length === 0) return null;
        return (
          <CategorySection
            key={cat}
            category={cat}
            rows={rows}
            appliedLineTotalsByRowId={mapAppliedTotals(lineItems, totals.appliedLineTotals)}
            onUpdate={updateRow}
            onAdd={() => addRow(cat)}
            onRemove={removeRow}
            busGrantOn={busGrantOn}
            onToggleBusGrant={toggleBusGrant}
            busGrantWasCapped={totals.busGrantWasCapped}
          />
        );
      })}

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
            click <strong>Send quote</strong>.
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
          Send quote
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

// ─── Category section ─────────────────────────────────────────────

function CategorySection({
  category,
  rows,
  appliedLineTotalsByRowId,
  onUpdate,
  onAdd,
  onRemove,
  busGrantOn,
  onToggleBusGrant,
  busGrantWasCapped,
}: {
  category: LineItemCategory;
  rows: LineItem[];
  appliedLineTotalsByRowId: Record<string, number>;
  onUpdate: (id: string, patch: Partial<LineItem>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
  busGrantOn: boolean;
  onToggleBusGrant: () => void;
  busGrantWasCapped: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-coral-pale text-coral-dark">
            <Receipt className="w-3.5 h-3.5" />
          </span>
          <h3 className="text-sm font-semibold text-navy">
            {CATEGORY_LABELS[category]}
          </h3>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add row
        </button>
      </div>

      {/* Header strip — sm+ only. Underscores in arbitrary value
          (Tailwind v4 spec) so the grid actually applies. */}
      <div className="hidden sm:grid grid-cols-[1fr_72px_120px_120px_36px] gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 px-1 pb-1">
        <span>Description</span>
        <span className="text-right">Qty</span>
        <span className="text-right">Unit price (£)</span>
        <span className="text-right">Line total</span>
        <span></span>
      </div>

      <div className="space-y-2">
        {rows.length === 0 && category === "other" && (
          <div className="rounded-lg border border-dashed border-slate-300 p-4 text-center">
            <p className="text-xs text-slate-500">
              Custom rows go here. Click <strong>Add row</strong> to add one.
            </p>
          </div>
        )}

        {rows.map((row) => {
          const applied = appliedLineTotalsByRowId[row.id] ?? 0;
          const raw = Math.round(row.quantity * row.unit_price_pence);
          const isCapped = row.is_bus_grant && applied !== raw;
          return (
            <div
              key={row.id}
              className="grid grid-cols-1 sm:grid-cols-[1fr_72px_120px_120px_36px] gap-2 items-start"
            >
              <input
                type="text"
                value={row.description}
                onChange={(e) =>
                  onUpdate(row.id, { description: e.target.value })
                }
                placeholder="Description"
                className={`h-10 px-3 rounded-lg border bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 ${
                  row.is_bus_grant ? "border-emerald-300 bg-emerald-50/40" : "border-slate-200"
                }`}
                readOnly={row.is_bus_grant}
              />
              <input
                type="number"
                inputMode="decimal"
                value={Number.isFinite(row.quantity) ? row.quantity : ""}
                onChange={(e) =>
                  onUpdate(row.id, {
                    quantity:
                      e.target.value === "" ? 0 : Number(e.target.value),
                  })
                }
                step="0.1"
                min="0"
                disabled={row.is_bus_grant}
                className="h-10 px-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 text-right focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:bg-slate-50 disabled:text-slate-400"
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
                  onUpdate(row.id, {
                    unit_price_pence:
                      e.target.value === ""
                        ? 0
                        : Math.round(Number(e.target.value) * 100),
                  })
                }
                step="0.01"
                placeholder="0.00"
                disabled={row.is_bus_grant}
                className="h-10 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 text-right focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20 disabled:bg-slate-50 disabled:text-slate-400"
              />
              <div
                className={`h-10 px-3 rounded-lg border text-sm font-semibold text-right flex items-center justify-end ${
                  applied < 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-slate-50 border-slate-200 text-navy"
                }`}
                title={
                  isCapped
                    ? `Capped from ${formatGbp(raw)} — install cost is below the £${BUS_GRANT_CAP_PENCE / 100} grant.`
                    : undefined
                }
              >
                {formatGbp(applied)}
              </div>
              <button
                type="button"
                onClick={() => onRemove(row.id)}
                className="h-10 w-9 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex items-center justify-center"
                aria-label="Remove line"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* BUS grant toggle + cap notice — heat pump section only */}
      {category === "heat_pump" && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={busGrantOn}
              onChange={onToggleBusGrant}
              className="mt-0.5 w-4 h-4 rounded border-slate-300 text-coral focus:ring-coral/30"
            />
            <span className="text-sm">
              <span className="font-semibold text-navy">
                Apply BUS grant
              </span>{" "}
              <span className="text-slate-500 text-xs">
                (£{(BUS_GRANT_CAP_PENCE / 100).toLocaleString("en-GB")} towards eligible heat pumps —
                Ofgem pays the installer direct)
              </span>
            </span>
          </label>
          {busGrantOn && busGrantWasCapped && (
            <div className="mt-2 ml-7 rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex items-start gap-2 text-xs">
              <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-amber-900 leading-relaxed">
                <strong>Grant capped at install cost.</strong> The BUS
                grant pays up to £
                {(BUS_GRANT_CAP_PENCE / 100).toLocaleString("en-GB")} or
                the cost of the install, whichever is lower. The
                homeowner won&rsquo;t end up with a negative bill.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function mapAppliedTotals(
  lineItems: LineItem[],
  appliedTotals: number[],
): Record<string, number> {
  const out: Record<string, number> = {};
  lineItems.forEach((li, i) => {
    out[li.id] = appliedTotals[i] ?? 0;
  });
  return out;
}
