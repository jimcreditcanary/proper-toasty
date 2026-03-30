import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailGateForm } from "@/components/email-gate-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Landmark,
  ShoppingCart,
  CalendarDays,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Minus,
  Star,
} from "lucide-react";

type CheckStatus = "PASS" | "WARN" | "FAIL" | "UNVERIFIED";

function StatusBadge({ status }: { status: CheckStatus }) {
  const styles: Record<CheckStatus, string> = {
    PASS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    WARN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    FAIL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    UNVERIFIED: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}

function CheckCard({
  icon, title, status, detail, accentColor,
}: {
  icon: React.ReactNode; title: string; status: CheckStatus; detail: string; accentColor: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />
      <CardContent className="flex items-start gap-3 py-3 pl-5">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className="text-sm font-medium">{title}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function accentForStatus(s: CheckStatus): string {
  return s === "PASS" ? "bg-emerald-500" : s === "WARN" ? "bg-amber-500" : s === "FAIL" ? "bg-red-500" : "bg-zinc-300 dark:bg-zinc-600";
}

function namesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.includes(nb) || nb.includes(na);
}

function monthsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor((new Date().getTime() - d.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `\u00A3${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export default async function PublicResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  // Fetch verification
  const { data: v } = await admin
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (!v) notFound();

  // If this is an authenticated user's verification, redirect to dashboard
  if (v.user_id) {
    redirect(`/dashboard/results/${id}`);
  }

  // Check if a lead exists for this verification
  const { data: lead } = await admin
    .from("leads")
    .select("id")
    .eq("verification_id", id)
    .limit(1)
    .single();

  const hasEmail = !!lead;

  // Derive display values
  const accountName = v.companies_house_name || v.extracted_company_name || v.company_name_input || v.payee_name || "Unknown";
  const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
  const description = v.marketplace_item_title || (v.invoice_file_path ? v.invoice_file_path.split("/").pop()?.replace(/^\d+-/, "") : null) || "this payment";
  const isBusiness = v.payee_type === "business" || !!v.companies_house_name || !!v.companies_house_number || !!v.vat_number_input || !!v.extracted_vat_number;
  const isMarketplace = v.flow_type === "marketplace";
  const inputName = v.extracted_company_name || v.company_name_input || v.payee_name;
  const risk = v.overall_risk ?? "UNKNOWN";

  const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; message: string }> = {
    LOW: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", icon: <CheckCircle2 className="size-6 text-emerald-600" />, message: "Our checks look good. It\u2019s ok, move ahead!" },
    MEDIUM: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", icon: <AlertTriangle className="size-6 text-amber-500" />, message: "Some checks returned warnings. Proceed with caution." },
    HIGH: { bg: "bg-red-50", text: "text-red-800", border: "border-red-200", icon: <XCircle className="size-6 text-red-600" />, message: "One or more checks have failed. We recommend you do not proceed." },
    UNKNOWN: { bg: "bg-zinc-50", text: "text-zinc-700", border: "border-zinc-200", icon: <Minus className="size-6 text-zinc-400" />, message: "We could not determine the risk level." },
  };
  const rc = riskConfig[risk] ?? riskConfig.UNKNOWN;

  // If no email captured yet, show just the email gate
  if (!hasEmail) {
    return (
      <div className="mx-auto max-w-[625px] px-4 py-8 sm:px-6">
        <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/" />}>
          <ArrowLeft className="size-4 mr-1" />
          Home
        </Button>
        <EmailGateForm verificationId={id} />
      </div>
    );
  }

  // ── Full results (email captured) ────────────────────────────────

  // Derive check statuses (same logic as dashboard results page)
  let chStatus: CheckStatus = "UNVERIFIED";
  let chDetail = "Companies House was not checked.";
  if (v.companies_house_result) {
    if (v.companies_house_name) {
      const match = namesMatch(inputName, v.companies_house_name);
      chStatus = match ? "PASS" : "WARN";
      chDetail = match ? `Registered name: ${v.companies_house_name}` : `Name mismatch: "${inputName}" vs "${v.companies_house_name}"`;
    } else { chStatus = "FAIL"; chDetail = "Company not found on register."; }
  }

  let vatStatus: CheckStatus = "UNVERIFIED";
  let vatDetail = "HMRC VAT check was not run.";
  const vatNumber = v.vat_number_input || v.extracted_vat_number;
  if (v.hmrc_vat_result) {
    if (v.vat_api_name) {
      const match = namesMatch(inputName, v.vat_api_name);
      vatStatus = match ? "PASS" : "WARN";
      vatDetail = match ? `VAT registered name: ${v.vat_api_name}` : `VAT number${vatNumber ? ` ${vatNumber}` : ""} is registered to "${v.vat_api_name}" — this does not match the payee name "${inputName}".`;
    } else { vatStatus = "FAIL"; vatDetail = `VAT number${vatNumber ? ` ${vatNumber}` : ""} not found on HMRC register.`; }
  }

  let copStatus: CheckStatus = "UNVERIFIED";
  let copDetail = "Bank verification was not run.";
  if (v.cop_result) {
    if (v.cop_result === "FULL_MATCH") { copStatus = "PASS"; copDetail = "Full match confirmed by the bank."; }
    else if (v.cop_result === "PARTIAL_MATCH") { copStatus = "WARN"; copDetail = `Partial match. ${v.cop_reason ?? ""}`; }
    else { copStatus = "FAIL"; copDetail = `No match. ${v.cop_reason ?? ""}`; }
  }

  const showTrading = !!v.companies_house_result && !!v.companies_house_name;
  let tradingStatus: CheckStatus = "UNVERIFIED";
  let tradingDetail = "";
  if (showTrading && v.companies_house_incorporated_date) {
    const months = monthsSince(v.companies_house_incorporated_date);
    if (months !== null) {
      if (months < 3) { tradingStatus = "WARN"; tradingDetail = `Less than 3 months old.`; }
      else { tradingStatus = "PASS"; const yrs = Math.floor(months / 12); tradingDetail = yrs >= 1 ? `${yrs} year${yrs === 1 ? "" : "s"} old.` : `${months} months old.`; }
    }
  }

  const showAccounts = showTrading;
  let accountsStatus: CheckStatus = "UNVERIFIED";
  let accountsDetail = "";
  if (showAccounts) {
    if (v.companies_house_accounts_date) {
      accountsStatus = v.companies_house_accounts_overdue ? "FAIL" : "PASS";
      accountsDetail = v.companies_house_accounts_overdue ? `Overdue. Last: ${v.companies_house_accounts_date}` : `Filed. Last: ${v.companies_house_accounts_date}`;
    } else { accountsStatus = "WARN"; accountsDetail = "No filing info found."; }
  }

  let reviewsStatus: CheckStatus = "UNVERIFIED";
  let reviewsDetail = "";
  const showReviews = isBusiness && (v.google_reviews_rating != null || v.google_reviews_count != null || v.google_reviews_summary != null);
  if (showReviews) {
    const rating = v.google_reviews_rating != null ? Number(v.google_reviews_rating) : null;
    const count = v.google_reviews_count != null ? Number(v.google_reviews_count) : null;
    if (rating != null) {
      reviewsStatus = rating >= 4 ? "PASS" : rating >= 3 ? "WARN" : "FAIL";
      reviewsDetail = `${rating.toFixed(1)}\u2605${count ? ` (${count} reviews)` : ""}. ${v.google_reviews_summary ?? ""}`.trim();
    } else if (count && count > 0) {
      reviewsStatus = "PASS";
      reviewsDetail = v.google_reviews_summary ?? `${count} reviews found.`;
    } else {
      reviewsStatus = "WARN";
      reviewsDetail = v.google_reviews_summary ?? "No reviews found.";
    }
  }

  const showMarketplace = isMarketplace && v.valuation_min != null && v.valuation_max != null && v.marketplace_listed_price != null;
  let mktStatus: CheckStatus = "UNVERIFIED";
  let mktDetail = "";
  if (showMarketplace) {
    const listed = Number(v.marketplace_listed_price);
    const min = Number(v.valuation_min);
    const max = Number(v.valuation_max);
    if (listed >= min * 0.8 && listed <= max * 1.2) { mktStatus = "PASS"; mktDetail = `${fmt(listed)} within range ${fmt(min)}\u2013${fmt(max)}.`; }
    else if (listed < min * 0.5) { mktStatus = "FAIL"; mktDetail = `${fmt(listed)} far below range.`; }
    else { mktStatus = "WARN"; mktDetail = `${fmt(listed)} outside range ${fmt(min)}\u2013${fmt(max)}.`; }
  }

  return (
    <div className="mx-auto max-w-[625px] px-4 py-8 sm:px-6">
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/" />}>
        <ArrowLeft className="size-4 mr-1" />
        Home
      </Button>

      <Card className={`${rc.bg} ${rc.border} border mb-6`}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{rc.icon}</div>
            <div>
              <h1 className="text-lg font-semibold">
                You are paying {accountName}
                {amount != null && <span className="font-mono ml-1">{fmt(amount)}</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">for {description}</p>
              <p className={`text-sm font-medium mt-2 ${rc.text}`}>{rc.message}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Checks completed</h2>

      <div className="space-y-2">
        {(() => {
          const statusOrder: Record<CheckStatus, number> = { FAIL: 0, WARN: 1, PASS: 2, UNVERIFIED: 3 };
          const checks: Array<{ icon: React.ReactNode; title: string; status: CheckStatus; detail: string }> = [];
          if (isBusiness) checks.push({ icon: <Building2 className="size-4 text-muted-foreground" />, title: "Companies House", status: chStatus, detail: chDetail });
          if (showTrading && tradingDetail) checks.push({ icon: <CalendarDays className="size-4 text-muted-foreground" />, title: "Business Trading History", status: tradingStatus, detail: tradingDetail });
          if (showAccounts && accountsDetail) checks.push({ icon: <FileText className="size-4 text-muted-foreground" />, title: "Last Accounts Filed", status: accountsStatus, detail: accountsDetail });
          if (isBusiness) checks.push({ icon: <ShieldCheck className="size-4 text-muted-foreground" />, title: "VAT Number", status: vatStatus, detail: vatDetail });
          checks.push({ icon: <Landmark className="size-4 text-muted-foreground" />, title: "Confirmation of Payee", status: copStatus, detail: copDetail });
          if (showReviews) checks.push({ icon: <Star className="size-4 text-muted-foreground" />, title: "Online Reviews", status: reviewsStatus, detail: reviewsDetail });
          if (showMarketplace) checks.push({ icon: <ShoppingCart className="size-4 text-muted-foreground" />, title: "Marketplace Price Check", status: mktStatus, detail: mktDetail });
          checks.sort((a, b) => {
            const so = statusOrder[a.status] - statusOrder[b.status];
            return so !== 0 ? so : a.title.localeCompare(b.title);
          });
          return checks.map((c) => (
            <CheckCard key={c.title} icon={c.icon} title={c.title} status={c.status} detail={c.detail} accentColor={accentForStatus(c.status)} />
          ));
        })()}
      </div>

      {/* Marketplace valuation block */}
      {isMarketplace && v.marketplace_item_title && v.valuation_summary && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Marketplace valuation</h2>
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="size-5 text-muted-foreground" />
                <span className="text-sm font-semibold">{v.marketplace_item_title}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {v.marketplace_listed_price != null && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <span className="text-xs text-muted-foreground block mb-0.5">Listed price</span>
                    <span className="font-mono font-semibold text-base">{fmt(Number(v.marketplace_listed_price))}</span>
                  </div>
                )}
                {v.valuation_min != null && v.valuation_max != null && (
                  <div className="rounded-lg bg-muted/50 p-3">
                    <span className="text-xs text-muted-foreground block mb-0.5">Est. market value</span>
                    <span className="font-mono font-semibold text-base">{fmt(Number(v.valuation_min))} &ndash; {fmt(Number(v.valuation_max))}</span>
                  </div>
                )}
              </div>
              <div className="rounded-lg border bg-muted/20 p-4">
                <p className="text-sm leading-relaxed whitespace-pre-line">{v.valuation_summary}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CTA to sign up */}
      <Card className="mt-8 border-primary/20 bg-primary/5">
        <CardContent className="pt-5 pb-4 text-center">
          <h3 className="font-semibold">Want to verify more payments?</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Create an account to save your checks, access the API, and buy credits.
          </p>
          <Button className="mt-3" render={<Link href="/auth/signup" />}>
            Create a free account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
