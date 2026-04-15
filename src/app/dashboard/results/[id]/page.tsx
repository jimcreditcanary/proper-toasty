import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isOBConnectEnabled } from "@/lib/obconnect";
import { PaymentButton } from "@/components/payment-section";
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
    PASS: "text-emerald-600",
    WARN: "text-warn",
    FAIL: "text-red-600",
    UNVERIFIED: "text-slate-400",
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
  if (s === "PASS") return "bg-emerald-50 border border-emerald-200";
  if (s === "WARN") return "bg-warn/[0.08] border border-warn/20";
  if (s === "FAIL") return "bg-red-50 border border-red-200";
  return "bg-slate-50 border border-slate-200";
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
          <span className="text-sm font-semibold text-slate-900">{title}</span>
          <StatusBadge status={status} />
        </div>
        <p className="text-xs text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

/** Strip common suffixes and normalise for comparison */
function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[.,\-()'"]/g, "")
    .replace(/\b(ltd|limited|plc|llp|inc|llc|uk|the|trading|as|t\/a|co)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Simple word-overlap similarity (Jaccard-ish) */
function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size);
}

/** Check if one normalised name contains the other when spaces removed */
function compactMatch(a: string, b: string): boolean {
  const ca = a.replace(/\s/g, "");
  const cb = b.replace(/\s/g, "");
  return ca === cb || ca.includes(cb) || cb.includes(ca);
}

type NameMatchResult = "exact" | "fuzzy" | "none";

function compareNames(a: string | null, b: string | null): NameMatchResult {
  if (!a || !b) return "none";
  const rawA = a.toLowerCase().trim();
  const rawB = b.toLowerCase().trim();

  // Direct substring match on raw names → exact
  if (rawA === rawB || rawA.includes(rawB) || rawB.includes(rawA)) return "exact";

  const na = normaliseName(a);
  const nb = normaliseName(b);

  // Normalised exact or substring → exact
  if (na === nb || na.includes(nb) || nb.includes(na)) return "exact";

  // Compact match (e.g. "style commerce" vs "stylecommerce") → fuzzy
  if (compactMatch(na, nb)) return "fuzzy";

  // Word overlap ≥ 50% → fuzzy
  if (wordSimilarity(na, nb) >= 0.5) return "fuzzy";

  return "none";
}

