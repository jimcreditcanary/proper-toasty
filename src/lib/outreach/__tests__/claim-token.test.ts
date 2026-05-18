// HMAC claim-token round-trip + tamper-rejection tests.

import { describe, expect, it, beforeAll } from "vitest";
import { mintClaimToken, verifyClaimToken } from "../claim-token";

const SECRET = "a".repeat(64);

beforeAll(() => {
  process.env.OUTREACH_CLAIM_TOKEN_SECRET = SECRET;
});

describe("claim-token", () => {
  it("round-trips a UUID recipient id", () => {
    const id = "11111111-2222-3333-4444-555555555555";
    const token = mintClaimToken(id);
    expect(verifyClaimToken(token)).toBe(id);
  });

  it("rejects a tampered payload (recipient id swapped)", () => {
    const a = mintClaimToken("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = mintClaimToken("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    // Splice the id part of a with the sig part of b — should fail.
    const dot = a.indexOf(".");
    const tampered = a.slice(0, dot) + "." + b.slice(b.indexOf(".") + 1);
    expect(verifyClaimToken(tampered)).toBeNull();
  });

  it("rejects a tampered signature (signature corrupted)", () => {
    const token = mintClaimToken("00000000-0000-0000-0000-000000000000");
    const dot = token.indexOf(".");
    const corrupted = token.slice(0, dot + 1) + "AAAA" + token.slice(dot + 5);
    expect(verifyClaimToken(corrupted)).toBeNull();
  });

  it("rejects a malformed token (no dot separator)", () => {
    expect(verifyClaimToken("not-a-token")).toBeNull();
  });

  it("rejects an empty/null token", () => {
    expect(verifyClaimToken("")).toBeNull();
    // @ts-expect-error — defending against runtime nulls
    expect(verifyClaimToken(null)).toBeNull();
  });

  it("tokens for different ids differ", () => {
    const a = mintClaimToken("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    const b = mintClaimToken("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    expect(a).not.toBe(b);
  });

  it("tokens for the same id are deterministic", () => {
    const id = "deterministic-test-id";
    expect(mintClaimToken(id)).toBe(mintClaimToken(id));
  });
});
