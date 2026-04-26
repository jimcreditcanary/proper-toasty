// HMAC token helpers for the installer "I'll take this lead" magic link.
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
