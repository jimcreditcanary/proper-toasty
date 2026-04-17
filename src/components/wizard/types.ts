export type PayeeType = "business" | "person" | "unsure";
export type PurchaseCategory =
  | "vehicle"
  | "tradesperson"
  | "property"
  | "service"
  | "something_else";

export type MarketplaceSource =
  | "facebook"
  | "gumtree"
  | "ebay"
  | "other";

/** DVLA Vehicle Enquiry Service response — only the fields we use */
export type DvlaVehicleData = {
  registrationNumber: string;
  make?: string | null;
  colour?: string | null;
  fuelType?: string | null;
  engineCapacity?: number | null;
  yearOfManufacture?: number | null;
  monthOfFirstRegistration?: string | null;
  taxStatus?: string | null;
  taxDueDate?: string | null;
  motStatus?: string | null;
  motExpiryDate?: string | null;
  co2Emissions?: number | null;
  markedForExport?: boolean | null;
  typeApproval?: string | null;
  wheelplan?: string | null;
  revenueWeight?: number | null;
  euroStatus?: string | null;
  dateOfLastV5CIssued?: string | null;
  raw?: Record<string, unknown>;
};

/** AI vehicle valuation result */
export type VehicleValuation = {
  estimatedValueLow: number;
  estimatedValueMid: number;
  estimatedValueHigh: number;
  confidence: "low" | "medium" | "high";
  factors: string[];
  warnings: string[];
  summary: string;
};

/** Individual available check */
export type CheckId =
  | "cop"
  | "companies_house"
  | "vat"
  | "online_reviews"
  | "dvla_vehicle_check"
  | "vehicle_history"
  | "vehicle_valuation"
  | "marketplace_valuation";

/** Pricing tier on the final step — each tier unlocks more checks. */
export type ReportTier = 1 | 2 | 3;

export type WizardState = {
  // Step 1 — payee type
  payeeType: PayeeType | null;

  // Step 2 — purchase category
  purchaseCategory: PurchaseCategory | null;

  // Step 3 — vehicle registration (only when purchaseCategory === "vehicle")
  vehicleReg: string;
  dvlaData: DvlaVehicleData | null;
  dvlaLoading: boolean;
  dvlaError: string | null;
  vehicleConfirmed: boolean;
  // Optional buyer-reported mileage — improves AI valuation confidence
  vehicleMileage: string;

  // Step 3 — property address lookup (only when purchaseCategory === "property")
  propertyPostcode: string;
  propertyAddresses: PostcoderAddress[] | null;
  selectedProperty: PostcoderAddress | null;
  propertyLoading: boolean;
  propertyError: string | null;
  propertyConfirmed: boolean;

  // Step 4 — marketplace
  marketplaceSource: MarketplaceSource | null;
  marketplaceOther: string;
  marketplaceScreenshot: File | null;
  marketplaceScreenshotUrl: string | null;
  marketplaceUploading: boolean;
  marketplaceError: string | null;

  // Step 5 — invoice / manual details
  hasInvoice: boolean | null;
  invoiceFile: File | null;
  extractedData: {
    company_name?: string | null;
    vat_number?: string | null;
    company_number?: string | null;
    sort_code?: string | null;
    account_number?: string | null;
    invoice_amount?: number | null;
    payee_name?: string | null;
    invoice_date?: string | null;
  } | null;
  extractionLoading: boolean;
  extractionError: string | null;
  companyName: string;
  companyNumber: string;
  vatNumber: string;
  payeeName: string;
  sortCode: string;
  accountNumber: string;
  paymentAmount: string;

  // Step 6 — check selection
  selectedChecks: CheckId[];

  // Lead capture (unauthenticated flow)
  email: string;

  // Auth state (injected)
  isAuthenticated: boolean;
  userCredits: number;
  userEmail: string | null;
};

