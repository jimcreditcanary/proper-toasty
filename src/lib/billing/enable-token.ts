// HMAC-signed magic-link tokens for the "click here to enable auto
// top-up" email button.
//
// Token shape: `{userIdCompact}.{packId}.{hmacHex}` where:
//   - userIdCompact is the user UUID without dashes
//   - packId is one of starter/growth/scale/volume
//   - hmacHex is HMAC-SHA256(`${userId}|${packId}`) keyed off
//     INSTALLER_AUTO_TOPUP_SECRET. Signing both parts means a user
//     can't swap the pack on themselves to "growth" if the email
//     said "starter" — the link is bound to a single decision.
//
// Stateless by design: no DB row, no expiry beyond the email's natural
// short shelf life. If the user clicks the link weeks later we still
// honour it; the worst case is they've already turned auto top-up on
// from the dashboard, in which case the endpoint just no-ops.
//
// Required env var:
//   INSTALLER_AUTO_TOPUP_SECRET   (any random ≥16-char string)

import { createHmac, timingSafeEqual } from "node:crypto";

const PACK_IDS = ["starter", "growth", "scale", "volume"] as const;
type PackId = (typeof PACK_IDS)[number];

function secret(): string {
  const s = process.env.INSTALLER_AUTO_TOPUP_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "INSTALLER_AUTO_TOPUP_SECRET env var must be set (≥16 chars)",
    );
  }
  return s;
}

function sign(userId: string, packId: PackId): string {
  return createHmac("sha256", secret())
    .update(`${userId}|${packId}`)
    .digest("hex");
}

// Build the URL-safe token. Caller wraps it into the email link.
export function buildEnableToken(userId: string, packId: PackId): string {
  const compact = userId.replace(/-/g, "");
  return `${compact}.${packId}.${sign(userId, packId)}`;
}

// Parse + verify an inbound token. Returns the decoded user_id +
// pack_id on success, null otherwise. Caller is responsible for the
// actual DB update — this only proves the link came from us.
export function parseEnableToken(
  token: string,
): { userId: string; packId: PackId } | null {
  if (typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [compactId, packId, sig] = parts;
  if (compactId.length !== 32 || !/^[0-9a-f]+$/i.test(compactId)) return null;
  if (!isPackId(packId)) return null;
  const userId = `${compactId.slice(0, 8)}-${compactId.slice(8, 12)}-${compactId.slice(12, 16)}-${compactId.slice(16, 20)}-${compactId.slice(20, 32)}`;
  let expected: string;
  try {
    expected = sign(userId, packId);
  } catch {
    return null;
  }
  if (expected.length !== sig.length) return null;
  try {
    const ok = timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig, "hex"),
    );
    return ok ? { userId, packId } : null;
  } catch {
    return null;
  }
}

function isPackId(s: string): s is PackId {
  return (PACK_IDS as readonly string[]).includes(s);
}