// Keep simple boolean for trading/accounts visibility
function namesMatch(a: string | null, b: string | null): boolean {
  return compareNames(a, b) !== "none";
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

  // Check if user is admin
  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = userData?.role === "admin";

  // Admins can view any verification; regular users only their own
  let query = admin
    .from("verifications")
    .select("*")
    .eq("id", id);

  if (!isAdmin) {
    query = query.eq("user_id", user.id);
  }

  const { data: v } = await query.single();

  if (!v) notFound();

  const accountName = v.companies_house_name || v.extracted_company_name || v.company_name_input || v.payee_name || "Unknown";
  const amount = v.extracted_invoice_amount ?? v.invoice_amount ?? v.marketplace_listed_price ?? null;
  const description = v.marketplace_item_title || (v.invoice_file_path ? v.invoice_file_path.split("/").pop()?.replace(/^\d+-/, "") : null) || "this payment";
  const isBusiness = v.payee_type === "business" || !!v.companies_house_name || !!v.companies_house_number || !!v.vat_number_input || !!v.extracted_vat_number;
  const isMarketplace = v.flow_type === "marketplace";
  const inputName = v.extracted_company_name || v.company_name_input || v.payee_name;

  const risk = v.overall_risk ?? "UNKNOWN";
  const riskConfig: Record<string, { bg: string; text: string; border: string; icon: React.ReactNode; message: string }> = {
    LOW: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
      icon: <CheckCircle2 className="size-6 text-emerald-600" />,
      message: "Our checks look good. It\u2019s ok, move ahead!",
    },
    MEDIUM: {
      bg: "bg-warn/[0.08]",
      text: "text-warn",
      border: "border-warn/20",
      icon: <AlertTriangle className="size-6 text-warn" />,
      message: "Some checks returned warnings. Proceed with caution.",
    },
    HIGH: {
      bg: "bg-red-50",
      text: "text-red-600",
      border: "border-red-200",
      icon: <XCircle className="size-6 text-red-600" />,
      message: "One or more checks have failed. We recommend you do not proceed.",
    },
    UNKNOWN: {
      bg: "bg-slate-50",
      text: "text-slate-400",
      border: "border-slate-200",
      icon: <Minus className="size-6 text-slate-400" />,
      message: "We could not determine the risk level for this payment.",
    },
  };
  const rc = riskConfig[risk] ?? riskConfig.UNKNOWN;

  // ── Check statuses ─────────────────────────────────────────────────
  let chStatus: CheckStatus = "UNVERIFIED";
  let chDetail = "Companies House was not checked.";
  if (v.companies_house_result) {
    if (v.companies_house_name) {
      const match = compareNames(inputName, v.companies_house_name);
      if (match === "exact") {
        chStatus = "PASS";
        chDetail = `Registered name: ${v.companies_house_name}`;
      } else if (match === "fuzzy") {
        chStatus = "WARN";
        chDetail = `Close match: "${inputName}" vs registered "${v.companies_house_name}"`;
      } else {
        chStatus = "FAIL";
        chDetail = `Name mismatch: "${inputName}" vs registered "${v.companies_house_name}"`;
      }
    } else {
      chStatus = "FAIL";
      chDetail = "Company not found on Companies House register.";
    }
  }

  let vatStatus: CheckStatus = "UNVERIFIED";
  let vatDetail = "HMRC VAT check was not run.";
  const vatNumber = v.vat_number_input || v.extracted_vat_number;
  if (v.hmrc_vat_result) {
    if (v.vat_api_name) {
      const match = compareNames(inputName, v.vat_api_name);
      if (match === "exact") {
        vatStatus = "PASS";
        vatDetail = `VAT registered name: ${v.vat_api_name}`;
      } else if (match === "fuzzy") {
        vatStatus = "WARN";
        vatDetail = `VAT number${vatNumber ? ` ${vatNumber}` : ""} is registered to "${v.vat_api_name}" \u2014 close match to "${inputName}".`;
      } else {
        vatStatus = "FAIL";
        vatDetail = `VAT number${vatNumber ? ` ${vatNumber}` : ""} is registered to "${v.vat_api_name}" \u2014 this does not match the payee name "${inputName}".`;
      }
    } else {
      vatStatus = "FAIL";
      vatDetail = `VAT number${vatNumber ? ` ${vatNumber}` : ""} not found on HMRC register.`;
    }
  }

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

  let tradingStatus: CheckStatus = "UNVERIFIED";
  let tradingDetail = "";
  const chNameMatches = !!v.companies_house_name && namesMatch(inputName, v.companies_house_name);
  const showTrading = !!v.companies_house_result && chNameMatches;
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

  let accountsStatus: CheckStatus = "UNVERIFIED";
  let accountsDetail = "";
  const showAccounts = !!v.companies_house_result && chNameMatches;
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

  let reviewsStatus: CheckStatus = "UNVERIFIED";
  let reviewsDetail = "";
  let showReviews = isBusiness && (v.google_reviews_rating != null || v.google_reviews_count != null || v.google_reviews_summary != null);
  if (showReviews) {
    const rating = v.google_reviews_rating != null ? Number(v.google_reviews_rating) : null;
    const count = v.google_reviews_count != null ? Number(v.google_reviews_count) : null;
    if (rating != null) {
      if (rating >= 4.0) reviewsStatus = "PASS";
      else if (rating >= 3.0) reviewsStatus = "WARN";
      else reviewsStatus = "FAIL";
      reviewsDetail = `${rating.toFixed(1)}\u2605${count != null ? ` (${count} reviews)` : ""}. ${v.google_reviews_summary ?? ""}`.trim();
    } else if (count != null && count > 0) {
      reviewsStatus = "PASS";
      reviewsDetail = v.google_reviews_summary ?? `${count} reviews found online.`;
    } else if (v.google_reviews_summary && !v.google_reviews_summary.toLowerCase().includes("no reviews found") && !v.google_reviews_summary.toLowerCase().includes("no online reviews")) {
      reviewsStatus = "PASS";
      reviewsDetail = v.google_reviews_summary;
    } else {
      // No reviews found — hide the tile entirely
      showReviews = false;
    }
  }

  // ── Sort: FAIL > WARN > PASS > UNVERIFIED, then A-Z ──────────────
  const statusOrder: Record<CheckStatus, number> = { FAIL: 0, WARN: 1, PASS: 2, UNVERIFIED: 3 };
  const allChecks: Array<{ icon: React.ReactNode; title: string; status: CheckStatus; detail: string }> = [];

  if (isBusiness) allChecks.push({ icon: <Building2 className="size-4 text-slate-500" />, title: "Companies House", status: chStatus, detail: chDetail });
  if (showTrading && tradingDetail) allChecks.push({ icon: <CalendarDays className="size-4 text-slate-500" />, title: "Business Trading History", status: tradingStatus, detail: tradingDetail });
  if (showAccounts && accountsDetail) allChecks.push({ icon: <FileText className="size-4 text-slate-500" />, title: "Last Accounts Filed", status: accountsStatus, detail: accountsDetail });
  if (isBusiness) allChecks.push({ icon: <ShieldCheck className="size-4 text-slate-500" />, title: "VAT Number", status: vatStatus, detail: vatDetail });
  allChecks.push({ icon: <Landmark className="size-4 text-slate-500" />, title: "Confirmation of Payee", status: copStatus, detail: copDetail });
  if (showReviews) allChecks.push({ icon: <Star className="size-4 text-slate-500" />, title: "Online Reviews", status: reviewsStatus, detail: reviewsDetail });
  if (showAdVsInvoice && adVsInvoiceDetail) allChecks.push({ icon: <FileText className="size-4 text-slate-500" />, title: "Ad Price vs Invoice Amount", status: adVsInvoiceStatus, detail: adVsInvoiceDetail });

  allChecks.sort((a, b) => {
    const so = statusOrder[a.status] - statusOrder[b.status];
    if (so !== 0) return so;
    return a.title.localeCompare(b.title);
  });

  const paymentData = {
    verificationId: v.id,
    amount: amount != null ? Number(amount) : null,
    payeeName: accountName,
    sortCode: v.extracted_sort_code ?? v.sort_code ?? "",
    accountNumber: v.extracted_account_number ?? v.account_number ?? "",
    reference: `WAP-${v.id.slice(0, 8).toUpperCase()}`,
    overallRisk: v.overall_risk,
    sandboxMode: !isOBConnectEnabled(),
  };

  const hasMarketplaceValuation = isMarketplace && v.marketplace_item_title;

  const categoryLabels: Record<string, string> = {
    vehicle: "Vehicle",
    property: "Property",
    investment: "Investment",
    building_work: "Building work",
    services: "Paying for services",
    other: "Something else",
  };
  const categoryLabel = v.purchase_category ? categoryLabels[v.purchase_category] ?? v.purchase_category : null;

  return (
    <div className={`mx-auto px-4 py-8 sm:px-6 ${hasMarketplaceValuation ? "max-w-5xl" : "max-w-[625px]"}`}>
      <Button
        className="mb-4 h-11 px-5 text-[15px] text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
        variant="ghost"
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft className="size-4 mr-1.5" />
        Dashboard
      </Button>

      {/* Hero: "You are paying" + Pay button */}
      <div className={`${rc.bg} ${rc.border} border rounded-2xl p-5 sm:p-6 mb-6`}>
        <div className="flex items-start gap-3 mb-4">
          <div className="shrink-0 mt-0.5">{rc.icon}</div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold text-slate-900 break-words">
              You are paying {accountName}
            </h1>
            {amount != null && (
              <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{fmt(amount)}</p>
            )}
            <p className="text-sm text-slate-500 mt-1">
              for {description}
            </p>
            <p className={`text-sm font-semibold mt-2 ${rc.text}`}>
              {rc.message}
            </p>
          </div>
        </div>
        <PaymentButton data={paymentData} />
      </div>

      {/* Context badges */}
      {categoryLabel && (
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
            Buying: {categoryLabel}
          </span>
        </div>
      )}

      {/* Main content: marketplace = 2 col, otherwise single col */}
      {hasMarketplaceValuation ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          {/* Left: Checks */}
          <div>
            <span className="eyebrow block mb-3">Checks completed</span>
            <div className="space-y-2">
              {allChecks.map((check) => (
                <CheckRow
                  key={check.title}
                  icon={check.icon}
                  title={check.title}
                  status={check.status}
                  detail={check.detail}
                />
              ))}
            </div>
          </div>

          {/* Right: Marketplace valuation */}
          <div>
            <span className="eyebrow block mb-3">Marketplace valuation</span>
            <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-4 sticky top-8">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart className="size-5 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900">{v.marketplace_item_title}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {v.marketplace_listed_price != null && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-400 block mb-0.5">Listed price</span>
                    <span className="font-mono font-semibold text-base text-slate-900">{fmt(Number(v.marketplace_listed_price))}</span>
                  </div>
                )}
                {v.valuation_min != null && v.valuation_max != null && (
                  <div className="rounded-xl bg-slate-50 p-3">
                    <span className="text-xs text-slate-400 block mb-0.5">Est. market value</span>
                    <span className="font-mono font-semibold text-base text-slate-900">
                      {fmt(Number(v.valuation_min))} &ndash; {fmt(Number(v.valuation_max))}
                    </span>
                  </div>
                )}
              </div>

              {showMarketplaceValuation && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Price assessment:</span>
                  <StatusBadge status={marketplaceStatus} />
                </div>
              )}

              {v.valuation_summary && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-line text-slate-500">{v.valuation_summary}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Non-marketplace: centered single column */
        <div>
          <span className="eyebrow block mb-3">Checks completed</span>
          <div className="space-y-2">
            {allChecks.map((check) => (
              <CheckRow
                key={check.title}
                icon={check.icon}
                title={check.title}
                status={check.status}
                detail={check.detail}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
