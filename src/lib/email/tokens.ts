// HMAC token helpers for various magic links across the app:
//   - signLeadAckToken / verifyLeadAckToken — installer "I'll take
//     this lead" link (signed with INSTALLER_LEAD_ACK_SECRET)
//   - signReportToken / verifyReportToken — homeowner / partner
//     shareable report link (signed with REPORT_TOKEN_SECRET)
//
// All HMACs are SHA-256 over a UUID, hex-encoded. The token string in
// the URL combines the UUID + the signature ({uuid}.{sig}) so we can
// reject tampered links without a DB lookup. Constant-time comparison
// throughout.
//
// Why HMAC, not JWT: we don't need claims or expiry encoded in the
// token — the lead row in the DB already carries everything we need
// (status, expiry can be enforced on the server). HMAC-SHA256 over the
// lead UUID, signed with INSTALLER_LEAD_ACK_SECRET, is the smallest
// thing that's unforgeable.
//
// Required env var:
//   INSTALLER_LEAD_ACK_SECRET   (any random ≥32-byte string)

import { createHmac, timingSafeEqual } from "node:crypto";

function secret(): string {
  const s = process.env.INSTALLER_LEAD_ACK_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "INSTALLER_LEAD_ACK_SECRET env var must be set (≥16 chars)",
    );
  }
  return s;
}

// Sign the lead id. Returns hex-encoded HMAC. Stable for a given
// (id, secret) pair — re-signing produces the same token.
export function signLeadAckToken(leadId: string): string {
  return createHmac("sha256", secret()).update(leadId).digest("hex");
}

// Verify a token came from us. Constant-time comparison.
export function verifyLeadAckToken(leadId: string, token: string): boolean {
  if (!token || typeof token !== "string") return false;
  let expected: string;
  try {
    expected = signLeadAckToken(leadId);
  } catch {
    return false;
  }
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(token, "hex"));
  } catch {
    return false;
  }
}

// ─── Report tokens ──────────────────────────────────────────────────────────
//
// URL-safe combined token: `{uuid-without-dashes}.{hex-hmac-sig}`.
// The UUID identifies the report_tokens row; the signature confirms
// the link came from us (lets us reject tampered URLs without a DB
// roundtrip on the hot path). Server still checks the row's expires_at
// before returning data — signature alone doesn't grant access.
//
// Required env var:
//   REPORT_TOKEN_SECRET   (any random ≥16-char string)

function reportSecret(): string {
  const s = process.env.REPORT_TOKEN_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "REPORT_TOKEN_SECRET env var must be set (≥16 chars)",
    );
  }
  return s;
}

function signReportSig(reportId: string): string {
  return createHmac("sha256", reportSecret()).update(reportId).digest("hex");
}

// Build the URL-safe token from a report row id.
export function buildReportToken(reportId: string): string {
  // Strip dashes from the UUID so the URL is shorter + cleaner.
  const compact = reportId.replace(/-/g, "");
  return `${compact}.${signReportSig(reportId)}`;
}

// Parse + verify an inbound token. Returns the original UUID (with
// dashes) on success, null on any failure (malformed, bad signature).
// The caller still needs to look up the row + check expires_at.
export function parseReportToken(token: string): string | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [compactId, sig] = parts;
  if (compactId.length !== 32 || !/^[0-9a-f]+$/i.test(compactId)) return null;
  // Reconstruct the canonical UUID with dashes (8-4-4-4-12).
  const reportId = `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20, 32)}`;
  let expected: string;
  try {
    expected = signReportSig(reportId);
  } catch {
    return null;
  }
  if (expected.length !== sig.length) return null;
  try {
    const ok = timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig, "hex"),
    );
    return ok ? reportId : null;
  } catch {
    return null;
  }
}
