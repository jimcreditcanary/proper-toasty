import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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
  Car,
  Home,
  Globe,
  Info,
  Lightbulb,
  Eye,
} from "lucide-react";

// ── Types & helpers ────────────────────────────────────────────────

type CheckStatus = "PASS" | "WARN" | "FAIL" | "UNVERIFIED";

function fmt(amount: number | null | undefined): string {
  if (amount == null) return "";
  return `£${Number(amount).toLocaleString("en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function fmtRange(lo: number, hi: number): string {
  return `${fmt(lo)} – ${fmt(hi)}`;
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

function wordSimilarity(a: string, b: string): number {
  const wa = new Set(a.split(" ").filter(Boolean));
  const wb = new Set(b.split(" ").filter(Boolean));
  if (wa.size === 0 || wb.size === 0) return 0;
  let overlap = 0;
  for (const w of wa) if (wb.has(w)) overlap++;
  return overlap / Math.max(wa.size, wb.size);
}

function compareNames(
  a: string | null,
  b: string | null
): "exact" | "fuzzy" | "none" {
  if (!a || !b) return "none";
  const rawA = a.toLowerCase().trim();
  const rawB = b.toLowerCase().trim();
  if (rawA === rawB || rawA.includes(rawB) || rawB.includes(rawA)) return "exact";
  const na = normaliseName(a);
  const nb = normaliseName(b);
  if (na === nb || na.includes(nb) || nb.includes(na)) return "exact";
  const ca = na.replace(/\s/g, "");
  const cb = nb.replace(/\s/g, "");
  if (ca === cb || ca.includes(cb) || cb.includes(ca)) return "fuzzy";
  if (wordSimilarity(na, nb) >= 0.5) return "fuzzy";
  return "none";
}

function monthsSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return Math.floor(
    (new Date().getTime() - d.getTime()) / (30.44 * 24 * 60 * 60 * 1000)
  );
}

function tradingSummary(dateStr: string | null): string {
  const months = monthsSince(dateStr);
  if (months === null) return "Unknown";
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  const years = Math.floor(months / 12);
  const remMonths = months - years * 12;
  if (years < 3 && remMonths > 0) {
    return `${years} year${years === 1 ? "" : "s"}, ${remMonths} month${remMonths === 1 ? "" : "s"}`;
  }
  return `${years} year${years === 1 ? "" : "s"}`;
}

// ── Checklist item — consistent visual for each rule row ──────────

function ChecklistItem({
  status,
  title,
  detail,
}: {
  status: CheckStatus;
  title: string;
  detail: string;
}) {
  const styles: Record<
    CheckStatus,
    { bg: string; icon: React.ReactNode; titleColor: string }
  > = {
    PASS: {
      bg: "bg-emerald-50 border-emerald-200",
      icon: <CheckCircle2 className="size-5 text-emerald-600" />,
      titleColor: "text-slate-900",
    },
    WARN: {
      bg: "bg-amber-50 border-amber-200",
      icon: <AlertTriangle className="size-5 text-amber-600" />,
      titleColor: "text-slate-900",
    },
    FAIL: {
      bg: "bg-red-50 border-red-200",
      icon: <XCircle className="size-5 text-red-600" />,
      titleColor: "text-slate-900",
    },
    UNVERIFIED: {
      bg: "bg-slate-50 border-slate-200",
      icon: <Minus className="size-5 text-slate-400" />,
      titleColor: "text-slate-500",
    },
  };
  const s = styles[status];
  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex items-start gap-3">
        <div className="shrink-0 mt-0.5">{s.icon}</div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${s.titleColor}`}>{title}</p>
          <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">
            {detail}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-4">
      <span className="text-[11px] uppercase tracking-[0.14em] text-coral font-bold">
        {eyebrow}
      </span>
      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1 tracking-tight">
        {title}
      </h2>
      {sub && <p className="text-sm text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────

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

  const admin = createAdminClient();
  const { data: userData } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  const isAdmin = userData?.role === "admin";

  let query = admin.from("verifications").select("*").eq("id", id);
  if (!isAdmin) query = query.eq("user_id", user.id);
  const { data: v } = await query.single();
  if (!v) notFound();

  // ── Derived headline fields ────────────────────────────────────
  const accountName =
    v.companies_house_name ||
    v.extracted_company_name ||
    v.company_name_input ||
    v.payee_name ||
    "them";
  const amount =
    v.extracted_invoice_amount ??
    v.invoice_amount ??
    v.marketplace_listed_price ??
    null;
  const inputName =
    v.extracted_company_name || v.company_name_input || v.payee_name;

  const isBusiness =
    v.payee_type === "business" ||
    !!v.companies_house_name ||
    !!v.companies_house_number ||
    !!v.vat_number_input ||
    !!v.extracted_vat_number;
  const isVehicle = v.purchase_category === "vehicle";
  const isProperty = v.purchase_category === "property";
  const isMarketplace = v.flow_type === "marketplace";
  const isTradesperson = v.purchase_category === "tradesperson";

  const categoryLabel: Record<string, string> = {
    vehicle: "a vehicle",
    property: "a property",
    tradesperson: "a tradesperson",
    service: "a service",
    something_else: "this purchase",
    other: "this purchase",
  };
  const reasonText = v.purchase_category
    ? categoryLabel[v.purchase_category] ?? "this payment"
    : "this payment";

  // ── Overall risk copy ─────────────────────────────────────────
  const risk = v.overall_risk ?? "UNKNOWN";
  const heroConfig: Record<
    string,
    {
      bg: string;
      border: string;
      iconBg: string;
      icon: React.ReactNode;
      heading: string;
      body: string;
    }
  > = {
    LOW: {
      bg: "bg-emerald-50/60",
      border: "border-emerald-200",
      iconBg: "bg-emerald-500",
      icon: <CheckCircle2 className="size-6 text-white" />,
      heading: "All checks look good — you're OK to proceed.",
      body: "Nothing flagged. You can pay with reasonable confidence.",
    },
    MEDIUM: {
      bg: "bg-amber-50/60",
      border: "border-amber-200",
      iconBg: "bg-amber-500",
      icon: <AlertTriangle className="size-6 text-white" />,
      heading: "Worth a second look before you pay.",
      body: "A couple of checks returned warnings. Have a read through the detail below and decide how you want to proceed.",
    },
    HIGH: {
      bg: "bg-red-50/60",
      border: "border-red-200",
      iconBg: "bg-red-500",
      icon: <XCircle className="size-6 text-white" />,
      heading: "We'd hold off on paying.",
      body: "One or more serious issues came up in the checks. Read through the detail — you may want to walk away.",
    },
    UNKNOWN: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      iconBg: "bg-slate-400",
      icon: <Minus className="size-6 text-white" />,
      heading: "We couldn't confidently call this one.",
      body: "Not enough signal to give a verdict. Have a look through the detail below.",
    },
  };
  const hero = heroConfig[risk] ?? heroConfig.UNKNOWN;

  // ── Pre-derive JSON blobs we need for both checklist + render ──
  type PlateMatch = {
    visiblePlate?: string | null;
    expectedPlate?: string;
    matches?: boolean | null;
  };
  const plateMatch =
    (v.marketplace_plate_match as unknown as PlateMatch | null) ?? null;

  type VehicleTips = { tips?: string[] };
  const vehicleTips =
    (v.vehicle_tips as unknown as VehicleTips | null) ?? null;

  // ── Build checklist items ─────────────────────────────────────

  const checklist: { status: CheckStatus; title: string; detail: string }[] = [];

  // CoP — always show a row when bank details were provided. If the check
  // didn't return a result (upstream failure, etc.) surface it as
  // UNVERIFIED rather than hiding the row entirely.
  const hasBankDetails =
    !!(v.sort_code || v.extracted_sort_code) &&
    !!(v.account_number || v.extracted_account_number);
  if (v.cop_result) {
    const cop = v.cop_result;
    if (cop === "FULL_MATCH") {
      checklist.push({
        status: "PASS",
        title: "Bank account matches the name given",
        detail: `The bank confirmed a full name match for account ••••${(v.extracted_account_number ?? v.account_number ?? "").slice(-4) || "••••"}.`,
      });
    } else if (cop === "PARTIAL_MATCH") {
      const returned = v.cop_returned_name
        ? ` The bank has it as "${v.cop_returned_name}".`
        : "";
      checklist.push({
        status: "WARN",
        title: "Bank account is a close match — not exact",
        detail: `Not a perfect match on the name.${returned} Worth double-checking with the payee before sending money.`,
      });
    } else {
      checklist.push({
        status: "FAIL",
        title: "Bank account name doesn't match",
        detail:
          v.cop_reason ??
          "The bank could not confirm the name on the account. Do not proceed without verifying directly.",
      });
    }
  } else if (hasBankDetails) {
    checklist.push({
      status: "UNVERIFIED",
      title: "Bank account check couldn't be completed",
      detail:
        "The Confirmation of Payee check didn't return a result for this verification. Your bank details were captured but not verified — get in touch if you'd like us to re-run it.",
    });
  }

  // Companies House name match — always show a row when a company number
  // was supplied. Lack of a result means the check didn't run.
  const companyNumber = v.companies_house_number || null;
  if (isBusiness && v.companies_house_result) {
    if (v.companies_house_name) {
      const match = compareNames(inputName, v.companies_house_name);
      if (match === "exact") {
        checklist.push({
          status: "PASS",
          title: "Company name matches Companies House",
          detail: `Registered as "${v.companies_house_name}" (company no. ${v.companies_house_number ?? "unknown"}).`,
        });
      } else if (match === "fuzzy") {
        checklist.push({
          status: "WARN",
          title: "Company name is a close match",
          detail: `"${inputName}" is close but not identical to the registered name "${v.companies_house_name}".`,
        });
      } else {
        checklist.push({
          status: "FAIL",
          title: "Company name doesn't match Companies House",
          detail: `"${inputName}" vs registered "${v.companies_house_name}". This is a serious mismatch.`,
        });
      }
    } else {
      checklist.push({
        status: "FAIL",
        title: "Company number not found on Companies House",
        detail:
          "We couldn't match this company number to any active company on the UK register.",
      });
    }
  } else if (isBusiness && companyNumber) {
    checklist.push({
      status: "UNVERIFIED",
      title: "Companies House check couldn't be completed",
      detail: `We captured company number ${companyNumber} but didn't receive a response from the Companies House API for this run.`,
    });
  }

  // VAT name match — UNVERIFIED row if a VAT number was supplied but no
  // result came back.
  const vatNumber = v.vat_number_input || v.extracted_vat_number;
  if (isBusiness && !v.hmrc_vat_result && vatNumber) {
    checklist.push({
      status: "UNVERIFIED",
      title: "HMRC VAT check couldn't be completed",
      detail: `We captured VAT number ${vatNumber} but didn't receive a response from HMRC for this run.`,
    });
  }
  if (isBusiness && v.hmrc_vat_result) {
    if (v.vat_api_name) {
      const match = compareNames(inputName, v.vat_api_name);
      if (match === "exact") {
        checklist.push({
          status: "PASS",
          title: "VAT number is registered to this company",
          detail: `HMRC has ${vatNumber ?? "the VAT number"} registered to "${v.vat_api_name}".`,
        });
      } else if (match === "fuzzy") {
        checklist.push({
          status: "WARN",
          title: "VAT registration is a close match",
          detail: `HMRC has ${vatNumber ?? "this VAT number"} as "${v.vat_api_name}" — not an exact match to "${inputName}".`,
        });
      } else {
        checklist.push({
          status: "FAIL",
          title: "VAT number is registered to a different company",
          detail: `HMRC has ${vatNumber ?? "this VAT number"} as "${v.vat_api_name}", which doesn't match "${inputName}".`,
        });
      }
    } else {
      checklist.push({
        status: "FAIL",
        title: "VAT number not found on HMRC",
        detail: `${vatNumber ?? "This VAT number"} isn't on the HMRC register. Could be a typo or the company isn't VAT-registered.`,
      });
    }
  }

  // Trading history
  const chNameMatches =
    !!v.companies_house_name && compareNames(inputName, v.companies_house_name) !== "none";
  if (chNameMatches && v.companies_house_incorporated_date) {
    const months = monthsSince(v.companies_house_incorporated_date);
    if (months !== null) {
      if (months < 3) {
        checklist.push({
          status: "WARN",
          title: "This company is brand new",
          detail: `Incorporated only ${months} month${months === 1 ? "" : "s"} ago. Be more cautious with new companies — they have no track record yet.`,
        });
      } else if (months < 12) {
        checklist.push({
          status: "WARN",
          title: `Trading for less than a year`,
          detail: `Incorporated ${months} months ago. Not alarming, but a short track record.`,
        });
      } else {
        checklist.push({
          status: "PASS",
          title: `Established — trading for ${tradingSummary(v.companies_house_incorporated_date)}`,
          detail: `Incorporated ${v.companies_house_incorporated_date}. A long trading history makes this company more credible.`,
        });
      }
    }
  }

  // Accounts filed
  if (chNameMatches) {
    if (v.companies_house_accounts_overdue) {
      checklist.push({
        status: "FAIL",
        title: "Accounts are overdue at Companies House",
        detail: `Last filed ${v.companies_house_accounts_date ?? "unknown"}. Overdue accounts are a red flag — could indicate financial or governance problems.`,
      });
    } else if (v.companies_house_accounts_date) {
      checklist.push({
        status: "PASS",
        title: "Accounts are up to date",
        detail: `Last filed at Companies House on ${v.companies_house_accounts_date}.`,
      });
    }
  }

  // Marketplace pricing
  const hasMarketplaceValuation =
    isMarketplace &&
    v.valuation_min != null &&
    v.valuation_max != null &&
    v.marketplace_listed_price != null;
  if (hasMarketplaceValuation) {
    const listed = Number(v.marketplace_listed_price);
    const minV = Number(v.valuation_min);
    const maxV = Number(v.valuation_max);
    if (listed >= minV * 0.8 && listed <= maxV * 1.2) {
      checklist.push({
        status: "PASS",
        title: "Listed price looks fair",
        detail: `${fmt(listed)} sits within the expected range of ${fmtRange(minV, maxV)} based on UK comparables.`,
      });
    } else if (listed < minV * 0.5) {
      checklist.push({
        status: "FAIL",
        title: "Listed price is suspiciously low",
        detail: `${fmt(listed)} is well below the market range of ${fmtRange(minV, maxV)}. Too-good-to-be-true prices are a classic scam indicator.`,
      });
    } else if (listed < minV) {
      checklist.push({
        status: "WARN",
        title: "Listed price is below market",
        detail: `${fmt(listed)} vs expected ${fmtRange(minV, maxV)}. A small bargain is normal private-sale territory, but ask why.`,
      });
    } else {
      checklist.push({
        status: "WARN",
        title: "Listed price is above market",
        detail: `${fmt(listed)} is above the expected range of ${fmtRange(minV, maxV)}. You may be paying a premium.`,
      });
    }
  }

  // Ad price vs invoice
  if (
    isMarketplace &&
    v.marketplace_listed_price != null &&
    (v.extracted_invoice_amount != null || v.invoice_amount != null)
  ) {
    const listed = Number(v.marketplace_listed_price);
    const inv = Number(v.extracted_invoice_amount ?? v.invoice_amount);
    const diff = inv - listed;
    if (Math.abs(diff) < 1) {
      checklist.push({
        status: "PASS",
        title: "Invoice amount matches the ad",
        detail: `The invoice (${fmt(inv)}) matches the listing price. Consistent, which is a good sign.`,
      });
    } else if (diff > listed * 0.2) {
      checklist.push({
        status: "WARN",
        title: "Invoice is notably higher than the ad",
        detail: `The invoice is ${fmt(diff)} more than the ad price (${fmt(listed)}). Make sure you understand the extras.`,
      });
    }
  }

  // Plate match — vehicle + marketplace flows only. This catches the
  // classic fraud where the seller sends a stolen listing photo for a
  // different car.
  if (isVehicle && isMarketplace && plateMatch && plateMatch.expectedPlate) {
    if (plateMatch.matches === true) {
      checklist.push({
        status: "PASS",
        title: "The plate in the photo matches the reg you entered",
        detail: `We spotted ${plateMatch.visiblePlate} in the listing photo — same as what you entered. Consistent, which is a good sign.`,
      });
    } else if (plateMatch.matches === false) {
      checklist.push({
        status: "FAIL",
        title: "The plate in the photo doesn't match the vehicle reg",
        detail: `You said you're buying ${plateMatch.expectedPlate}, but the listing photo shows ${plateMatch.visiblePlate}. This is a serious red flag — the seller may be using someone else's photos. Do not proceed without seeing the actual car in person.`,
      });
    } else {
      // visible plate wasn't readable
      checklist.push({
        status: "WARN",
        title: "Couldn't confirm the plate in the photo",
        detail: `We couldn't read a number plate in the listing photo. Ask the seller to send a fresh photo with ${plateMatch.expectedPlate} clearly visible, alongside today's newspaper or a handwritten note with today's date.`,
      });
    }
  }

  // Sort checklist: FAIL > WARN > PASS
  const order: Record<CheckStatus, number> = {
    FAIL: 0,
    WARN: 1,
    PASS: 2,
    UNVERIFIED: 3,
  };
  checklist.sort((a, b) => order[a.status] - order[b.status]);

  // ── Vehicle valuation block ──────────────────────────────────
  type VehicleVal = {
    estimatedValueLow?: number;
    estimatedValueMid?: number;
    estimatedValueHigh?: number;
    confidence?: string;
    factors?: string[];
    warnings?: string[];
    summary?: string;
  };
  const vehicleVal = (v.vehicle_valuation as unknown as VehicleVal | null) ?? null;
  const hasVehicleValuation =
    !!vehicleVal &&
    typeof vehicleVal.estimatedValueLow === "number" &&
    typeof vehicleVal.estimatedValueHigh === "number";

  const dvla = (v.dvla_data as unknown as DvlaData | null) ?? null;

  // ── DVLA data (context card) ─────────────────────────────────
  type DvlaData = {
    registrationNumber?: string;
    make?: string;
    colour?: string;
    fuelType?: string;
    yearOfManufacture?: number;
    engineCapacity?: number;
    taxStatus?: string;
    motStatus?: string;
  };

  // ── Property data (context card) ─────────────────────────────
  type PropertyData = {
    summaryline?: string;
    addressline1?: string;
    addressline2?: string;
    postcode?: string;
  };
  const property = (v.property_data as unknown as PropertyData | null) ?? null;

  // ── Reviews ──────────────────────────────────────────────────
  const hasReviews =
    isBusiness &&
    (v.google_reviews_rating != null ||
      v.google_reviews_count != null ||
      (v.google_reviews_summary &&
        !v.google_reviews_summary.toLowerCase().includes("no reviews found")));
  const reviewsRating =
    v.google_reviews_rating != null ? Number(v.google_reviews_rating) : null;

  // ── "Things to consider" tips ────────────────────────────────
  const tips: { icon: React.ReactNode; title: string; body: string }[] = [];
  if (isMarketplace) {
    tips.push({
      icon: <Eye className="size-5 text-coral" />,
      title: "Check the seller's profile",
      body: "How long have they been on the platform? Do they have genuine-looking friends and posts? Do they have reviews or ratings from other buyers? A brand-new account with no history is a warning sign.",
    });
    tips.push({
      icon: <ShieldCheck className="size-5 text-coral" />,
      title: "Ask for proof they have the item",
      body: "Request a photo of the item alongside a handwritten note showing today's date. This confirms they actually have it in their possession right now — scammers rarely comply.",
    });
    tips.push({
      icon: <Landmark className="size-5 text-coral" />,
      title: "Get contact details you can independently verify",
      body: "A landline number or a business email address (not gmail.com) gives you something to check. Look it up separately from what they've told you.",
    });
  }
  if (isVehicle && vehicleVal?.warnings && vehicleVal.warnings.length > 0) {
    for (const w of vehicleVal.warnings) {
      tips.push({
        icon: <AlertTriangle className="size-5 text-coral" />,
        title: "Vehicle warning",
        body: w,
      });
    }
  }
  if (isVehicle) {
    const makeModel = dvla?.make
      ? `${dvla.make}${dvla.yearOfManufacture ? ` (${dvla.yearOfManufacture})` : ""}`
      : "this vehicle";
    tips.push({
      icon: <Car className="size-5 text-coral" />,
      title: "Before you hand money over",
      body: `See the V5C logbook in person and check the VIN on the car matches it. Take ${makeModel} for a test drive. Confirm the seller's name on the V5C matches the bank account name you're paying.`,
    });

    // AI-generated make/model specific tips
    if (vehicleTips?.tips && vehicleTips.tips.length > 0) {
      for (const tip of vehicleTips.tips) {
        tips.push({
          icon: <Lightbulb className="size-5 text-coral" />,
          title: `Check this on a ${dvla?.make ?? "vehicle"} like this`,
          body: tip,
        });
      }
    }
  }
  if (isProperty) {
    tips.push({
      icon: <Home className="size-5 text-coral" />,
      title: "Property payment safety",
      body: "For a deposit or completion payment, always verify the solicitor's bank details by phoning them on a number from their official website — never a number from the email that sent the details. Email fraud on property payments is common and the sums are large.",
    });
  }

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10 space-y-8">
      <Button
        className="h-10 px-4 text-sm text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl"
        variant="ghost"
        render={<Link href="/dashboard" />}
      >
        <ArrowLeft className="size-4 mr-1.5" />
        Back to dashboard
      </Button>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section
        className={`rounded-3xl border ${hero.border} ${hero.bg} p-6 sm:p-8`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start gap-5">
          <div
            className={`shrink-0 size-12 rounded-2xl ${hero.iconBg} flex items-center justify-center shadow-sm`}
          >
            {hero.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-500 mb-1">You&apos;re paying</p>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
              {accountName}
            </h1>
            <p className="text-base text-slate-600 mt-1">
              {amount != null ? (
                <>
                  <span className="font-mono font-semibold text-slate-900">
                    {fmt(amount)}
                  </span>{" "}
                  for {reasonText}
                </>
              ) : (
                <>for {reasonText}</>
              )}
            </p>
            <div className="mt-5 border-t border-slate-900/5 pt-5">
              <p className="text-base font-semibold text-slate-900">
                {hero.heading}
              </p>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {hero.body}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Vehicle context card ─────────────────────────────── */}
      {isVehicle && dvla && (
        <section>
          <SectionHeader
            eyebrow="The vehicle"
            title="Here's what the DVLA has on file"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            {/* Plate */}
            {dvla.registrationNumber && (
              <div className="inline-flex items-center rounded-md bg-[#FFCC00] px-4 py-2 shadow-sm mb-5">
                <span
                  className="text-xl sm:text-2xl font-black tracking-wider text-black uppercase"
                  style={{
                    fontFamily: "'Charles Wright', 'Arial Black', sans-serif",
                  }}
                >
                  {dvla.registrationNumber}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {dvla.make && (
                <div>
                  <p className="text-xs text-slate-400">Make</p>
                  <p className="font-medium text-slate-900">{dvla.make}</p>
                </div>
              )}
              {dvla.yearOfManufacture && (
                <div>
                  <p className="text-xs text-slate-400">Year</p>
                  <p className="font-medium text-slate-900">
                    {dvla.yearOfManufacture}
                  </p>
                </div>
              )}
              {dvla.fuelType && (
                <div>
                  <p className="text-xs text-slate-400">Fuel</p>
                  <p className="font-medium text-slate-900">{dvla.fuelType}</p>
                </div>
              )}
              {dvla.colour && (
                <div>
                  <p className="text-xs text-slate-400">Colour</p>
                  <p className="font-medium text-slate-900">{dvla.colour}</p>
                </div>
              )}
              {dvla.engineCapacity && (
                <div>
                  <p className="text-xs text-slate-400">Engine</p>
                  <p className="font-medium text-slate-900">
                    {dvla.engineCapacity}cc
                  </p>
                </div>
              )}
              {dvla.taxStatus && (
                <div>
                  <p className="text-xs text-slate-400">Tax</p>
                  <p className="font-medium text-slate-900">{dvla.taxStatus}</p>
                </div>
              )}
              {dvla.motStatus && (
                <div>
                  <p className="text-xs text-slate-400">MOT</p>
                  <p className="font-medium text-slate-900">{dvla.motStatus}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Property context card ────────────────────────────── */}
      {isProperty && property && (
        <section>
          <SectionHeader
            eyebrow="The property"
            title="Here's the address you're paying for"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center shrink-0">
                <Home className="size-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">
                  {property.summaryline ||
                    [property.addressline1, property.addressline2]
                      .filter(Boolean)
                      .join(", ")}
                </p>
                {property.postcode && (
                  <p className="text-sm text-slate-500 mt-0.5">
                    Postcode verified via Royal Mail / Postcoder
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Marketplace listing card ─────────────────────────── */}
      {isMarketplace && v.marketplace_item_title && (
        <section>
          <SectionHeader
            eyebrow="The listing"
            title="Here's what they're selling"
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-coral/10 text-coral flex items-center justify-center shrink-0">
                <ShoppingCart className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-semibold text-slate-900 break-words">
                  {v.marketplace_item_title}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  {v.marketplace_listed_price != null && (
                    <div>
                      <p className="text-xs text-slate-400">Listed at</p>
                      <p className="font-mono font-semibold text-slate-900">
                        {fmt(Number(v.marketplace_listed_price))}
                      </p>
                    </div>
                  )}
                  {v.marketplace_source && (
                    <div>
                      <p className="text-xs text-slate-400">Platform</p>
                      <p className="font-medium text-slate-900 capitalize">
                        {v.marketplace_source.replace(/_/g, " ")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Checklist ────────────────────────────────────────── */}
      <section>
        <SectionHeader
          eyebrow="The checks"
          title="Let's go through what we found"
          sub="The important stuff — here's how this payee stacks up on the checks we ran."
        />
        {checklist.length > 0 ? (
          <div className="space-y-2.5">
            {checklist.map((c, i) => (
              <ChecklistItem key={i} {...c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-6 text-center">
            <Minus className="size-6 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              No checks completed for this verification
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              This can happen if the verification was interrupted, or the
              payee data we had to work with was too sparse. Get in touch if
              you&apos;d like us to look into it.
            </p>
          </div>
        )}
      </section>

      {/* ── Valuation: vehicle ───────────────────────────────── */}
      {isVehicle && hasVehicleValuation && vehicleVal && (
        <section>
          <SectionHeader
            eyebrow="The price"
            title="What this vehicle is worth"
            sub="Our AI estimate based on the DVLA data and UK market comparables."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-baseline gap-3 flex-wrap">
              <p className="text-3xl sm:text-4xl font-bold text-slate-900 font-mono">
                {fmtRange(
                  vehicleVal.estimatedValueLow!,
                  vehicleVal.estimatedValueHigh!
                )}
              </p>
              {vehicleVal.confidence && (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 capitalize">
                  {vehicleVal.confidence} confidence
                </span>
              )}
            </div>
            {vehicleVal.summary && (
              <p className="text-sm text-slate-600 mt-4 leading-relaxed whitespace-pre-line">
                {vehicleVal.summary}
              </p>
            )}
            {vehicleVal.factors && vehicleVal.factors.length > 0 && (
              <div className="mt-5 pt-5 border-t border-slate-100">
                <p className="text-xs uppercase tracking-wide text-slate-400 font-bold mb-2">
                  What drove the estimate
                </p>
                <ul className="space-y-1.5">
                  {vehicleVal.factors.map((f, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-600 flex items-start gap-2"
                    >
                      <span className="text-coral mt-1">{"•"}</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Valuation: marketplace ───────────────────────────── */}
      {isMarketplace &&
        v.valuation_min != null &&
        v.valuation_max != null && (
          <section>
            <SectionHeader
              eyebrow="The price"
              title="What this item is worth"
              sub="Based on UK comparables found via web search."
            />
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <div className="grid sm:grid-cols-2 gap-4 mb-4">
                {v.marketplace_listed_price != null && (
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs text-slate-400 mb-1">
                      They're asking
                    </p>
                    <p className="text-2xl font-bold font-mono text-slate-900">
                      {fmt(Number(v.marketplace_listed_price))}
                    </p>
                  </div>
                )}
                <div className="rounded-xl bg-coral/5 border border-coral/10 p-4">
                  <p className="text-xs text-coral font-semibold mb-1 uppercase tracking-wide">
                    Market range
                  </p>
                  <p className="text-2xl font-bold font-mono text-slate-900">
                    {fmtRange(
                      Number(v.valuation_min),
                      Number(v.valuation_max)
                    )}
                  </p>
                </div>
              </div>
              {v.valuation_summary && (
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {v.valuation_summary}
                </p>
              )}
            </div>
          </section>
        )}

      {/* ── Reputation ───────────────────────────────────────── */}
      {isBusiness && (hasReviews || v.google_reviews_summary) && (
        <section>
          <SectionHeader
            eyebrow="Reputation"
            title="What other people say"
            sub="Public reviews and mentions found online."
          />
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="size-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <Star className="size-5 fill-amber-500 text-amber-500" />
              </div>
              <div className="min-w-0 flex-1">
                {reviewsRating != null && (
                  <div className="flex items-baseline gap-2 mb-1">
                    <p className="text-2xl font-bold text-slate-900">
                      {reviewsRating.toFixed(1)}
                      <span className="text-base font-normal text-slate-400">
                        /5
                      </span>
                    </p>
                    {v.google_reviews_count != null && (
                      <span className="text-sm text-slate-500">
                        from {Number(v.google_reviews_count).toLocaleString()}{" "}
                        review
                        {Number(v.google_reviews_count) === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                )}
                {v.google_reviews_summary && (
                  <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                    {v.google_reviews_summary}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Coming-soon tiles for Trustpilot / Checkatrade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex items-center gap-3">
              <Globe className="size-5 text-slate-400 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-700">Trustpilot</p>
                <p className="text-xs text-slate-400">
                  Coming soon &mdash; we&rsquo;ll cross-check reviews on Trustpilot
                </p>
              </div>
            </div>
            {isTradesperson && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 flex items-center gap-3">
                <Building2 className="size-5 text-slate-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-700">
                    Checkatrade
                  </p>
                  <p className="text-xs text-slate-400">
                    Coming soon &mdash; verified-tradesperson listings
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Things to consider ───────────────────────────────── */}
      {tips.length > 0 && (
        <section>
          <SectionHeader
            eyebrow="Before you pay"
            title="Things worth thinking about"
            sub="Not deal-breakers — just common-sense steps for this kind of payment."
          />
          <div className="space-y-3">
            {tips.map((t, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-coral/10 flex items-center justify-center shrink-0">
                    {t.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 mb-1">
                      {t.title}
                    </p>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {t.body}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <div className="pt-4 pb-2 text-center">
        <p className="text-xs text-slate-400">
          WhoAmIPaying checks data from Companies House, HMRC, DVLA, Confirmation
          of Payee, and public sources. Always make your own judgement before
          paying.
        </p>
      </div>
    </div>
  );
}

// Silence unused-import warnings
void Image;
void FileText;
void CalendarDays;
void Info;
