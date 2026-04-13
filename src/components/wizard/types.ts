export type PayeeType = "business" | "person" | "unknown";
export type PurchaseCategory = "vehicle" | "property" | "investment" | "building_work" | "services" | "other";
export type CheckTier = "basic" | "enhanced";

export type WizardState = {
  // Step 1
  payeeType: PayeeType | null;

  // Step 1B
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

  // Manual entry fields (or corrected extracted fields)
  companyName: string;
  companyNumber: string;
  vatNumber: string;
  payeeName: string;
  sortCode: string;
  accountNumber: string;
  paymentAmount: string;

  // Step 2
  purchaseCategory: PurchaseCategory | null;

  // Step 3
  isMarketplace: boolean | null;
  marketplaceSafetyAcknowledged: boolean;
  marketplaceUrl: string;
  marketplaceResult: {
    itemTitle: string;
    listedPrice: number | null;
    valuationMin: number;
    valuationMax: number;
    valuationSummary: string;
    confidence: "high" | "medium" | "low";
  } | null;
  marketplaceLoading: boolean;
  marketplaceError: string | null;

  // Step 4
  checkTier: CheckTier | null;
  email: string; // for unauthenticated basic checks

  // Auth state (injected)
  isAuthenticated: boolean;
  userCredits: number;
  userEmail: string | null;
};

export type WizardStep = 1 | "1b" | 2 | 3 | 4 | 5;

export const initialWizardState: WizardState = {
  payeeType: null,
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
  purchaseCategory: null,
  isMarketplace: null,
  marketplaceSafetyAcknowledged: false,
  marketplaceUrl: "",
  marketplaceResult: null,
  marketplaceLoading: false,
  marketplaceError: null,
  checkTier: null,
  email: "",
  isAuthenticated: false,
  userCredits: 0,
  userEmail: null,
};
