/**
 * OBConnect.io — Open Banking Payment Initiation Service
 *
 * Feature-flagged: set OBCONNECT_ENABLED=true in env when API keys are available.
 * When disabled, returns mock responses so the full UI flow can be tested end-to-end.
 *
 * When API keys are available:
 * 1. Set OBCONNECT_ENABLED=true
 * 2. Set OBCONNECT_API_KEY, OBCONNECT_API_SECRET, OBCONNECT_BASE_URL
 * 3. Fill in the real request schemas below (marked with TODO)
 */

export type InitiatePaymentPayload = {
  amount: number;
  currency: string;
  payeeName: string;
  sortCode: string;
  accountNumber: string;
  reference: string;
};

export type InitiatePaymentResponse = {
  paymentId: string;
  authUrl: string;
  expiresAt: string;
};

export type PaymentStatusResponse = {
  paymentId: string;
  status: "PENDING" | "AUTHORISED" | "COMPLETED" | "FAILED" | "CANCELLED";
  reason?: string;
};

export function isOBConnectEnabled(): boolean {
  return process.env.OBCONNECT_ENABLED === "true";
}

/**
 * Initiate an Open Banking payment via OBConnect.
 *
 * In mock mode, returns a fake auth URL that routes to the mock callback page.
 * In production, calls the OBConnect PIS initiation endpoint.
 */
export async function initiatePayment(
  payload: InitiatePaymentPayload
): Promise<InitiatePaymentResponse> {
  if (!isOBConnectEnabled()) {
    // Mock response — simulates OBConnect returning a payment auth URL
    const mockId = `mock-${Date.now()}`;
    return {
      paymentId: mockId,
      authUrl: `/payment/mock-callback?paymentId=${mockId}&ref=${encodeURIComponent(payload.reference)}&amount=${payload.amount}&payee=${encodeURIComponent(payload.payeeName)}`,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // REAL IMPLEMENTATION — uncomment and complete when API keys available
  // Docs reference: https://obconnect.io (check their PIS initiation endpoint)
  // ──────────────────────────────────────────────────────────────────

  const baseUrl = process.env.OBCONNECT_BASE_URL!;
  const apiKey = process.env.OBCONNECT_API_KEY!;
  // const apiSecret = process.env.OBCONNECT_API_SECRET!;

  const res = await fetch(`${baseUrl}/payments/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // TODO: Map to OBConnect's actual request schema
      amount: { value: payload.amount, currency: payload.currency },
      creditor: {
        name: payload.payeeName,
        account: {
          sortCode: payload.sortCode.replace(/[-\s]/g, ""),
          accountNumber: payload.accountNumber,
        },
      },
      reference: payload.reference,
      // TODO: Add redirect URL for callback
      // redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => "");
    throw new Error(`OBConnect initiation failed: HTTP ${res.status} — ${errorBody}`);
  }

  const data = await res.json();

  // TODO: Map OBConnect's response fields to our format
  return {
    paymentId: data.paymentId ?? data.id,
    authUrl: data.authUrl ?? data.authorisationUrl,
    expiresAt: data.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  };
}

/**
 * Check payment status via OBConnect.
 *
 * In mock mode, trusts the status passed in (from callback query params).
 * In production, calls OBConnect to verify the real status.
 */
export async function getPaymentStatus(
  paymentId: string,
  callbackStatus?: string
): Promise<PaymentStatusResponse> {
  if (!isOBConnectEnabled()) {
    // In mock mode, trust the callback status
    const status = (callbackStatus?.toUpperCase() ?? "COMPLETED") as PaymentStatusResponse["status"];
    return { paymentId, status };
  }

  // ──────────────────────────────────────────────────────────────────
  // REAL IMPLEMENTATION — uncomment when API keys available
  // ──────────────────────────────────────────────────────────────────

  const baseUrl = process.env.OBCONNECT_BASE_URL!;
  const apiKey = process.env.OBCONNECT_API_KEY!;

  const res = await fetch(`${baseUrl}/payments/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!res.ok) {
    throw new Error(`OBConnect status check failed: HTTP ${res.status}`);
  }

  const data = await res.json();

  // TODO: Map OBConnect's status field to our enum
  return {
    paymentId: data.paymentId ?? data.id,
    status: data.status ?? "FAILED",
    reason: data.reason ?? data.failureReason,
  };
}