export type PostcoderAddress = {
  summaryline: string;
  addressline1: string;
  addressline2: string;
  organisation: string;
  buildingname: string;
  subbuildingname: string;
  premise: string;
  street: string;
  dependentlocality: string;
  posttown: string;
  county: string;
  postcode: string;
  uprn: string;
  udprn: string;
  latitude: string;
  longitude: string;
};

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const initialWizardState: WizardState = {
  payeeType: null,
  purchaseCategory: null,

  vehicleReg: "",
  dvlaData: null,
  dvlaLoading: false,
  dvlaError: null,
  vehicleConfirmed: false,
  vehicleMileage: "",

  propertyPostcode: "",
  propertyAddresses: null,
  selectedProperty: null,
  propertyLoading: false,
  propertyError: null,
  propertyConfirmed: false,

  marketplaceSource: null,
  marketplaceOther: "",
  marketplaceScreenshot: null,
  marketplaceScreenshotUrl: null,
  marketplaceUploading: false,
  marketplaceError: null,

  hasInvoice: null,
  invoiceFile: null,
  extractedData: null,
  extractionLoading: false,
  extractionError: null,
  companyName: "",
  companyNumber: "",
  vatNumber: "",
  payeeName: "",
  sortCode: "",
  accountNumber: "",
  paymentAmount: "",

  selectedChecks: [],

  email: "",
  isAuthenticated: false,
  userCredits: 0,
  userEmail: null,
};

export type CheckDef = {
  id: CheckId;
  label: string;
  description: string;
  tier: ReportTier;
  comingSoon?: boolean;
};

/**
 * Which checks are relevant to a given payee + category + marketplace combo.
 * Each check is tagged with the tier it belongs to:
 *   tier 1 — API / data checks (CoP, Companies House, VAT, etc.)
 *   tier 2 — AI valuations (vehicle via DVLA, marketplace via screenshot)
 *   tier 3 — online reviews (business only)
 */
export function availableChecksFor(
  payeeType: PayeeType | null,
  category: PurchaseCategory | null,
  hasDvla: boolean = false,
  hasMarketplaceScreenshot: boolean = false
): CheckDef[] {
  const isBusiness = payeeType === "business";
  const isVehicle = category === "vehicle";

  const out: CheckDef[] = [
    {
      id: "cop",
      label: "Confirmation of Payee",
      description:
        "Bank account matches the name given — works for businesses and individuals",
      tier: 1,
    },
  ];

  if (isBusiness) {
    out.push(
      {
        id: "companies_house",
        label: "Companies House check",
        description: "Company is registered and active",
        tier: 1,
      },
      {
        id: "vat",
        label: "VAT verification",
        description: "VAT number is valid with HMRC",
        tier: 1,
      }
    );
  }

  if (isVehicle) {
    if (hasDvla) {
      out.push({
        id: "dvla_vehicle_check",
        label: "DVLA Vehicle Check",
        description: "Make, year, fuel, tax and MOT status",
        tier: 1,
      });
    }
    out.push({
      id: "vehicle_history",
      label: "Vehicle History Check",
      description: "Outstanding finance, stolen, write-off, mileage",
      tier: 1,
      comingSoon: true,
    });
    if (hasDvla) {
      out.push({
        id: "vehicle_valuation",
        label: "AI Valuation Check",
        description: "Fair market value from DVLA data + AI",
        tier: 2,
      });
    }
  }

  if (hasMarketplaceScreenshot) {
    out.push({
      id: "marketplace_valuation",
      label: "AI Valuation Check",
      description: "Fair price from UK comparables via AI + web search",
      tier: 2,
    });
  }

  if (isBusiness) {
    out.push({
      id: "online_reviews",
      label: "Seller Reviews Check",
      description: "Reputation across Google, Trustpilot & more",
      tier: 3,
    });
  }

  return out;
}

/** Checks that should run for a given tier. Pass tier 3 to get everything. */
export function checksForTier(checks: CheckDef[], tier: ReportTier): CheckDef[] {
  return checks.filter((c) => c.tier <= tier && !c.comingSoon);
}
