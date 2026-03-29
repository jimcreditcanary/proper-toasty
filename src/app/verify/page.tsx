"use client";

import React, { useState, useCallback, useEffect } from "react";
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
  ShieldCheck,
} from "lucide-react";

type WizardData = {
  isMarketplace: boolean | null;
  marketplaceScreenshot: File | null;
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
  marketplaceScreenshot: null,
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

/** Animated progress bar for long-running tasks */
function AnalysisProgress({ label, elapsed }: { label: string; elapsed: number }) {
  // Estimate: step 1 ~8s, step 2 ~12s = ~20s total
  const pct = Math.min(95, (elapsed / 25) * 100);
  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20">
      <CardContent className="pt-6 space-y-3">
        <div className="flex items-center gap-3">
          <Loader2 className="size-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
            {label}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-blue-100 dark:bg-blue-900/50">
          <div
            className="h-2 rounded-full bg-blue-500 transition-all duration-1000 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This may take up to 30 seconds. Please do not navigate away.
        </p>
      </CardContent>
    </Card>
  );
}

export default function VerifyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(initialData);
  const [marketplaceLookupLoading, setMarketplaceLookupLoading] = useState(false);
  const [marketplaceLookupDone, setMarketplaceLookupDone] = useState(false);
  const [marketplaceLookupError, setMarketplaceLookupError] = useState<string | null>(null);
  const [marketplaceElapsed, setMarketplaceElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitElapsed, setSubmitElapsed] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const update = useCallback(
    (partial: Partial<WizardData>) =>
      setData((prev) => ({ ...prev, ...partial })),
    []
  );

  // Timer for marketplace analysis progress
  useEffect(() => {
    if (!marketplaceLookupLoading) { setMarketplaceElapsed(0); return; }
    const interval = setInterval(() => setMarketplaceElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [marketplaceLookupLoading]);

  // Timer for submit/verify progress
  useEffect(() => {
    if (!submitting) { setSubmitElapsed(0); return; }
    const interval = setInterval(() => setSubmitElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [submitting]);

  function getTotalSteps() {
    let count = 1; // marketplace check
    if (data.isMarketplace) count++; // screenshot
    count++; // invoice check
    count++; // upload or manual entry
    count++; // review
    return count;
  }

  function getCurrentStepNumber() {
    if (step === 1) return 1;
    if (data.isMarketplace && step === 2) return 2;
    if (step === 3) return data.isMarketplace ? 3 : 2;
    if (step === 4) return data.isMarketplace ? 4 : 3;
    if (step === 5) return data.isMarketplace ? 5 : 4;
    return 1;
  }

  // ── Marketplace lookup ────────────────────────────────────────────
  const marketplaceLookupRef = React.useRef(false);
  async function handleMarketplaceLookup(file?: File) {
    const screenshot = file || data.marketplaceScreenshot;
    if (marketplaceLookupRef.current || !screenshot) return;
    marketplaceLookupRef.current = true;
    setMarketplaceLookupLoading(true);
    setMarketplaceLookupError(null);
    try {
      const fd = new FormData();
      fd.append("screenshot", screenshot);
      const res = await fetch("/api/marketplace-lookup", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      update({
        marketplaceItemTitle: json.itemTitle,
        marketplaceListedPrice: json.listedPrice,
        // Pre-fill the invoice amount with the listed price
        invoiceAmount: json.listedPrice != null ? String(json.listedPrice) : "",
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

      let flowType = "manual";
      if (data.isMarketplace) flowType = "marketplace";
      else if (data.hasInvoice) flowType = "invoice";
      fd.append("flowType", flowType);

      // Marketplace fields
      if (data.isMarketplace) {
        if (data.marketplaceItemTitle)
          fd.append("marketplaceItemTitle", data.marketplaceItemTitle);
        if (data.marketplaceListedPrice != null)
          fd.append("marketplaceListedPrice", String(data.marketplaceListedPrice));
        if (data.valuationMin != null)
          fd.append("valuationMin", String(data.valuationMin));
        if (data.valuationMax != null)
          fd.append("valuationMax", String(data.valuationMax));
        if (data.valuationSummary)
          fd.append("valuationSummary", data.valuationSummary);
      }

      if (data.invoiceFile) fd.append("file", data.invoiceFile);

      fd.append("payeeType", data.payeeType);
      if (data.payeeName) fd.append("payeeName", data.payeeName);
      if (data.companyNameInput) fd.append("companyNameInput", data.companyNameInput);
      if (data.sortCode) fd.append("sortCode", data.sortCode);
      if (data.accountNumber) fd.append("accountNumber", data.accountNumber);
      if (data.vatNumberInput) fd.append("vatNumberInput", data.vatNumberInput);
      if (data.companyNumberInput) fd.append("companyNumberInput", data.companyNumberInput);
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
    } else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  }

  function goBack() {
    if (step === 5) setStep(4);
    else if (step === 4) setStep(3);
    else if (step === 3) {
      if (data.isMarketplace) setStep(2);
      else setStep(1);
    } else if (step === 2) setStep(1);
  }

  // ── Step 5 submitting: show full-screen loading ───────────────────
  if (submitting) {
    const pct = Math.min(95, (submitElapsed / 30) * 100);
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <ShieldCheck className="size-16 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold">Running verification checks</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            We&apos;re checking the payee details against Companies House, HMRC,
            and the bank. This may take up to 30 seconds.
          </p>
          <div className="w-full max-w-sm">
            <div className="h-2 w-full rounded-full bg-muted">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-1000 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Please do not navigate away from this page.
            </p>
          </div>
        </div>
      </div>
    );
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
              onClick={() => { update({ isMarketplace: true }); setStep(2); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.isMarketplace === true ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <ShoppingCart className="size-8 text-primary" />
              <span className="text-sm font-medium">Yes, Marketplace</span>
            </button>
            <button
              type="button"
              onClick={() => { update({ isMarketplace: false }); setStep(3); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.isMarketplace === false ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <X className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">No</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step 2: Marketplace Screenshot ──────────────────────── */}
      {step === 2 && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Upload listing screenshot</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Take a screenshot of the Facebook Marketplace listing showing the item
            title and price. We&apos;ll extract the details and check the value.
          </p>

          <div className="space-y-4">
            {/* Screenshot upload */}
            {!data.marketplaceScreenshot && !marketplaceLookupLoading && !marketplaceLookupDone && (
              <label
                htmlFor="marketplace-screenshot"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 cursor-pointer transition-colors",
                  "hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <Upload className="size-10 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Drop screenshot here, or click to browse
                </span>
                <span className="text-xs text-muted-foreground">
                  PNG, JPG or WebP
                </span>
                <input
                  id="marketplace-screenshot"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      update({ marketplaceScreenshot: file });
                      handleMarketplaceLookup(file);
                    }
                  }}
                />
              </label>
            )}

            {/* File name badge when uploaded */}
            {data.marketplaceScreenshot && !marketplaceLookupLoading && !marketplaceLookupDone && (
              <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
                <FileText className="size-5 text-muted-foreground shrink-0" />
                <span className="text-sm truncate flex-1">{data.marketplaceScreenshot.name}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    update({ marketplaceScreenshot: null, marketplaceItemTitle: null, marketplaceListedPrice: null, valuationMin: null, valuationMax: null });
                    setMarketplaceLookupDone(false);
                    setMarketplaceLookupError(null);
                    marketplaceLookupRef.current = false;
                  }}
                >
                  Remove
                </Button>
              </div>
            )}

            {/* Loading progress */}
            {marketplaceLookupLoading && (
              <AnalysisProgress
                label={marketplaceElapsed < 10 ? "Reading listing screenshot..." : "Researching market value..."}
                elapsed={marketplaceElapsed}
              />
            )}

            {/* Error */}
            {marketplaceLookupError && (
              <Card className="border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20">
                <CardContent className="pt-4">
                  <p className="text-sm text-red-700 dark:text-red-400">{marketplaceLookupError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      update({ marketplaceScreenshot: null });
                      setMarketplaceLookupError(null);
                      marketplaceLookupRef.current = false;
                    }}
                  >
                    Try again
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Success results — item and price only, valuation on results page */}
            {marketplaceLookupDone && (
              <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="size-5 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">
                      Listing found
                    </span>
                  </div>
                  {data.marketplaceItemTitle && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Item</span>
                      <span className="font-medium text-right max-w-[60%]">{data.marketplaceItemTitle}</span>
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
                  <p className="text-xs text-muted-foreground pt-2 border-t">
                    Market valuation will be shown on the results page.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" onClick={goBack}>
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>
            <Button
              onClick={goNext}
              disabled={!marketplaceLookupDone || marketplaceLookupLoading}
            >
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
                data.hasInvoice === true ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <FileText className="size-8 text-primary" />
              <span className="text-sm font-medium">Yes, I have an invoice</span>
            </button>
            <button
              type="button"
              onClick={() => update({ hasInvoice: false })}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border-2 p-6 transition-colors hover:border-primary/50 hover:bg-muted/50",
                data.hasInvoice === false ? "border-primary bg-primary/5" : "border-border"
              )}
            >
              <User className="size-8 text-muted-foreground" />
              <span className="text-sm font-medium">No, I&apos;ll enter manually</span>
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
                Upload a PDF or image of the invoice. We will extract the payee details automatically.
              </p>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors",
                  dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                )}
              >
                {data.invoiceFile ? (
                  <>
                    <FileText className="size-8 text-primary" />
                    <span className="text-sm font-medium">{data.invoiceFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(data.invoiceFile.size / 1024).toFixed(0)} KB
                    </span>
                    <Button variant="ghost" size="sm" onClick={() => update({ invoiceFile: null })}>
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
                  variant={data.payeeType === "personal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => update({ payeeType: "personal" })}
                >
                  <User className="size-4 mr-1" />
                  Personal
                </Button>
                <Button
                  variant={data.payeeType === "business" ? "default" : "outline"}
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
                    {data.payeeType === "business" ? "Account holder name" : "Full name"}
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
                        onChange={(e) => update({ companyNameInput: e.target.value })}
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
                          onChange={(e) => update({ companyNumberInput: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vat-number">VAT number</Label>
                        <Input
                          id="vat-number"
                          className="font-mono"
                          placeholder="e.g. GB123456789"
                          value={data.vatNumberInput}
                          onChange={(e) => update({ vatNumberInput: e.target.value })}
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
                      onChange={(e) => update({ accountNumber: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invoice-amount">
                    Amount (GBP)
                    {data.isMarketplace && data.marketplaceListedPrice != null && (
                      <span className="text-muted-foreground font-normal ml-1">
                        — pre-filled from listing
                      </span>
                    )}
                  </Label>
                  <Input
                    id="invoice-amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="font-mono"
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
              disabled={data.hasInvoice ? !data.invoiceFile : !data.payeeName && !data.companyNameInput}
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
          <h2 className="text-lg font-semibold mb-1">Review &amp; verify</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Check the details below and run the verification. This will use 1 credit.
          </p>

          <div className="space-y-4">
            {/* Marketplace summary */}
            {data.isMarketplace && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShoppingCart className="size-4" />
                    Marketplace listing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {data.marketplaceItemTitle && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Item</span>
                      <span className="font-medium text-right max-w-[60%]">{data.marketplaceItemTitle}</span>
                    </div>
                  )}
                  {data.marketplaceListedPrice != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Listed price</span>
                      <span className="font-mono font-semibold">
                        &pound;{data.marketplaceListedPrice.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {data.valuationMin != null && data.valuationMax != null && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Est. market value</span>
                      <span className="font-mono font-semibold">
                        &pound;{data.valuationMin.toLocaleString("en-GB", { maximumFractionDigits: 0 })} &ndash; &pound;{data.valuationMax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
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
              <CardContent className="space-y-2 text-sm">
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
                    <span className="text-muted-foreground">Company number</span>
                    <span className="font-mono">{data.companyNumberInput}</span>
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
                    <span className="text-muted-foreground">Account number</span>
                    <span className="font-mono">{data.accountNumber}</span>
                  </div>
                )}
                {data.invoiceAmount && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-semibold">
                      &pound;{parseFloat(data.invoiceAmount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
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
              <ShieldCheck className="size-4 mr-1" />
              Run Verification
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
