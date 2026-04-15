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

/** Individual available check — the user toggles these on the final step */
export type CheckId =
  | "cop"
  | "companies_house"
  | "vat"
  | "trading_history"
  | "accounts_filed"
  | "online_reviews"
  | "ai_risk_assessment"
  | "vehicle_history"
  | "vehicle_valuation";

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

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

export const initialWizardState: WizardState = {
  payeeType: null,
  purchaseCategory: null,

  vehicleReg: "",
  dvlaData: null,
  dvlaLoading: false,
  dvlaError: null,
  vehicleConfirmed: false,

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

/** Which checks should appear for a given payee type + category combo. */
export function availableChecksFor(
  payeeType: PayeeType | null,
  category: PurchaseCategory | null
): { id: CheckId; label: string; description: string; defaultOn: boolean; comingSoon?: boolean }[] {
  const isBusiness = payeeType === "business";
  const isVehicle = category === "vehicle";

  const base: {
    id: CheckId;
    label: string;
    description: string;
    defaultOn: boolean;
    comingSoon?: boolean;
  }[] = [
    {
      id: "cop",
      label: "Confirmation of Payee",
      description: "Bank account matches the name given",
      defaultOn: true,
    },
    {
      id: "ai_risk_assessment",
      label: "AI Risk Assessment",
      description: "Claude reviews all the data and flags red flags",
      defaultOn: true,
    },
  ];

  if (isBusiness) {
    base.push(
      {
        id: "companies_house",
        label: "Companies House check",
        description: "Company is registered and active",
        defaultOn: true,
      },
      {
        id: "vat",
        label: "VAT verification",
        description: "VAT number is valid with HMRC",
        defaultOn: true,
      },
      {
        id: "trading_history",
        label: "Trading History",
        description: "How long the company has been trading",
        defaultOn: true,
      },
      {
        id: "accounts_filed",
        label: "Accounts Filed",
        description: "Accounts up to date with Companies House",
        defaultOn: true,
      },
      {
        id: "online_reviews",
        label: "Online Reviews",
        description: "Reputation across Google, Trustpilot & more",
        defaultOn: true,
      }
    );
  }

  if (isVehicle) {
    base.push(
      {
        id: "vehicle_history",
        label: "Vehicle History Check",
        description: "Outstanding finance, stolen, write-off, mileage",
        defaultOn: true,
        comingSoon: true,
      },
      {
        id: "vehicle_valuation",
        label: "AI Vehicle Valuation",
        description: "Fair market value from DVLA data + AI",
        defaultOn: true,
      }
    );
  }

  return base;
}
