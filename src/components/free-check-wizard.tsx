"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Mail,
} from "lucide-react";

type WizardData = {
  isMarketplace: boolean | null;
  marketplaceScreenshot: File | null;
  marketplaceItemTitle: string | null;
  marketplaceListedPrice: number | null;
  valuationMin: number | null;
  valuationMax: number | null;
  valuationSummary: string | null;
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
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">
          Step {step} of {total}
        </span>
        <span className="text-sm text-slate-500">
          {Math.round((step / total) * 100)}%
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-slate-100">
        <div
          className="h-1.5 rounded-full bg-coral transition-all duration-300"
          style={{ width: `${(step / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function FreeCheckWizard() {
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [leadEmail, setLeadEmail] = useState("");
  const [leadEmailError, setLeadEmailError] = useState<string | null>(null);

  const [wizardSessionId] = useState(() => typeof crypto !== "undefined" ? crypto.randomUUID() : "");
  const trackedRef = useRef(false);

  useEffect(() => {
    import("@/lib/supabase/client").then(({ createClient }) => {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data: { user } }) => {
        setIsAuthenticated(!!user);
        if (!user && !trackedRef.current) {
          trackedRef.current = true;
          fetch("/api/track-wizard-start", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId: wizardSessionId }),
          }).catch(() => {});
        }
      });
    });
  }, [wizardSessionId]);

  const update = useCallback(
    (partial: Partial<WizardData>) =>
      setData((prev) => ({ ...prev, ...partial })),
    []
  );

  useEffect(() => {
    if (!marketplaceLookupLoading) { setMarketplaceElapsed(0); return; }
    const interval = setInterval(() => setMarketplaceElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [marketplaceLookupLoading]);

  useEffect(() => {
    if (!submitting) { setSubmitElapsed(0); return; }
    const interval = setInterval(() => setSubmitElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, [submitting]);

  // Paste handler for marketplace screenshot
  useEffect(() => {
    if (step !== 2 || data.marketplaceScreenshot || marketplaceLookupLoading || marketplaceLookupDone) return;
    function handlePaste(e: ClipboardEvent) {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            update({ marketplaceScreenshot: file });
            handleMarketplaceLookup(file);
          }
          break;
        }
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [step, data.marketplaceScreenshot, marketplaceLookupLoading, marketplaceLookupDone]); // eslint-disable-line react-hooks/exhaustive-deps

  function getTotalSteps() {
    let count = 1;
    if (data.isMarketplace) count++;
    count++;
    count++;
    count++;
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
      const res = await fetch("/api/marketplace-lookup", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Lookup failed");
      update({
        marketplaceItemTitle: json.itemTitle,
        marketplaceListedPrice: json.listedPrice,
        invoiceAmount: json.listedPrice != null ? String(json.listedPrice) : "",
      });
      setMarketplaceLookupDone(true);
    } catch (err) {
      setMarketplaceLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setMarketplaceLookupLoading(false);
      marketplaceLookupRef.current = false;
    }
  }

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

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const fd = new FormData();
      let flowType = "manual";
      if (data.isMarketplace) flowType = "marketplace";
      else if (data.hasInvoice) flowType = "invoice";
      fd.append("flowType", flowType);

      if (data.isMarketplace) {
        if (data.marketplaceItemTitle) fd.append("marketplaceItemTitle", data.marketplaceItemTitle);
        if (data.marketplaceListedPrice != null) fd.append("marketplaceListedPrice", String(data.marketplaceListedPrice));
        if (data.valuationMin != null) fd.append("valuationMin", String(data.valuationMin));
        if (data.valuationMax != null) fd.append("valuationMax", String(data.valuationMax));
        if (data.valuationSummary) fd.append("valuationSummary", data.valuationSummary);
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

      const endpoint = isAuthenticated ? "/api/verify-full" : "/api/verify-lead";
      if (!isAuthenticated && leadEmail) fd.append("email", leadEmail);

      const res = await fetch(endpoint, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        if (!isAuthenticated && json.error) {
          setLeadEmailError(json.error);
          return;
        }
        throw new Error(json.error || "Verification failed");
      }

      const resultsPath = isAuthenticated ? `/dashboard/results/${json.id}` : `/results/${json.id}`;
      router.push(resultsPath);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    if (step === 1) { data.isMarketplace ? setStep(2) : setStep(3); }
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) setStep(5);
  }

  function goBack() {
    if (step === 5) setStep(4);
    else if (step === 4) setStep(3);
    else if (step === 3) { data.isMarketplace ? setStep(2) : setStep(1); }
    else if (step === 2) setStep(1);
  }

  // Submitting state
  if (submitting) {
    const pct = Math.min(95, (submitElapsed / 30) * 100);
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/50 text-center">
        <ShieldCheck className="size-14 text-coral mx-auto animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-900 mt-4">Running verification checks</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
          Checking against multiple UK data sources. This may take up to 30 seconds.
        </p>
        <div className="mt-6 max-w-xs mx-auto">
          <div className="h-2 w-full rounded-full bg-slate-100">
            <div
              className="h-2 rounded-full bg-coral transition-all duration-1000 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-slate-400 mt-2">Please do not navigate away.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/50">
      <ProgressBar step={getCurrentStepNumber()} total={getTotalSteps()} />

      {/* Step 1: Marketplace check */}
      {step === 1 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Is this a Facebook Marketplace purchase?
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            We can check the listing price against market value to spot scams.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => { update({ isMarketplace: true }); setStep(2); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-coral/40 hover:bg-coral/[0.02]",
                data.isMarketplace === true ? "border-coral bg-coral/5" : "border-slate-200"
              )}
            >
              <ShoppingCart className="size-8 text-coral" />
              <span className="text-sm font-medium text-slate-900">Yes, Marketplace</span>
            </button>
            <button
              type="button"
              onClick={() => { update({ isMarketplace: false }); setStep(3); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-slate-300 hover:bg-slate-50",
                data.isMarketplace === false ? "border-coral bg-coral/5" : "border-slate-200"
              )}
            >
              <X className="size-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">No</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Marketplace Screenshot */}
      {step === 2 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload listing screenshot</h3>
          <p className="text-sm text-slate-500 mb-6">
            Take a screenshot of the listing showing the item title and price.
          </p>
          <div className="space-y-4">
            {!data.marketplaceScreenshot && !marketplaceLookupLoading && !marketplaceLookupDone && (
              <label
                htmlFor="home-marketplace-screenshot"
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-all",
                  dragOver ? "border-coral bg-coral/5" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                )}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault(); setDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file && file.type.startsWith("image/")) {
                    update({ marketplaceScreenshot: file });
                    handleMarketplaceLookup(file);
                  }
                }}
              >
                <Upload className="size-8 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">Drop, paste, or click to upload</span>
                <span className="text-xs text-slate-400">PNG, JPG or WebP</span>
                <input id="home-marketplace-screenshot" type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) { update({ marketplaceScreenshot: file }); handleMarketplaceLookup(file); }
                  }}
                />
              </label>
            )}

            {marketplaceLookupLoading && (
              <div className="rounded-lg border border-coral/20 bg-coral/[0.03] p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="size-5 animate-spin text-coral" />
                  <span className="text-sm font-medium text-slate-700">
                    {marketplaceElapsed < 10 ? "Reading listing..." : "Researching market value..."}
                  </span>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-coral transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(95, (marketplaceElapsed / 25) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {marketplaceLookupError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-600">{marketplaceLookupError}</p>
                <Button variant="outline" size="sm" className="mt-3"
                  onClick={() => { update({ marketplaceScreenshot: null }); setMarketplaceLookupError(null); marketplaceLookupRef.current = false; }}
                >
                  Try again
                </Button>
              </div>
            )}

            {marketplaceLookupDone && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">Listing found</span>
                </div>
                {data.marketplaceItemTitle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Item</span>
                    <span className="font-medium text-slate-900 text-right max-w-[60%]">{data.marketplaceItemTitle}</span>
                  </div>
                )}
                {data.marketplaceListedPrice != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Listed price</span>
                    <span className="font-semibold font-mono text-slate-900">
                      &pound;{data.marketplaceListedPrice.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <Button variant="outline" size="sm" onClick={goBack} className="rounded-lg">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={goNext} disabled={!marketplaceLookupDone || marketplaceLookupLoading} className="rounded-lg bg-coral hover:bg-coral-dark text-white">
              Continue <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Invoice check */}
      {step === 3 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Do you have an invoice or payment request?
          </h3>
          <p className="text-sm text-slate-500 mb-6">
            We can extract payee details automatically from an uploaded document.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => { update({ hasInvoice: true }); setStep(4); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-coral/40 hover:bg-coral/[0.02]",
                data.hasInvoice === true ? "border-coral bg-coral/5" : "border-slate-200"
              )}
            >
              <FileText className="size-8 text-coral" />
              <span className="text-sm font-medium text-slate-900">Yes, I have an invoice</span>
            </button>
            <button
              type="button"
              onClick={() => { update({ hasInvoice: false }); setStep(4); }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-slate-300 hover:bg-slate-50",
                data.hasInvoice === false ? "border-coral bg-coral/5" : "border-slate-200"
              )}
            >
              <User className="size-8 text-slate-400" />
              <span className="text-sm font-medium text-slate-900">No, I&apos;ll enter manually</span>
            </button>
          </div>
          <div className="mt-6">
            <Button variant="outline" size="sm" onClick={goBack} className="rounded-lg">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Upload or Manual entry */}
      {step === 4 && (
        <div>
          {data.hasInvoice ? (
            <>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Upload invoice</h3>
              <p className="text-sm text-slate-500 mb-6">
                Upload a PDF or image. We&apos;ll extract the payee details automatically.
              </p>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-all",
                  dragOver ? "border-coral bg-coral/5" : "border-slate-200 hover:border-slate-300"
                )}
              >
                {data.invoiceFile ? (
                  <>
                    <FileText className="size-8 text-coral" />
                    <span className="text-sm font-medium text-slate-900">{data.invoiceFile.name}</span>
                    <span className="text-xs text-slate-400">{(data.invoiceFile.size / 1024).toFixed(0)} KB</span>
                    <Button variant="ghost" size="sm" onClick={() => update({ invoiceFile: null })}>Remove</Button>
                  </>
                ) : (
                  <>
                    <Upload className="size-8 text-slate-400" />
                    <span className="text-sm text-slate-500">Drag and drop, or</span>
                    <label>
                      <Button variant="outline" size="sm" render={<span />}>Browse files</Button>
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" className="sr-only" onChange={handleFileSelect} />
                    </label>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-slate-900 mb-1">Payee details</h3>
              <p className="text-sm text-slate-500 mb-6">Enter the details of who you&apos;re paying.</p>

              <div className="flex gap-2 mb-5">
                <Button variant={data.payeeType === "personal" ? "default" : "outline"} size="sm" className="rounded-lg"
                  onClick={() => update({ payeeType: "personal" })}
                >
                  <User className="size-4 mr-1" /> Personal
                </Button>
                <Button variant={data.payeeType === "business" ? "default" : "outline"} size="sm" className="rounded-lg"
                  onClick={() => update({ payeeType: "business" })}
                >
                  <Building2 className="size-4 mr-1" /> Business
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="home-payee-name" className="text-slate-700 text-sm">
                    {data.payeeType === "business" ? "Company / account name" : "Full name"}
                  </Label>
                  <Input id="home-payee-name"
                    placeholder={data.payeeType === "business" ? "e.g. Acme Ltd" : "e.g. John Smith"}
                    value={data.payeeName}
                    className="h-10 rounded-lg border-slate-200 focus:border-coral"
                    onChange={(e) => {
                      update({ payeeName: e.target.value });
                      if (data.payeeType === "business") update({ payeeName: e.target.value, companyNameInput: e.target.value });
                    }}
                  />
                </div>

                {data.payeeType === "business" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="home-company-number" className="text-slate-700 text-sm">Company number</Label>
                      <Input id="home-company-number" className="font-mono h-10 rounded-lg border-slate-200" placeholder="e.g. 12345678"
                        value={data.companyNumberInput} onChange={(e) => update({ companyNumberInput: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="home-vat-number" className="text-slate-700 text-sm">VAT number</Label>
                      <Input id="home-vat-number" className="font-mono h-10 rounded-lg border-slate-200" placeholder="e.g. GB123456789"
                        value={data.vatNumberInput} onChange={(e) => update({ vatNumberInput: e.target.value })} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="home-sort-code" className="text-slate-700 text-sm">Sort code</Label>
                    <Input id="home-sort-code" className="font-mono h-10 rounded-lg border-slate-200" placeholder="00-00-00" maxLength={8}
                      value={data.sortCode}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
                        let formatted = digits;
                        if (digits.length > 4) formatted = `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`;
                        else if (digits.length > 2) formatted = `${digits.slice(0, 2)}-${digits.slice(2)}`;
                        update({ sortCode: formatted });
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="home-account-number" className="text-slate-700 text-sm">Account number</Label>
                    <Input id="home-account-number" className="font-mono h-10 rounded-lg border-slate-200" placeholder="12345678" maxLength={8}
                      value={data.accountNumber}
                      onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 8); update({ accountNumber: digits }); }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="home-invoice-amount" className="text-slate-700 text-sm">Amount (GBP)</Label>
                  <Input id="home-invoice-amount" type="number" step="0.01" placeholder="0.00"
                    className="font-mono h-10 rounded-lg border-slate-200"
                    value={data.invoiceAmount} onChange={(e) => update({ invoiceAmount: e.target.value })} />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" size="sm" onClick={goBack} className="rounded-lg">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={goNext}
              disabled={data.hasInvoice ? !data.invoiceFile : !data.payeeName && !data.companyNameInput}
              className="rounded-lg bg-coral hover:bg-coral-dark text-white"
            >
              Continue <ArrowRight className="size-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Review & Submit */}
      {step === 5 && (
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">Review &amp; verify</h3>
          <p className="text-sm text-slate-500 mb-6">
            Check the details below and run your free verification.
          </p>

          <div className="space-y-3">
            {data.isMarketplace && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                  <ShoppingCart className="size-4" /> Marketplace listing
                </div>
                {data.marketplaceItemTitle && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Item</span>
                    <span className="font-medium text-slate-900 text-right max-w-[60%]">{data.marketplaceItemTitle}</span>
                  </div>
                )}
                {data.marketplaceListedPrice != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Listed price</span>
                    <span className="font-mono font-semibold text-slate-900">
                      &pound;{data.marketplaceListedPrice.toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2">
              <div className="text-sm font-semibold text-slate-900">
                {data.hasInvoice ? "Invoice" : "Payee details"}
              </div>
              {data.hasInvoice && data.invoiceFile && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">File</span>
                  <span className="text-slate-900">{data.invoiceFile.name}</span>
                </div>
              )}
              {data.payeeName && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-900">{data.payeeName}</span>
                </div>
              )}
              {data.sortCode && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Sort code</span>
                  <span className="font-mono text-slate-900">{data.sortCode}</span>
                </div>
              )}
              {data.accountNumber && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Account number</span>
                  <span className="font-mono text-slate-900">{data.accountNumber}</span>
                </div>
              )}
              {data.invoiceAmount && !data.hasInvoice && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-mono font-semibold text-slate-900">
                    &pound;{parseFloat(data.invoiceAmount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Email capture */}
          {!isAuthenticated && (
            <div className="mt-4 space-y-1.5">
              <Label htmlFor="home-lead-email" className="text-slate-700 text-sm">Email address</Label>
              <p className="text-xs text-slate-500">Enter your email to receive your free report</p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input id="home-lead-email" type="email" placeholder="you@example.com"
                  className="pl-9 h-10 rounded-lg border-slate-200"
                  value={leadEmail}
                  onChange={(e) => { setLeadEmail(e.target.value); setLeadEmailError(null); }}
                />
              </div>
              {leadEmailError && <p className="text-sm text-red-600">{leadEmailError}</p>}
            </div>
          )}

          <div className="flex justify-between mt-6">
            <Button variant="outline" size="sm" onClick={goBack} className="rounded-lg">
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <Button size="sm" onClick={handleSubmit}
              disabled={submitting || (!isAuthenticated && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(leadEmail))}
              className="rounded-lg bg-coral hover:bg-coral-dark text-white"
            >
              <ShieldCheck className="size-4 mr-1" /> Run Verification
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
