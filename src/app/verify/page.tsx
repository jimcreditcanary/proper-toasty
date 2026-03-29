"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  X,
  ArrowLeft,
  ArrowRight,
  Upload,
  FileText,
  User,
  Building2,
  Loader2,
  CheckCircle2,
} from "lucide-react";

type WizardData = {
  isMarketplace: boolean | null;
  marketplaceUrl: string;
  marketplaceItemTitle: string | null;
  marketplaceListedPrice: number | null;
  valuationMin: number | null;
  valuationMax: number | null;
  valuationSummary: string | null;
  marketplaceConfidence: string | null;
  marketplaceSources: string[];
  hasInvoice: boolean | null;
  invoiceFile: File | null;
  payeeType: "personal" | "business";
  payeeName: string;
  companyNameInput: string;
  sortCode: string;
  accountNumber: string;
  vatNumberInput: string;
  companyNumberInput: string;
  invoiceAmount: string;
};

const initialData: WizardData = {
  isMarketplace: null,
  marketplaceUrl: "",
  marketplaceItemTitle: null,
  marketplaceListedPrice: null,
  valuationMin: null,
  valuationMax: null,
  valuationSummary: null,
  marketplaceConfidence: null,
  marketplaceSources: [],
  hasInvoice: null,
  invoiceFile: null,
  payeeType: "business",
  payeeName: "",
  companyNameInput: "",
  sortCode: "",
  accountNumber: "",
  vatNumberInput: "",
  companyNumberInput: "",
  invoiceAmount: "",
};

function ProgressBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">
          Step {step} of {total}
        </span>
        <span className="text-sm text-muted-foreground">
          {Math.round((step / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div
          className="h-1.5 rounded-full bg-primary transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [marketplaceLookupLoading, setMarketplaceLookupLoading] =
    useState(false);
  const [marketplaceLookupDone, setMarketplaceLookupDone] = useState(false);
  const [marketplaceLookupError, setMarketplaceLookupError] = useState<
    string | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const update = useCallback(
    (partial: Partial<WizardData>) =>
      setData((prev) => ({ ...prev, ...partial })),
    []
  );

  // Determine the total steps based on flow
  function getTotalSteps() {
    // Step 1: marketplace check
    // Step 2a: marketplace URL (if yes) OR step 2: invoice check (if no)
    // Step 3: invoice check (if marketplace) OR upload/manual
    // Step 4: upload/manual
    // Step 5: review
    let count = 1; // marketplace check
    if (data.isMarketplace) count++; // marketplace URL
    count++; // invoice check
    count++; // upload or manual entry
    count++; // review
    return count;
  }

  function getCurrentStepNumber() {
    // Maps internal step to display step
    let display = 1;
    if (step === 1) return display;
    if (data.isMarketplace && step === 2) return 2;
    if (step === 3) return data.isMarketplace ? 3 : 2;
    if (step === 4) return data.isMarketplace ? 4 : 3;
    if (step === 5) return data.isMarketplace ? 5 : 4;
    return display;
  }

  // ── Marketplace lookup ────────────────────────────────────────────
  const marketplaceLookupRef = React.useRef(false);
  async function handleMarketplaceLookup() {
    if (marketplaceLookupRef.current) return; // prevent duplicate calls
    marketplaceLookupRef.current = true;
    setMarketplaceLookupLoading(true);
    setMarketplaceLookupError(null);
    try {
      // Read URL from the input element directly to get the latest value
      const urlInput = document.getElementById("marketplace-url") as HTMLInputElement | null;
      const url = urlInput?.value || data.marketplaceUrl;
      if (!url.trim()) return;
      const res = await fetch("/api/marketplace-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingUrl: url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      update({
        marketplaceItemTitle: json.itemTitle,
        marketplaceListedPrice: json.listedPrice,
        valuationMin: json.valuationMin,
        valuationMax: json.valuationMax,
        valuationSummary: json.valuationSummary,
        marketplaceConfidence: json.confidence,
        marketplaceSources: json.sources ?? [],
      });
      setMarketplaceLookupDone(true);
    } catch (err) {
      setMarketplaceLookupError(
        err instanceof Error ? err.message : "Lookup failed"
      );
    } finally {
      setMarketplaceLookupLoading(false);
      marketplaceLookupRef.current = false;
    }
  }

  // ── File drop handlers ────────────────────────────────────────────
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) update({ invoiceFile: droppedFile });
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (selected) update({ invoiceFile: selected });
  }

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSubmit() {
    setSubmitting(true);
    try {
      const fd = new FormData();

      // Determine flow type
      let flowType = "manual";
      if (data.isMarketplace) flowType = "marketplace";
      else if (data.hasInvoice) flowType = "invoice";
      fd.append("flowType", flowType);

      // Marketplace fields
      if (data.isMarketplace) {
        fd.append("marketplaceUrl", data.marketplaceUrl);
        if (data.marketplaceItemTitle)
          fd.append("marketplaceItemTitle", data.marketplaceItemTitle);
        if (data.marketplaceListedPrice != null)
          fd.append(
            "marketplaceListedPrice",
            String(data.marketplaceListedPrice)
          );
        if (data.valuationMin != null)
          fd.append("valuationMin", String(data.valuationMin));
        if (data.valuationMax != null)
          fd.append("valuationMax", String(data.valuationMax));
        if (data.valuationSummary)
          fd.append("valuationSummary", data.valuationSummary);
      }

      // Invoice file
      if (data.invoiceFile) {
        fd.append("file", data.invoiceFile);
      }

      // Manual fields
      fd.append("payeeType", data.payeeType);
      if (data.payeeName) fd.append("payeeName", data.payeeName);
      if (data.companyNameInput)
        fd.append("companyNameInput", data.companyNameInput);
      if (data.sortCode) fd.append("sortCode", data.sortCode);
      if (data.accountNumber) fd.append("accountNumber", data.accountNumber);
      if (data.vatNumberInput)
        fd.append("vatNumberInput", data.vatNumberInput);
      if (data.companyNumberInput)
        fd.append("companyNumberInput", data.companyNumberInput);
      if (data.invoiceAmount) fd.append("invoiceAmount", data.invoiceAmount);

      const res = await fetch("/api/verify-full", {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Verification failed");

      router.push(`/dashboard/results/${json.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Navigation ────────────────────────────────────────────────────
  function goNext() {
    if (step === 1) {
      if (data.isMarketplace) setStep(2);
      else setStep(3);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      if (data.hasInvoice) setStep(4); // upload
      else setStep(4); // manual entry (same step, different content)
    } else if (step === 4) {
      setStep(5);
    }
  }

  function goBack() {
    if (step === 5) setStep(4);
    else if (step === 4) setStep(3);
    else if (step === 3) {
      if (data.isMarketplace) setStep(2);
      else setStep(1);
    } else if (step === 2) setStep(1);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold mb-1">New verification</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Verify who you are paying before sending money.
      </p>

      <ProgressBar step={getCurrentStepNumber()} total={getTotalSteps()} />

      {/* ── Step 1: Marketplace check ──────────────────────────── */}
      {step === 1 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">
            Is this a Facebook Marketplace purchase?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            We can check the listing price against market value to spot scams.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => {
                update({ isMarketplace: true });
                setStep(2);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.isMarketplace === true
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <ShoppingCart className="size-8 text-primary" />
              <span className="text-sm font-medium">Yes, Marketplace</span>
            </button>
            <button
              type="button"
              onClick={() => {
                update({ isMarketplace: false });
                setStep(3);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.isMarketplace === false
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <X className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">No</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Marketplace URL ──────────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Marketplace listing</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Paste the Facebook Marketplace URL so we can check the price.
          </p>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marketplace-url">Listing URL</Label>
              <Input
                id="marketplace-url"
                placeholder="https://www.facebook.com/marketplace/item/..."
                value={data.marketplaceUrl}
                onChange={(e) => {
                  const url = e.target.value;
                  update({ marketplaceUrl: url });
                  // Auto-trigger lookup when a valid marketplace URL is pasted
                  if (
                    url.includes("facebook.com/marketplace") &&
                    !marketplaceLookupLoading &&
                    !marketplaceLookupDone
                  ) {
                    setTimeout(() => handleMarketplaceLookup(), 500);
                  }
                }}
                onBlur={() => {
                  // Fallback: trigger on blur if URL is valid but lookup hasn't run
                  if (
                    data.marketplaceUrl.includes("facebook.com/marketplace") &&
                    !marketplaceLookupLoading &&
                    !marketplaceLookupDone
                  ) {
                    handleMarketplaceLookup();
                  }
                }}
                onPaste={(e) => {
                  // Prevent default so onChange doesn't double-append
                  e.preventDefault();
                  const pasted = e.clipboardData.getData("text").trim();
                  update({ marketplaceUrl: pasted });
                  // Update the input element directly to prevent onChange from using stale value
                  const input = e.target as HTMLInputElement;
                  input.value = pasted;
                  if (pasted.includes("facebook.com/marketplace")) {
                    setTimeout(() => handleMarketplaceLookup(), 500);
                  }
                }}
              />
              {marketplaceLookupLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Looking up listing and market value...
                </div>
              )}
              {!marketplaceLookupLoading && !marketplaceLookupDone && data.marketplaceUrl.includes("facebook.com/marketplace") && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleMarketplaceLookup}
                  className="mt-2"
                >
                  Look up listing
                </Button>
              )}
            </div>

            {marketplaceLookupError && (
              <p className="text-sm text-destructive">
                {marketplaceLookupError}
              </p>
            )}

            {marketplaceLookupDone && (
              <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <CardTitle className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                      Listing analysed successfully
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {data.marketplaceItemTitle && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item</span>
                      <span className="font-medium text-right max-w-[60%]">
                        {data.marketplaceItemTitle}
                      </span>
                    </div>
                  )}
                  {data.marketplaceListedPrice != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Listed price</span>
                      <span className="font-semibold font-mono">
                        &pound;{data.marketplaceListedPrice.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {data.valuationMin != null && data.valuationMax != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Est. market value</span>
                      <span className="font-semibold font-mono">
                        &pound;{data.valuationMin.toLocaleString("en-GB", { maximumFractionDigits: 0 })} &ndash; &pound;{data.valuationMax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  )}
                  {data.marketplaceListedPrice != null && data.valuationMin != null && data.valuationMax != null && (() => {
                    const listed = data.marketplaceListedPrice!;
                    const median = (data.valuationMin! + data.valuationMax!) / 2;
                    const diff = ((listed - median) / median) * 100;
                    let label: string;
                    let color: string;
                    if (diff < -50) {
                      label = "Suspiciously cheap";
                      color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    } else if (diff < -20) {
                      label = "Below market value";
                      color = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
                    } else if (diff > 50) {
                      label = "Significantly overpriced";
                      color = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
                    } else if (diff > 20) {
                      label = "Above market value";
                      color = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
                    } else {
                      label = "Fair price";
                      color = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
                    }
                    return (
                      <div className="flex justify-between text-sm items-center">
                        <span className="text-muted-foreground">Price assessment</span>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${color}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })()}
                  {data.marketplaceConfidence && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Confidence</span>
                      <Badge variant="secondary">{data.marketplaceConfidence}</Badge>
                    </div>
                  )}
                  {data.valuationSummary && (
                    <p className="text-sm text-muted-foreground pt-3 border-t">
                      {data.valuationSummary}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button onClick={goNext} disabled={!data.marketplaceUrl.trim()}>
              Continue
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Invoice check ──────────────────────────────── */}
      {step === 3 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">
            Do you have an invoice or payment request?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            We can extract payee details automatically from an uploaded document.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => update({ hasInvoice: true })}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.hasInvoice === true
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <FileText className="size-8 text-primary" />
              <span className="text-sm font-medium">
                Yes, I have an invoice
              </span>
            </button>
            <button
              type="button"
              onClick={() => update({ hasInvoice: false })}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.hasInvoice === false
                  ? "border-primary bg-primary/5"
                  : "border-border"
              )}
            >
              <User className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                No, I&apos;ll enter manually
              </span>
            </button>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button onClick={goNext} disabled={data.hasInvoice === null}>
              Continue
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 4: Upload or Manual entry ──────────────────────── */}
      {step === 4 && (
        <div>
          {data.hasInvoice ? (
            <>
              <h2 className="text-lg font-semibold mb-1">Upload invoice</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Upload a PDF or image of the invoice. We will extract the payee
                details automatically.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                {data.invoiceFile ? (
                  <>
                    <FileText className="size-8 text-primary" />
                    <span className="text-sm font-medium">
                      {data.invoiceFile.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(data.invoiceFile.size / 1024).toFixed(0)} KB
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ invoiceFile: null })}
                    >
                      Remove
                    </Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Drag and drop your invoice here, or
                    </span>
                    <label>
                      <Button variant="outline" size="sm" render={<span />}>
                        Browse files
                      </Button>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
                        className="sr-only"
                        onChange={handleFileSelect}
                      />
                    </label>
                  </>
                )}
              </div>

              {/* Details will be extracted automatically from the invoice */}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold mb-1">Payee details</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Enter the details of the person or business you are paying.
              </p>

              {/* Payee type toggle */}
              <div className="flex gap-2 mb-6">
                <Button
                  variant={
                    data.payeeType === "personal" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => update({ payeeType: "personal" })}
                >
                  <User className="size-4 mr-1" />
                  Personal
                </Button>
                <Button
                  variant={
                    data.payeeType === "business" ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => update({ payeeType: "business" })}
                >
                  <Building2 className="size-4 mr-1" />
                  Business
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payee-name">
                    {data.payeeType === "business"
                      ? "Account holder name"
                      : "Full name"}
                  </Label>
                  <Input
                    id="payee-name"
                    value={data.payeeName}
                    onChange={(e) => update({ payeeName: e.target.value })}
                  />
                </div>

                {data.payeeType === "business" && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="company-name">Company name</Label>
                      <Input
                        id="company-name"
                        value={data.companyNameInput}
                        onChange={(e) =>
                          update({ companyNameInput: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company-number">Company number</Label>
                        <Input
                          id="company-number"
                          className="font-mono"
                          placeholder="e.g. 12345678"
                          value={data.companyNumberInput}
                          onChange={(e) =>
                            update({ companyNumberInput: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vat-number">VAT number</Label>
                        <Input
                          id="vat-number"
                          className="font-mono"
                          placeholder="e.g. GB123456789"
                          value={data.vatNumberInput}
                          onChange={(e) =>
                            update({ vatNumberInput: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sort-code">Sort code</Label>
                    <Input
                      id="sort-code"
                      className="font-mono"
                      placeholder="XX-XX-XX"
                      value={data.sortCode}
                      onChange={(e) => update({ sortCode: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="account-number">Account number</Label>
                    <Input
                      id="account-number"
                      className="font-mono"
                      placeholder="12345678"
                      value={data.accountNumber}
                      onChange={(e) =>
                        update({ accountNumber: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-amount">Amount (GBP)</Label>
                  <Input
                    id="invoice-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={data.invoiceAmount}
                    onChange={(e) => update({ invoiceAmount: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={
                data.hasInvoice
                  ? !data.invoiceFile
                  : !data.payeeName && !data.companyNameInput
              }
            >
              Continue
              <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 5: Review & Submit ──────────────────────────── */}
      {step === 5 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Review & verify</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Check the details below and run the verification. This will use 1
            credit.
          </p>

          <div className="space-y-4">
            {/* Marketplace summary */}
            {data.isMarketplace && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Marketplace listing</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  {data.marketplaceItemTitle && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item</span>
                      <span>{data.marketplaceItemTitle}</span>
                    </div>
                  )}
                  {data.marketplaceListedPrice != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Listed price
                      </span>
                      <span className="font-mono">
                        &pound;{data.marketplaceListedPrice.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {data.valuationMin != null && data.valuationMax != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Market value
                      </span>
                      <span className="font-mono">
                        &pound;{data.valuationMin.toFixed(0)} &ndash; &pound;
                        {data.valuationMax.toFixed(0)}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invoice / payee summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {data.hasInvoice ? "Invoice" : "Payee details"}
                </CardTitle>
                <CardDescription>
                  {data.hasInvoice
                    ? "Details will be extracted from your uploaded file"
                    : "Manually entered payee information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                {data.hasInvoice && data.invoiceFile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File</span>
                    <span>{data.invoiceFile.name}</span>
                  </div>
                )}
                {data.payeeName && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Name</span>
                    <span>{data.payeeName}</span>
                  </div>
                )}
                {data.companyNameInput && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Company</span>
                    <span>{data.companyNameInput}</span>
                  </div>
                )}
                {data.companyNumberInput && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Company number
                    </span>
                    <span className="font-mono">
                      {data.companyNumberInput}
                    </span>
                  </div>
                )}
                {data.vatNumberInput && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">VAT number</span>
                    <span className="font-mono">{data.vatNumberInput}</span>
                  </div>
                )}
                {data.sortCode && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sort code</span>
                    <span className="font-mono">{data.sortCode}</span>
                  </div>
                )}
                {data.accountNumber && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Account number
                    </span>
                    <span className="font-mono">{data.accountNumber}</span>
                  </div>
                )}
                {data.invoiceAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono">
                      &pound;{parseFloat(data.invoiceAmount).toFixed(2)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="size-4 mr-1 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Run Verification"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
