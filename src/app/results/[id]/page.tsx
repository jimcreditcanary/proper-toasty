import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmailGateForm } from "@/components/email-gate-form";
import { Button } from "@/components/ui/button";
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
    PASS: "text-pass",
    WARN: "text-warn",
    FAIL: "text-fail",
    UNVERIFIED: "text-brand-muted",
  };
  return (
    <span className={`text-xs font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

function dotClass(s: CheckStatus): string {
  return s === "PASS" ? "dot-pass" : s === "WARN" ? "dot-warn" : s === "FAIL" ? "dot-fail" : "";
}

function rowStyle(s: CheckStatus): string {
  if (s === "PASS") return "bg-pass/[0.08] border border-pass/20";
  if (s === "WARN") return "bg-warn/[0.08] border border-warn/20";
  if (s === "FAIL") return "bg-fail/[0.08] border border-fail/20";
  return "bg-white/[0.03] border border-white/[0.06]";
}

function CheckRow({
  icon, title, status, detail,
}: {
  icon: React.ReactNode; title: string; status: CheckStatus; detail: string;
}) {
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3 sm:p-4 ${rowStyle(status)}`}>
      {status !== "UNVERIFIED" && <div className={`mt-1.5 ${dotClass(status)}`} />}
      {status === "UNVERIFIED" && <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-brand-muted/40 shrink-0" />}
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm font-semibold text-white">{title}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-brand-muted-light">{detail}</p>
      </div>
    </div>
  );
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

  const { data: v } = await admin
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (!v) notFound();

  if (v.user_id) {
    redirect(`/dashboard/results/${id}`);
  }

  const { data: lead } = await admin
    .from("leads")
    .select("id")
    .eq("verification_id", id)
    .limit(1)
    .single();

  const hasEmail = !!lead;

  const accountName = v.companies_house_name || v.extracted_company_name || v.company_name_input || v.payee_name || "Unknown";
  const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
  const description = v.marketplace_item_title || (v.invoice_file_path ? v.invoice_file_path.split("/").pop()?.replace(/^\d+-/, "") : null) || "this payment";
  const isBusiness = v.payee_type === "business" || !!v.companies_house_name || !!v.companies_house_number || !!v.vat_number_input || !!v.extracted_vat_number;
  const isMarketplace = v.flow_type === "marketplace";
  const inputName = v.extracted_company_name || v.company_name_input || v.payee_name;
  const risk = v.overall_risk ?? "UNKNOWN";

  const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; message: string }> = {
    LOW: { bg: "bg-pass/[0.08]", text: "text-pass", border: "border-pass/20", icon: <CheckCircle2 className="size-6 text-pass" />, message: "Our checks look good. It\u2019s ok, move ahead!" },
    MEDIUM: { bg: "bg-warn/[0.08]", text: "text-warn", border: "border-warn/20", icon: <AlertTriangle className="size-6 text-warn" />, message: "Some checks returned warnings. Proceed with caution." },
    HIGH: { bg: "bg-fail/[0.08]", text: "text-fail", border: "border-fail/20", icon: <XCircle className="size-6 text-fail" />, message: "One or more checks have failed. We recommend you do not proceed." },
    UNKNOWN: { bg: "bg-white/[0.03]", text: "text-brand-muted", border: "border-white/[0.06]", icon: <Minus className="size-6 text-brand-muted" />, message: "We could not determine the risk level." },
  };
  const rc = riskConfig[risk] ?? riskConfig.UNKNOWN;

  if (!hasEmail) {
    return (
      <div className="mx-auto max-w-[625px] px-4 py-8 sm:px-6 min-h-screen bg-navy">
        <Button variant="ghost" className="mb-4 text-brand-muted-light hover:text-white hover:bg-white/[0.07] rounded-xl" render={<Link href="/" />}>
          <ArrowLeft className="size-4 mr-1" />
          Home
        </Button>
        <EmailGateForm verificationId={id} />
      </div>
    );
  }

  // ── Check statuses ────────────────────────────────────────────────
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
      vatDetail = match ? `VAT registered name: ${v.vat_api_name}` : `VAT number${vatNumber ? ` ${vatNumber}` : ""} is registered to "${v.vat_api_name}" \u2014 this does not match the payee name "${inputName}".`;
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
      if (months < 3) { tradingStatus = "WARN"; tradingDetail = "Less than 3 months old."; }
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
    <div className="mx-auto max-w-[625px] px-4 py-8 sm:px-6 min-h-screen bg-navy">
      <Button variant="ghost" className="mb-4 text-brand-muted-light hover:text-white hover:bg-white/[0.07] rounded-xl" render={<Link href="/" />}>
        <ArrowLeft className="size-4 mr-1" />
        Home
      </Button>

      <div className={`${rc.bg} ${rc.border} border rounded-2xl p-5 mb-6`}>
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">{rc.icon}</div>
          <div>
            <h1 className="text-lg text-white">
              You are paying {accountName}
              {amount != null && <span className="font-mono ml-1">{fmt(amount)}</span>}
            </h1>
            <p className="text-sm text-brand-muted-light mt-0.5">for {description}</p>
            <p className={`text-sm font-semibold mt-2 ${rc.text}`}>{rc.message}</p>
          </div>
        </div>
      </div>

      <span className="eyebrow block mb-3">Checks completed</span>

      <div className="space-y-2">
        {(() => {
          const statusOrder: Record<CheckStatus, number> = { FAIL: 0, WARN: 1, PASS: 2, UNVERIFIED: 3 };
          const checks: Array<{ icon: React.ReactNode; title: string; status: CheckStatus; detail: string }> = [];
          if (isBusiness) checks.push({ icon: <Building2 className="size-4 text-brand-muted-light" />, title: "Companies House", status: chStatus, detail: chDetail });
          if (showTrading && tradingDetail) checks.push({ icon: <CalendarDays className="size-4 text-brand-muted-light" />, title: "Business Trading History", status: tradingStatus, detail: tradingDetail });
          if (showAccounts && accountsDetail) checks.push({ icon: <FileText className="size-4 text-brand-muted-light" />, title: "Last Accounts Filed", status: accountsStatus, detail: accountsDetail });
          if (isBusiness) checks.push({ icon: <ShieldCheck className="size-4 text-brand-muted-light" />, title: "VAT Number", status: vatStatus, detail: vatDetail });
          checks.push({ icon: <Landmark className="size-4 text-brand-muted-light" />, title: "Confirmation of Payee", status: copStatus, detail: copDetail });
          if (showReviews) checks.push({ icon: <Star className="size-4 text-brand-muted-light" />, title: "Online Reviews", status: reviewsStatus, detail: reviewsDetail });
          if (showMarketplace) checks.push({ icon: <ShoppingCart className="size-4 text-brand-muted-light" />, title: "Marketplace Price Check", status: mktStatus, detail: mktDetail });
          checks.sort((a, b) => {
            const so = statusOrder[a.status] - statusOrder[b.status];
            return so !== 0 ? so : a.title.localeCompare(b.title);
          });
          return checks.map((c) => (
            <CheckRow key={c.title} icon={c.icon} title={c.title} status={c.status} detail={c.detail} />
          ));
        })()}
      </div>

      {/* Marketplace valuation */}
      {isMarketplace && v.marketplace_item_title && v.valuation_summary && (
        <div className="mt-6">
          <span className="eyebrow block mb-3">Marketplace valuation</span>
          <div className="rounded-2xl bg-navy-card border border-white/[0.06] p-5 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="size-5 text-brand-muted-light" />
              <span className="text-sm font-semibold text-white">{v.marketplace_item_title}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {v.marketplace_listed_price != null && (
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <span className="text-xs text-brand-muted block mb-0.5">Listed price</span>
                  <span className="font-mono font-semibold text-base text-white">{fmt(Number(v.marketplace_listed_price))}</span>
                </div>
              )}
              {v.valuation_min != null && v.valuation_max != null && (
                <div className="rounded-xl bg-white/[0.04] p-3">
                  <span className="text-xs text-brand-muted block mb-0.5">Est. market value</span>
                  <span className="font-mono font-semibold text-base text-white">{fmt(Number(v.valuation_min))} &ndash; {fmt(Number(v.valuation_max))}</span>
                </div>
              )}
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-sm leading-relaxed whitespace-pre-line text-brand-muted-light">{v.valuation_summary}</p>
            </div>
          </div>
        </div>
      )}

      {/* CTA to sign up */}
      <div className="mt-8 rounded-2xl border border-coral/20 bg-coral/[0.05] p-6 text-center">
        <h3 className="font-semibold text-white">Want to verify more payments?</h3>
        <p className="text-sm text-brand-muted-light mt-1">
          Create an account to save your checks, access the API, and buy credits.
        </p>
        <Button
          className="mt-4 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] rounded-xl hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
          render={<Link href="/auth/login?tab=signup" />}
        >
          Create a free account
        </Button>
      </div>
    </div>
  );
}
