// HMAC-signed claim tokens for outreach landing-page URLs.
//
// Token format: `<base64url(recipient_id)>.<base64url(hmac)>`
//
// Why HMAC + token-in-URL:
//   - Recipient row UUID alone in the URL would let anyone with the
//     URL claim that recipient's offer. HMAC binds the URL to a
//     server-side secret so we can verify the recipient_id wasn't
//     swapped in transit.
//   - Stateless verification — no DB read just to validate the
//     token's authenticity. The Phase 4 landing page reads the
//     recipient row anyway to render the offer, so the round-trip
//     happens once not twice.
//
// Token TTL: not encoded in the token itself. The implicit expiry
// is the recipient row's created_at + 90 days, enforced by the
// landing page (and by the recipient lifecycle — once state is
// 'completed' or 'unsubscribed' the token stops being honoured).

import { createHmac, timingSafeEqual } from "node:crypto";

function getSecret(): string {
  const secret = process.env.OUTREACH_CLAIM_TOKEN_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "[outreach/claim-token] OUTREACH_CLAIM_TOKEN_SECRET missing or too short (need 32+ hex chars; generate via `openssl rand -hex 32`)",
    );
  }
  return secret;
}

/** URL-safe base64 (RFC 4648 §5) — no padding, no `+`/`/`. */
function base64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64urlDecode(s: string): Buffer | null {
  // Restore padding.
  const padded = s.replace(/-/g, "+").replace(/_/g, "/")
    .padEnd(Math.ceil(s.length / 4) * 4, "=");
  try {
    return Buffer.from(padded, "base64");
  } catch {
    return null;
  }
}

function hmac(payload: string): Buffer {
  return createHmac("sha256", getSecret()).update(payload).digest();
}

/**
 * Mint a claim token for a recipient. Pure function; can be called
 * from anywhere (typically once at outreach_recipients insert time
 * + persisted on the row's claim_token column).
 */
export function mintClaimToken(recipientId: string): string {
  const idBuf = Buffer.from(recipientId);
  const sigBuf = hmac(recipientId);
  return `${base64url(idBuf)}.${base64url(sigBuf)}`;
}

/**
 * Verify + parse a claim token. Returns the recipient_id when valid,
 * null when malformed or signature-mismatched. Uses timingSafeEqual
 * to avoid signature-comparison timing attacks.
 */
export function verifyClaimToken(token: string): string | null {
  if (!token || typeof token !== "string") return null;
  const dot = token.indexOf(".");
  if (dot < 0) return null;

  const idPart = token.slice(0, dot);
  const sigPart = token.slice(dot + 1);
  const idBuf = base64urlDecode(idPart);
  const sigBuf = base64urlDecode(sigPart);
  if (!idBuf || !sigBuf) return null;

  const recipientId = idBuf.toString("utf-8");
  let expectedSig: Buffer;
  try {
    expectedSig = hmac(recipientId);
  } catch {
    return null;
  }
  if (expectedSig.length !== sigBuf.length) return null;
  if (!timingSafeEqual(expectedSig, sigBuf)) return null;
  return recipientId;
}
