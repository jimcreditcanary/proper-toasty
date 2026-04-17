"use client";

import { useState, useCallback, useRef } from "react";
import {
  User,
  FileText,
  Upload,
  ArrowLeft,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useWizard, getSessionId } from "./context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  normaliseCompanyNumber,
  normaliseVatNumber,
  validateCompanyNumber,
  validateVatNumber,
} from "@/lib/validators";

const ACCEPTED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

function formatCurrency(value: string): string {
  const clean = value.replace(/[^0-9.]/g, "");
  const parts = clean.split(".");
  const intPart = parts[0].replace(/^0+(?=\d)/, "");
  const formatted = (intPart || "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  if (parts.length > 1) {
    return `${formatted}.${parts[1].slice(0, 2)}`;
  }
  return formatted === "0" && value === "" ? "" : formatted;
}

function parseCurrencyToRaw(value: string): string {
  return value.replace(/,/g, "");
}

function formatSortCode(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
}

export function Step5Details() {
  const { state, update, setStep } = useWizard();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isBusiness = state.payeeType === "business";

  // Live validation for the optional business identifiers
  const companyNumberCheck = validateCompanyNumber(state.companyNumber);
  const vatNumberCheck = validateVatNumber(state.vatNumber);

  // Minimum required fields to continue
  const nameField = isBusiness ? state.companyName : state.payeeName;
  const canContinue =
    nameField.trim().length > 0 &&
    state.sortCode.replace(/\D/g, "").length === 6 &&
    state.accountNumber.replace(/\D/g, "").length === 8 &&
    companyNumberCheck.ok &&
    vatNumberCheck.ok;

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        update({ extractionError: "Please upload a PDF, JPG, PNG, or WebP file." });
        return;
      }

      update({
        invoiceFile: file,
        extractionLoading: true,
        extractionError: null,
        extractedData: null,
      });

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("payeeType", state.payeeType ?? "unknown");
        try {
          formData.append("sessionId", getSessionId());
        } catch {
          /* SSR */
        }

        const res = await fetch("/api/extract-wizard", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Extraction failed");
        }

        const data = await res.json();
        const extracted = data.extracted;

        update({
          extractedData: extracted,
          extractionLoading: false,
          companyName: extracted.company_name ?? state.companyName,
          companyNumber: extracted.company_number ?? state.companyNumber,
          vatNumber: extracted.vat_number ?? state.vatNumber,
          payeeName: extracted.payee_name ?? state.payeeName,
          sortCode: extracted.sort_code
            ? formatSortCode(extracted.sort_code.replace(/\D/g, ""))
            : state.sortCode,
          accountNumber: extracted.account_number ?? state.accountNumber,
          paymentAmount: extracted.invoice_amount
            ? String(extracted.invoice_amount)
            : state.paymentAmount,
        });
      } catch (err) {
        update({
          extractionLoading: false,
          extractionError:
            err instanceof Error ? err.message : "Failed to extract invoice data",
        });
      }
    },
    [update, state]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileUpload(file);
    },
    [handleFileUpload]
  );

  const handleSortCodeChange = (value: string) => {
    update({ sortCode: formatSortCode(value) });
  };

  function handleBack() {
    const cat = state.purchaseCategory;
    if (cat === "vehicle" || cat === "something_else") {
      // Marketplace step was shown
      setStep(4);
    } else if (cat === "property") {
      // Property address lookup was shown (step 3, no marketplace)
      setStep(3);
    } else {
      // Tradesperson / service — straight back to category selection
      setStep(2);
    }
  }

  // Phase 1: Ask about invoice
  if (state.hasInvoice === null) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Have you received an invoice or payment request?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => update({ hasInvoice: true })}
            className="rounded-xl border-2 border-slate-200 p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer hover:border-coral/40"
          >
            <FileText className="h-8 w-8 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              Yes, I have an invoice
            </span>
          </button>

          <button
            type="button"
            onClick={() => update({ hasInvoice: false })}
            className="rounded-xl border-2 border-slate-200 p-6 flex flex-col items-center gap-3 transition-colors cursor-pointer hover:border-coral/40"
          >
            <User className="h-8 w-8 text-slate-600" />
            <span className="text-sm font-medium text-slate-700">
              No, I&apos;ll enter details manually
            </span>
          </button>
        </div>

        <div className="flex justify-start">
          <Button variant="ghost" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2: Invoice upload
  if (state.hasInvoice && !state.extractedData && !state.extractionLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">Upload your invoice</h2>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-12 flex flex-col items-center gap-4 cursor-pointer transition-colors ${
            dragOver
              ? "border-coral bg-coral/5"
              : "border-slate-300 hover:border-slate-400"
          }`}
        >
          <Upload className="h-10 w-10 text-slate-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-slate-700">
              Drag and drop your invoice here
            </p>
            <p className="text-xs text-slate-500 mt-1">PDF, JPG, PNG, or WebP</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {state.extractionError && (
          <p className="text-sm text-red-600">{state.extractionError}</p>
        )}

        <div className="flex justify-between">
          <Button variant="ghost" onClick={() => update({ hasInvoice: null })}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Phase 2b: Loading
  if (state.extractionLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-slate-900">
          Extracting invoice details&hellip;
        </h2>

        <div className="flex flex-col items-center gap-4 py-12">
          <Loader2 className="h-10 w-10 text-coral animate-spin" />
          <p className="text-sm text-slate-500">Analysing your invoice with AI</p>
        </div>
      </div>
    );
  }

  // Phase 3: Form
  const showExtractedBanner = state.hasInvoice && state.extractedData;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        {isBusiness ? "Business details" : "Payee details"}
      </h2>

      {showExtractedBanner && (
        <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">
            Details extracted from your invoice. Please review and correct if
            needed.
          </p>
        </div>
      )}

      {state.extractionError && (
        <p className="text-sm text-red-600">{state.extractionError}</p>
      )}

      <div className="space-y-4">
        {isBusiness ? (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Company Name</Label>
              <Input
                className="h-10 rounded-lg border-slate-200"
                value={state.companyName}
                onChange={(e) => update({ companyName: e.target.value })}
                placeholder="Acme Ltd"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">
                  Company Number <span className="text-slate-400">(optional)</span>
                </Label>
                <Input
                  className={`h-10 rounded-lg ${
                    companyNumberCheck.ok
                      ? "border-slate-200"
                      : "border-red-300 focus-visible:ring-red-300/30"
                  }`}
                  value={state.companyNumber}
                  onChange={(e) =>
                    update({ companyNumber: normaliseCompanyNumber(e.target.value) })
                  }
                  placeholder="12345678"
                  maxLength={8}
                  inputMode="text"
                  autoCapitalize="characters"
                />
                {!companyNumberCheck.ok && (
                  <p className="text-xs text-red-600">{companyNumberCheck.error}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-slate-700">
                  VAT Number <span className="text-slate-400">(optional)</span>
                </Label>
                <Input
                  className={`h-10 rounded-lg ${
                    vatNumberCheck.ok
                      ? "border-slate-200"
                      : "border-red-300 focus-visible:ring-red-300/30"
                  }`}
                  value={state.vatNumber}
                  onChange={(e) =>
                    update({ vatNumber: normaliseVatNumber(e.target.value) })
                  }
                  placeholder="GB123456789"
                  maxLength={14}
                  inputMode="text"
                  autoCapitalize="characters"
                />
                {!vatNumberCheck.ok && (
                  <p className="text-xs text-red-600">{vatNumberCheck.error}</p>
                )}
              </div>
            </div>

          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-sm text-slate-700">Payee Full Name</Label>
              <Input
                className="h-10 rounded-lg border-slate-200"
                value={state.payeeName}
                onChange={(e) => update({ payeeName: e.target.value })}
                placeholder="John Smith"
              />
            </div>
          </>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">Sort Code</Label>
            <Input
              className="h-10 rounded-lg border-slate-200"
              value={state.sortCode}
              onChange={(e) => handleSortCodeChange(e.target.value)}
              placeholder="XX-XX-XX"
              maxLength={8}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm text-slate-700">Account Number</Label>
            <Input
              className="h-10 rounded-lg border-slate-200"
              value={state.accountNumber}
              onChange={(e) =>
                update({
                  accountNumber: e.target.value.replace(/\D/g, "").slice(0, 8),
                })
              }
              placeholder="12345678"
              maxLength={8}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm text-slate-700">
            Payment Amount <span className="text-slate-400">(optional)</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
              &pound;
            </span>
            <Input
              className="h-10 rounded-lg border-slate-200 pl-7"
              type="text"
              inputMode="decimal"
              value={formatCurrency(state.paymentAmount)}
              onChange={(e) =>
                update({ paymentAmount: parseCurrencyToRaw(e.target.value) })
              }
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-2">
        <Button
          variant="ghost"
          onClick={() => {
            if (state.hasInvoice && state.extractedData) {
              update({ hasInvoice: null, extractedData: null });
            } else {
              update({ hasInvoice: null });
            }
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Button
          onClick={() => setStep(6)}
          disabled={!canContinue}
          className="bg-coral hover:bg-coral-dark text-white font-semibold"
        >
          Continue
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
