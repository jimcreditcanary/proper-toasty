import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { isOBConnectEnabled } from "@/lib/obconnect";
import { PaymentSection } from "@/components/payment-section";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  Download,
  User,
} from "lucide-react";

type CheckStatus = "PASS" | "WARN" | "FAIL" | "UNVERIFIED";

function StatusBadge({ status }: { status: CheckStatus }) {
  const styles: Record<CheckStatus, string> = {
    PASS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
    WARN: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
    FAIL: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
    UNVERIFIED:
      "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function StatusIcon({ status }: { status: CheckStatus }) {
  switch (status) {
    case "PASS":
      return <CheckCircle2 className="size-5 text-emerald-600" />;
    case "WARN":
      return <AlertTriangle className="size-5 text-amber-500" />;
    case "FAIL":
      return <XCircle className="size-5 text-red-600" />;
    default:
      return <Minus className="size-5 text-zinc-400" />;
  }
}

function RiskBadge({ risk }: { risk: string | null }) {
  if (!risk) return null;
  const map: Record<string, { label: string; classes: string }> = {
    LOW: {
      label: "LOW RISK",
      classes:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    },
    MEDIUM: {
      label: "MEDIUM RISK",
      classes:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    },
    HIGH: {
      label: "HIGH RISK",
      classes:
        "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    },
    UNKNOWN: {
      label: "UNKNOWN",
      classes:
        "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700",
    },
  };
  const entry = map[risk] ?? map.UNKNOWN;
  return (
    <span
      className={`inline-flex items-center rounded-lg border px-3 py-1.5 text-sm font-semibold ${entry.classes}`}
    >
      {entry.label}
    </span>
  );
}

function CheckCard({
  icon,
  title,
  status,
  detail,
  accentColor,
}: {
  icon: React.ReactNode;
  title: string;
  status: CheckStatus;
  detail: string;
  accentColor: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}
      />
      <CardContent className="flex items-start gap-3 pt-4 pl-5">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-sm font-medium">{title}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function accentForStatus(status: CheckStatus): string {
  switch (status) {
    case "PASS":
      return "bg-emerald-500";
    case "WARN":
      return "bg-amber-500";
    case "FAIL":
      return "bg-red-500";
    default:
      return "bg-zinc-300 dark:bg-zinc-600";
  }
}

function namesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  return na === nb || na.includes(nb) || nb.includes(na);
}

function yearsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor(
    (now.getTime() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000)
  );
}

