import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isOBConnectEnabled } from "@/lib/obconnect";
import { PaymentSection } from "@/components/payment-section";
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
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (30.44 * 24 * 60 * 60 * 1000));
}

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `\u00A3${Number(amount).toLocaleString("en-GB", { minimumFractionDigits: 2 })}`;
}

export default async function VerificationResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: v } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!v) notFound();

  // ── Derive values ──────────────────────────────────────────────────
  const accountName = v.companies_house_name || v.extracted_company_name || v.company_name_input || v.payee_name || "Unknown";
  const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
  const description = v.marketplace_item_title || (v.invoice_file_path ? v.invoice_file_path.split("/").pop()?.replace(/^\d+-/, "") : null) || "this payment";
  const isBusiness = v.payee_type === "business" || !!v.companies_house_name || !!v.companies_house_number || !!v.vat_number_input || !!v.extracted_vat_number;
  const isMarketplace = v.flow_type === "marketplace";

  const inputName = v.extracted_company_name || v.company_name_input || v.payee_name;

  // ── Risk messaging ─────────────────────────────────────────────────
  const risk = v.overall_risk ?? "UNKNOWN";
  const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; heading: string; message: string }> = {
    LOW: {
      bg: "bg-emerald-50 dark:bg-emerald-950/20",
      text: "text-emerald-800 dark:text-emerald-400",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: <CheckCircle2 className="size-6 text-emerald-600" />,
      heading: "You are paying " + accountName,
      message: "Our checks look good. It\u2019s ok, move ahead!",
    },
    MEDIUM: {
      bg: "bg-amber-50 dark:bg-amber-950/20",
      text: "text-amber-800 dark:text-amber-400",
      border: "border-amber-200 dark:border-amber-800",
      icon: <AlertTriangle className="size-6 text-amber-500" />,
      heading: "You are paying " + accountName,
      message: "Some checks returned warnings. Proceed with caution.",
    },
    HIGH: {
      bg: "bg-red-50 dark:bg-red-950/20",
      text: "text-red-800 dark:text-red-400",
      border: "border-red-200 dark:border-red-800",
      icon: <XCircle className="size-6 text-red-600" />,
      heading: "You are paying " + accountName,
      message: "One or more checks have failed. We recommend you do not proceed.",
    },
    UNKNOWN: {
      bg: "bg-zinc-50 dark:bg-zinc-900/20",
      text: "text-zinc-700 dark:text-zinc-400",
      border: "border-zinc-200 dark:border-zinc-700",
      icon: <Minus className="size-6 text-zinc-400" />,
      heading: "You are paying " + accountName,
      message: "We could not determine the risk level for this payment.",
    },
  };
  const rc = riskConfig[risk] ?? riskConfig.UNKNOWN;

  // ── Check statuses ─────────────────────────────────────────────────

  // Companies House
  let chStatus: CheckStatus = "UNVERIFIED";
  let chDetail = "Companies House was not checked.";
  if (v.companies_house_result) {
    if (v.companies_house_name) {
      const match = namesMatch(inputName, v.companies_house_name);
      chStatus = match ? "PASS" : "WARN";
      chDetail = match
        ? `Registered name: ${v.companies_house_name}`
        : `Name mismatch: "${inputName}" vs registered "${v.companies_house_name}"`;
    } else {
      chStatus = "FAIL";
      chDetail = "Company not found on Companies House register.";
    }
  }

  // VAT
  let vatStatus: CheckStatus = "UNVERIFIED";
  let vatDetail = "HMRC VAT check was not run.";
  if (v.hmrc_vat_result) {
    if (v.vat_api_name) {
      const match = namesMatch(inputName, v.vat_api_name);
      vatStatus = match ? "PASS" : "WARN";
      vatDetail = match
        ? `VAT registered name: ${v.vat_api_name}`
        : `Name mismatch: "${inputName}" vs VAT register "${v.vat_api_name}"`;
    } else {
      vatStatus = "FAIL";
      vatDetail = "VAT number not found on HMRC register.";
    }
  }

  // CoP
  let copStatus: CheckStatus = "UNVERIFIED";
  let copDetail = "Bank verification was not run.";
  if (v.cop_result) {
    if (v.cop_result === "FULL_MATCH") {
      copStatus = "PASS";
      copDetail = "Full match confirmed by the bank.";
    } else if (v.cop_result === "PARTIAL_MATCH") {
      copStatus = "WARN";
      copDetail = `Partial match. ${v.cop_reason ?? "Close but not exact."}`;
    } else {
      copStatus = "FAIL";
      copDetail = `No match. ${v.cop_reason ?? "Account name does not match."}`;
    }
  }

  // Business Trading History — only if CH data pulled
  let tradingStatus: CheckStatus = "UNVERIFIED";
  let tradingDetail = "";
  const showTrading = !!v.companies_house_result && !!v.companies_house_name;
  if (showTrading && v.companies_house_incorporated_date) {
    const months = monthsSince(v.companies_house_incorporated_date);
    if (months !== null) {
      if (months < 3) {
        tradingStatus = "WARN";
        tradingDetail = `Incorporated less than 3 months ago (${v.companies_house_incorporated_date}). Very new company.`;
      } else {
        tradingStatus = "PASS";
        const years = Math.floor(months / 12);
        tradingDetail = years >= 1
          ? `Incorporated ${years} year${years === 1 ? "" : "s"} ago (${v.companies_house_incorporated_date}).`
          : `Incorporated ${months} months ago (${v.companies_house_incorporated_date}).`;
      }
    }
  }

  // Accounts Filed — only if CH data pulled
  let accountsStatus: CheckStatus = "UNVERIFIED";
  let accountsDetail = "";
  const showAccounts = !!v.companies_house_result && !!v.companies_house_name;
  if (showAccounts) {
    if (v.companies_house_accounts_date) {
      if (v.companies_house_accounts_overdue) {
        accountsStatus = "FAIL";
        accountsDetail = `Last accounts: ${v.companies_house_accounts_date}. Accounts are OVERDUE.`;
      } else {
        accountsStatus = "PASS";
        accountsDetail = `Last accounts: ${v.companies_house_accounts_date}. Up to date.`;
      }
    } else {
      accountsStatus = "WARN";
      accountsDetail = "No accounts filing information found.";
    }
  }

  // Marketplace Price Check
  let marketplaceStatus: CheckStatus = "UNVERIFIED";
  let marketplaceDetail = "";
  const showMarketplaceValuation = isMarketplace && v.valuation_min != null && v.valuation_max != null && v.marketplace_listed_price != null;
  if (showMarketplaceValuation) {
    const listed = Number(v.marketplace_listed_price);
    const minVal = Number(v.valuation_min);
    const maxVal = Number(v.valuation_max);
    if (listed >= minVal * 0.8 && listed <= maxVal * 1.2) {
      marketplaceStatus = "PASS";
      marketplaceDetail = `Listed at ${fmt(listed)}, within market range of ${fmt(minVal)}\u2013${fmt(maxVal)}.`;
    } else if (listed < minVal * 0.5) {
      marketplaceStatus = "FAIL";
      marketplaceDetail = `Listed at ${fmt(listed)}, significantly below range ${fmt(minVal)}\u2013${fmt(maxVal)}. Could indicate a scam.`;
    } else {
      marketplaceStatus = "WARN";
      marketplaceDetail = `Listed at ${fmt(listed)}, outside range ${fmt(minVal)}\u2013${fmt(maxVal)}.`;
    }
  }

  // Ad Price vs Invoice
  let adVsInvoiceStatus: CheckStatus = "UNVERIFIED";
  let adVsInvoiceDetail = "";
  const showAdVsInvoice = isMarketplace && v.marketplace_listed_price != null;
  if (showAdVsInvoice) {
    const adPrice = Number(v.marketplace_listed_price);
    const invoiceAmt = v.extracted_invoice_amount ?? v.invoice_amount;
    if (invoiceAmt != null) {
      const inv = Number(invoiceAmt);
      const diff = inv - adPrice;
      if (Math.abs(diff) < 1) {
        adVsInvoiceStatus = "PASS";
        adVsInvoiceDetail = `Invoice (${fmt(inv)}) matches ad price (${fmt(adPrice)}).`;
      } else if (diff > 0) {
        adVsInvoiceStatus = "WARN";
        adVsInvoiceDetail = `Invoice (${fmt(inv)}) is ${fmt(diff)} more than ad price (${fmt(adPrice)}).`;
      } else {
        adVsInvoiceStatus = Math.abs(diff) > adPrice * 0.2 ? "WARN" : "PASS";
        adVsInvoiceDetail = `Invoice (${fmt(inv)}) is ${fmt(Math.abs(diff))} less than ad price (${fmt(adPrice)}).`;
      }
    } else {
      adVsInvoiceDetail = "No invoice amount available to compare.";
    }
  }

  return (
    <div className="mx-auto max-w-[625px] px-4 py-8 sm:px-6">
      {/* Back */}
      <Button variant="ghost" size="sm" className="mb-4" render={<Link href="/dashboard" />}>
        <ArrowLeft className="size-4 mr-1" />
        Dashboard
      </Button>

      {/* ── Hero summary ──────────────────────────────────────────────── */}
      <Card className={`${rc.bg} ${rc.border} border mb-6`}>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">{rc.icon}</div>
            <div>
              <h1 className="text-lg font-semibold">
                {rc.heading}
                {amount != null && <span className="font-mono ml-1">{fmt(amount)}</span>}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                for {description}
              </p>
              <p className={`text-sm font-medium mt-2 ${rc.text}`}>
                {rc.message}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Checks ────────────────────────────────────────────────────── */}
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
        Checks completed
      </h2>

      <div className="space-y-2">
        {/* Companies House — only for business */}
        {isBusiness && (
          <CheckCard
            icon={<Building2 className="size-4 text-muted-foreground" />}
            title="Companies House"
            status={chStatus}
            detail={chDetail}
            accentColor={accentForStatus(chStatus)}
          />
        )}

        {/* Business Trading History — only if CH check pulled */}
        {showTrading && tradingDetail && (
          <CheckCard
            icon={<CalendarDays className="size-4 text-muted-foreground" />}
            title="Business Trading History"
            status={tradingStatus}
            detail={tradingDetail}
            accentColor={accentForStatus(tradingStatus)}
          />
        )}

        {/* Accounts Filed — only if CH check pulled */}
        {showAccounts && accountsDetail && (
          <CheckCard
            icon={<FileText className="size-4 text-muted-foreground" />}
            title="Last Accounts Filed"
            status={accountsStatus}
            detail={accountsDetail}
            accentColor={accentForStatus(accountsStatus)}
          />
        )}

        {/* VAT — only for business */}
        {isBusiness && (
          <CheckCard
            icon={<ShieldCheck className="size-4 text-muted-foreground" />}
            title="VAT Number"
            status={vatStatus}
            detail={vatDetail}
            accentColor={accentForStatus(vatStatus)}
          />
        )}

        {/* CoP — always */}
        <CheckCard
          icon={<Landmark className="size-4 text-muted-foreground" />}
          title="Confirmation of Payee"
          status={copStatus}
          detail={copDetail}
          accentColor={accentForStatus(copStatus)}
        />

        {/* Marketplace Price Check — only if marketplace + valuation exists */}
        {showMarketplaceValuation && (
          <CheckCard
            icon={<ShoppingCart className="size-4 text-muted-foreground" />}
            title="Marketplace Price Check"
            status={marketplaceStatus}
            detail={marketplaceDetail}
            accentColor={accentForStatus(marketplaceStatus)}
          />
        )}

        {/* Ad vs Invoice — only if marketplace */}
        {showAdVsInvoice && adVsInvoiceDetail && (
          <CheckCard
            icon={<FileText className="size-4 text-muted-foreground" />}
            title="Ad Price vs Invoice Amount"
            status={adVsInvoiceStatus}
            detail={adVsInvoiceDetail}
            accentColor={accentForStatus(adVsInvoiceStatus)}
          />
        )}
      </div>

      {/* ── Payment section ──────────────────────────────────────────── */}
      <div className="mt-6">
        <PaymentSection
          data={{
            verificationId: v.id,
            amount: amount != null ? Number(amount) : null,
            payeeName: accountName,
            sortCode: v.extracted_sort_code ?? v.sort_code ?? "",
            accountNumber: v.extracted_account_number ?? v.account_number ?? "",
            reference: `WAP-${v.id.slice(0, 8).toUpperCase()}`,
            overallRisk: v.overall_risk,
            sandboxMode: !isOBConnectEnabled(),
          }}
        />
      </div>
    </div>
  );
}
