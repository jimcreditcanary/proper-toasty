// scripts/outreach/inspect-env.ts
//
// Focused, REDACTED inspection of the outreach-engine env vars in
// .env.local. Mirrors the secrets policy from CLAUDE.md — prints
// only metadata (length, first-4-chars when value is long enough,
// sha256-prefix), NEVER values.
//
// Use this to:
//   1. Verify which of the outreach launch env vars are set locally
//      (and to what characteristics)
//   2. Compare characteristics to what's in Vercel (paste-able diff)
//   3. Sanity-check that POSTMARK_OUTREACH_SERVER_TOKEN is NOT the
//      same as POSTMARK_SERVER_TOKEN (compares sha256 prefixes)
//
// Usage:
//
//   npx tsx scripts/outreach/inspect-env.ts
//
// Output is safe to screenshot / paste into chat / commit to a
// debug log.

import "../../src/lib/dev/load-env";
import { createHash } from "node:crypto";

interface Spec {
  key: string;
  minLength: number;
  required: boolean;
  note?: string;
}

// Mirrors REQUIRED_ENV in preflight.ts plus a few extras the
// runbook needs (broadcast stream, transactional-token for the
// non-equality check).
const SPECS: Spec[] = [
  { key: "POSTMARK_OUTREACH_SERVER_TOKEN", minLength: 30, required: true, note: "must NOT equal POSTMARK_SERVER_TOKEN" },
  { key: "POSTMARK_OUTREACH_SENDER_EMAIL", minLength: 8, required: true },
  { key: "POSTMARK_OUTREACH_SENDER_NAME", minLength: 4, required: true },
  { key: "POSTMARK_OUTREACH_REPLY_TO", minLength: 8, required: true },
  { key: "POSTMARK_OUTREACH_INBOUND_WEBHOOK_SECRET", minLength: 32, required: true },
  { key: "POSTMARK_OUTREACH_OUTBOUND_WEBHOOK_SECRET", minLength: 32, required: true },
  { key: "POSTMARK_OUTREACH_MESSAGE_STREAM", minLength: 4, required: false, note: "defaults to 'broadcast' if unset" },
  { key: "OUTREACH_CLAIM_TOKEN_SECRET", minLength: 32, required: true, note: "generate via `openssl rand -hex 32`" },
  { key: "CRON_SECRET", minLength: 16, required: true },
  { key: "ANTHROPIC_API_KEY", minLength: 30, required: true },
  { key: "NEXT_PUBLIC_SUPABASE_URL", minLength: 20, required: true },
  { key: "SUPABASE_SERVICE_ROLE_KEY", minLength: 40, required: true, note: "new sb_secret_... format is ~40 chars; legacy JWT was ~200+" },
  { key: "NEXT_PUBLIC_APP_URL", minLength: 10, required: true },
  // Not in REQUIRED_ENV, but we need it for the equality check:
  { key: "POSTMARK_SERVER_TOKEN", minLength: 30, required: false, note: "transactional — for inequality check only" },
];

interface Snapshot {
  spec: Spec;
  set: boolean;
  length: number;
  first4: string;
  hash: string;
  meetsMin: boolean;
}

function snapshot(spec: Spec): Snapshot {
  const val = process.env[spec.key] ?? "";
  return {
    spec,
    set: val.length > 0,
    length: val.length,
    // 4-char prefix only, and only when the value is long enough
    // that prefix exposure is meaningless. Shorter values get
    // "(short)" — same convention as scripts/dev/inspect-env.ts.
    first4: val.length >= 12 ? val.slice(0, 4) : "(short)",
    hash: val.length === 0 ? "--------" : createHash("sha256").update(val).digest("hex").slice(0, 8),
    meetsMin: val.length >= spec.minLength,
  };
}

const snapshots = SPECS.map(snapshot);

// ── Output ──
console.log("");
console.log("Outreach env-var inspection (REDACTED — safe to share)");
console.log("======================================================");
console.log("");

const keyW = Math.max(...SPECS.map((s) => s.key.length));
for (const s of snapshots) {
  const statusPill = !s.set
    ? (s.spec.required ? "MISSING  " : "unset    ")
    : s.meetsMin
      ? "ok       "
      : "TOO SHORT";
  const lengthCol = s.set ? `len=${String(s.length).padStart(4)}` : "len=----";
  const first4Col = s.set ? `first4=${s.first4.padEnd(7)}` : "first4=-------";
  const hashCol = `sha=${s.hash}`;
  console.log(`  [${statusPill}] ${s.spec.key.padEnd(keyW)}  ${lengthCol}  ${first4Col}  ${hashCol}`);
  if (s.spec.note) {
    console.log(`               ↳ ${s.spec.note}`);
  }
}

console.log("");

// ── Critical equality check ──
const outreachToken = process.env.POSTMARK_OUTREACH_SERVER_TOKEN ?? "";
const transactionalToken = process.env.POSTMARK_SERVER_TOKEN ?? "";
if (outreachToken && transactionalToken) {
  const outreachHash = createHash("sha256").update(outreachToken).digest("hex").slice(0, 8);
  const transactionalHash = createHash("sha256").update(transactionalToken).digest("hex").slice(0, 8);
  if (outreachHash === transactionalHash) {
    console.log("✗ FATAL — POSTMARK_OUTREACH_SERVER_TOKEN equals POSTMARK_SERVER_TOKEN.");
    console.log("          You'd send outreach from the transactional server. Stop. Get a separate server token.");
  } else {
    console.log("✓ POSTMARK_OUTREACH_SERVER_TOKEN ≠ POSTMARK_SERVER_TOKEN (hashes differ — good)");
  }
} else if (outreachToken && !transactionalToken) {
  console.log("ℹ  POSTMARK_SERVER_TOKEN not set locally — can't perform the inequality check here, but Vercel must have a different one.");
}

console.log("");

// ── Summary ──
const required = snapshots.filter((s) => s.spec.required);
const setOk = required.filter((s) => s.meetsMin).length;
const total = required.length;
const missing = required.filter((s) => !s.set).map((s) => s.spec.key);
const tooShort = required.filter((s) => s.set && !s.meetsMin).map((s) => s.spec.key);

console.log(`Required vars: ${setOk}/${total} meet minimum length.`);
if (missing.length) console.log(`  Missing  : ${missing.join(", ")}`);
if (tooShort.length) console.log(`  Too short: ${tooShort.join(", ")}`);
console.log("");

if (setOk === total) {
  console.log("✓ Local .env.local has all required outreach vars set.");
  console.log("  Next: confirm the same values are in Vercel (Production env), then run preflight.ts.");
  process.exit(0);
} else {
  console.log("✗ Fix the above before running preflight.ts.");
  process.exit(1);
}