export default async function VerificationResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) notFound();

  const { data: v } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!v) notFound();

  // ── Derive check statuses ──────────────────────────────────────────

  // 1. Company Name - Companies House
  const inputName = v.extracted_company_name || v.company_name_input || v.payee_name;
  const chNameMatch = v.companies_house_name
    ? namesMatch(inputName, v.companies_house_name)
    : false;
  let chNameStatus: CheckStatus = "UNVERIFIED";
  let chNameDetail = "Companies House was not checked.";
  if (v.companies_house_result) {
    if (v.companies_house_name) {
      chNameStatus = chNameMatch ? "PASS" : "WARN";
      chNameDetail = chNameMatch
        ? `Matches: ${v.companies_house_name}`
        : `Mismatch: input "${inputName}" vs registered "${v.companies_house_name}"`;
    } else {
      chNameStatus = "FAIL";
      chNameDetail = "Company not found on Companies House register.";
    }
  }

  // 2. Company Name - VAT Register
  let vatNameStatus: CheckStatus = "UNVERIFIED";
  let vatNameDetail = "HMRC VAT check was not run.";
  if (v.hmrc_vat_result) {
    if (v.vat_api_name) {
      const vatMatch = namesMatch(inputName, v.vat_api_name);
      vatNameStatus = vatMatch ? "PASS" : "WARN";
      vatNameDetail = vatMatch
        ? `Matches: ${v.vat_api_name}`
        : `Mismatch: input "${inputName}" vs VAT register "${v.vat_api_name}"`;
    } else {
      vatNameStatus = "FAIL";
      vatNameDetail = "VAT number not found on HMRC register.";
    }
  }

  // 3. Confirmation of Payee
  let copStatus: CheckStatus = "UNVERIFIED";
  let copDetail = "Bank verification was not run.";
  if (v.cop_result) {
    if (v.cop_result === "FULL_MATCH") {
      copStatus = "PASS";
      copDetail = "Full match confirmed by the bank.";
    } else if (v.cop_result === "PARTIAL_MATCH") {
      copStatus = "WARN";
      copDetail = `Partial match. ${v.cop_reason ?? "The name is a close but not exact match."}`;
    } else {
      copStatus = "FAIL";
      copDetail = `No match. ${v.cop_reason ?? "The account name does not match."}`;
    }
  }

  // 4. Marketplace Price Check
  let marketplaceStatus: CheckStatus = "UNVERIFIED";
  let marketplaceDetail = "";
  if (v.flow_type === "marketplace") {
    if (
      v.marketplace_listed_price != null &&
      v.valuation_min != null &&
      v.valuation_max != null
    ) {
      const listed = Number(v.marketplace_listed_price);
      const minVal = Number(v.valuation_min);
      const maxVal = Number(v.valuation_max);
      if (listed >= minVal * 0.8 && listed <= maxVal * 1.2) {
        marketplaceStatus = "PASS";
        marketplaceDetail = `Listed at \u00A3${listed.toFixed(0)}, within market range of \u00A3${minVal.toFixed(0)}\u2013\u00A3${maxVal.toFixed(0)}.`;
      } else if (listed < minVal * 0.5) {
        marketplaceStatus = "FAIL";
        marketplaceDetail = `Listed at \u00A3${listed.toFixed(0)}, significantly below market range of \u00A3${minVal.toFixed(0)}\u2013\u00A3${maxVal.toFixed(0)}. This could indicate a scam.`;
      } else {
        marketplaceStatus = "WARN";
        marketplaceDetail = `Listed at \u00A3${listed.toFixed(0)}, outside market range of \u00A3${minVal.toFixed(0)}\u2013\u00A3${maxVal.toFixed(0)}.`;
      }
    } else {
      marketplaceDetail = "Marketplace valuation data not available.";
    }
  }

  // 5. Business Trading History
  let tradingStatus: CheckStatus = "UNVERIFIED";
  let tradingDetail = "Incorporation date not available.";
  if (v.companies_house_incorporated_date) {
    const years = yearsSince(v.companies_house_incorporated_date);
    if (years !== null) {
      if (years >= 3) {
        tradingStatus = "PASS";
        tradingDetail = `Incorporated ${years} years ago (${v.companies_house_incorporated_date}).`;
      } else if (years >= 1) {
        tradingStatus = "WARN";
        tradingDetail = `Incorporated only ${years} year${years === 1 ? "" : "s"} ago (${v.companies_house_incorporated_date}).`;
      } else {
        tradingStatus = "FAIL";
        tradingDetail = `Incorporated less than 1 year ago (${v.companies_house_incorporated_date}). Very new company.`;
      }
    }
  }

  // 6. Accounts Filed
  let accountsStatus: CheckStatus = "UNVERIFIED";
  let accountsDetail = "Accounts filing data not available.";
  if (v.companies_house_accounts_date) {
    if (v.companies_house_accounts_overdue) {
      accountsStatus = "FAIL";
      accountsDetail = `Last accounts filed: ${v.companies_house_accounts_date}. Accounts are OVERDUE.`;
    } else {
      accountsStatus = "PASS";
      accountsDetail = `Last accounts filed: ${v.companies_house_accounts_date}. Up to date.`;
    }
  } else if (v.companies_house_result && v.companies_house_name) {
    accountsStatus = "WARN";
    accountsDetail = "No accounts filing information found.";
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Back link */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-4"
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft className="size-4 mr-1" />
        Back to dashboard
      </Button>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Verification results</h1>
          <p className="text-sm text-muted-foreground">
            {v.created_at
              ? new Date(v.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""}
          </p>
        </div>
        <RiskBadge risk={v.overall_risk} />
      </div>

      <Separator className="mb-8" />

      {/* Two-column layout */}
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column: checks */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Verification checks
          </h2>

          <CheckCard
            icon={<Building2 className="size-5 text-muted-foreground" />}
            title="Company Name \u2014 Companies House"
            status={chNameStatus}
            detail={chNameDetail}
            accentColor={accentForStatus(chNameStatus)}
          />

          <CheckCard
            icon={<ShieldCheck className="size-5 text-muted-foreground" />}
            title="Company Name \u2014 VAT Register"
            status={vatNameStatus}
            detail={vatNameDetail}
            accentColor={accentForStatus(vatNameStatus)}
          />

          <CheckCard
            icon={<Landmark className="size-5 text-muted-foreground" />}
            title="Confirmation of Payee"
            status={copStatus}
            detail={copDetail}
            accentColor={accentForStatus(copStatus)}
          />

          {v.flow_type === "marketplace" && (
            <CheckCard
              icon={
                <ShoppingCart className="size-5 text-muted-foreground" />
              }
              title="Marketplace Price Check"
              status={marketplaceStatus}
              detail={marketplaceDetail}
              accentColor={accentForStatus(marketplaceStatus)}
            />
          )}

          <CheckCard
            icon={<CalendarDays className="size-5 text-muted-foreground" />}
            title="Business Trading History"
            status={tradingStatus}
            detail={tradingDetail}
            accentColor={accentForStatus(tradingStatus)}
          />

          <CheckCard
            icon={<FileText className="size-5 text-muted-foreground" />}
            title="Accounts Filed"
            status={accountsStatus}
            detail={accountsDetail}
            accentColor={accentForStatus(accountsStatus)}
          />

          {/* Payment section */}
          <PaymentSection
            data={{
              verificationId: v.id,
              amount:
                v.extracted_invoice_amount ??
                v.invoice_amount ??
                (v.marketplace_listed_price != null
                  ? Number(v.marketplace_listed_price)
                  : null),
              payeeName:
                v.companies_house_name ??
                v.extracted_company_name ??
                v.company_name_input ??
                v.payee_name ??
                "",
              sortCode:
                v.extracted_sort_code ?? v.sort_code ?? "",
              accountNumber:
                v.extracted_account_number ?? v.account_number ?? "",
              reference: `WAP-${v.id.slice(0, 8).toUpperCase()}`,
              overallRisk: v.overall_risk,
              sandboxMode: !isOBConnectEnabled(),
            }}
          />
        </div>

        {/* Right column: invoice / payee info */}
        <div className="space-y-4">
          {v.invoice_file_path ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Invoice</CardTitle>
                </div>
                <CardDescription>Uploaded document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium truncate">
                  {v.invoice_file_path.split("/").pop()}
                </p>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="size-4 mr-1" />
                  Download invoice
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Payee summary</CardTitle>
                </div>
                <CardDescription>Manually entered details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y text-sm">
                  {v.payee_type && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Type</span>
                      <Badge variant="secondary">{v.payee_type}</Badge>
                    </div>
                  )}
                  {v.payee_name && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Name</span>
                      <span className="font-medium">{v.payee_name}</span>
                    </div>
                  )}
                  {(v.company_name_input || v.extracted_company_name) && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Company</span>
                      <span className="font-medium">
                        {v.extracted_company_name || v.company_name_input}
                      </span>
                    </div>
                  )}
                  {v.companies_house_number && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        Company no.
                      </span>
                      <span className="font-mono">
                        {v.companies_house_number}
                      </span>
                    </div>
                  )}
                  {(v.vat_number_input || v.extracted_vat_number) && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">VAT</span>
                      <span className="font-mono">
                        {v.extracted_vat_number || v.vat_number_input}
                      </span>
                    </div>
                  )}
                  {(v.sort_code || v.extracted_sort_code) && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Sort code</span>
                      <span className="font-mono">
                        {v.extracted_sort_code || v.sort_code}
                      </span>
                    </div>
                  )}
                  {(v.account_number || v.extracted_account_number) && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        Account no.
                      </span>
                      <span className="font-mono">
                        {v.extracted_account_number || v.account_number}
                      </span>
                    </div>
                  )}
                  {v.invoice_amount != null && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">Amount</span>
                      <span className="font-mono">
                        &pound;{Number(v.invoice_amount).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Marketplace info card */}
          {v.flow_type === "marketplace" && v.marketplace_item_title && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="size-4 text-muted-foreground" />
                  <CardTitle className="text-sm">Marketplace listing</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y text-sm">
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Item</span>
                    <span className="font-medium text-right max-w-[180px] truncate">
                      {v.marketplace_item_title}
                    </span>
                  </div>
                  {v.marketplace_listed_price != null && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        Listed price
                      </span>
                      <span className="font-mono">
                        &pound;{Number(v.marketplace_listed_price).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {v.valuation_min != null && v.valuation_max != null && (
                    <div className="flex justify-between py-2">
                      <span className="text-muted-foreground">
                        Market value
                      </span>
                      <span className="font-mono">
                        &pound;{Number(v.valuation_min).toFixed(0)}&ndash;
                        &pound;{Number(v.valuation_max).toFixed(0)}
                      </span>
                    </div>
                  )}
                  {v.valuation_summary && (
                    <div className="py-2">
                      <p className="text-muted-foreground">
                        {v.valuation_summary}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
