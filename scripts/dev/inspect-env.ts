#!/usr/bin/env tsx
//
// Safe .env.local inspector. Replaces every `grep`/`cat`/`awk`
// command you'd previously use to look at the env file — those
// commands print VALUES, which is how secrets leak.
//
// This script prints, per variable, ONLY:
//   - key name
//   - value length
//   - first 4 characters (for "does this look right" eyeball check)
//   - sha256 first 8 hex chars (for "did this value change between
//     runs" comparison — same value gives same hash)
//   - whether the value was quoted in the file
//
// NEVER prints the value itself. The script is safe to run in any
// terminal, paste into chat, screenshot, or commit output to a
// debug log.
//
// Usage:
//
//   npx tsx scripts/dev/inspect-env.ts
//   # or filter to one variable:
//   npx tsx scripts/dev/inspect-env.ts ANTHROPIC_API_KEY
//
// Output example (sanitised):
//
//   ANTHROPIC_API_KEY     length=108  first4=sk-a  sha256=4f2d1c8a  quoted=no
//   GOOGLE_..._KEY        length=1704 first4=----  sha256=9b3e7f21  quoted=yes
//   SUPABASE_URL          length=40   first4=http  sha256=abc12345  quoted=no

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const filter = process.argv[2] ?? null;
const path = resolve(process.cwd(), ".env.local");

let content: string;
try {
  content = readFileSync(path, "utf-8");
} catch (err) {
  console.error(
    `Couldn't read ${path}: ${err instanceof Error ? err.message : err}`,
  );
  process.exit(1);
}

interface Entry {
  key: string;
  length: number;
  first4: string;
  hash: string;
  quoted: boolean;
  lineNo: number;
}

const entries: Entry[] = [];
let lineNo = 0;
for (const rawLine of content.split("\n")) {
  lineNo += 1;
  const line = rawLine.replace(/^﻿/, "");
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq < 0) continue;
  const key = line.slice(0, eq).trim();
  if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;
  let value = line.slice(eq + 1);
  let quoted = false;
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    quoted = true;
    if (value.length >= 2) value = value.slice(1, -1);
  }
  entries.push({
    key,
    length: value.length,
    // First 4 chars only. Even at 4 chars, an attacker who knew the
    // key format (e.g. JWT starts "eyJ") gets no useful information.
    // Skip first4 entirely for very short values (< 12 chars) so we
    // don't accidentally publish meaningful prefixes of short tokens.
    first4: value.length >= 12 ? value.slice(0, 4) : "(short)",
    hash: createHash("sha256").update(value).digest("hex").slice(0, 8),
    quoted,
    lineNo,
  });
}

const filtered = filter
  ? entries.filter((e) => e.key === filter)
  : entries;

if (filtered.length === 0) {
  if (filter) {
    console.log(`No entry for ${filter} in .env.local.`);
  } else {
    console.log("No entries found in .env.local.");
  }
  process.exit(0);
}

// Find duplicates by key — common source of "why doesn't my key
// load" bugs. Surfaced as a warning.
const counts = new Map<string, number>();
for (const e of entries) counts.set(e.key, (counts.get(e.key) ?? 0) + 1);
const duplicates = [...counts.entries()].filter(([, c]) => c > 1);

// Find variables loaded BEFORE / AFTER any multi-line-looking value
// (long, quoted, has `\n` literals — likely a PEM). Adjacent to a
// PEM is where Node --env-file's parser corruption manifests.
const longQuoted = entries.find((e) => e.length > 500 && e.quoted);

console.log(`\n.env.local — ${entries.length} variable(s)\n`);
const keyW = Math.max(...filtered.map((e) => e.key.length));
for (const e of filtered) {
  console.log(
    `  ${e.key.padEnd(keyW)}  line=${String(e.lineNo).padStart(3)}  length=${String(e.length).padStart(5)}  first4=${e.first4.padEnd(7)}  sha256=${e.hash}  quoted=${e.quoted ? "yes" : "no "}`,
  );
}

if (duplicates.length > 0) {
  console.log("\n⚠ Duplicates detected (last occurrence wins for Node --env-file):");
  for (const [key, c] of duplicates) {
    console.log(`    ${key} appears ${c} times`);
  }
}

if (longQuoted) {
  console.log(
    `\nℹ  ${longQuoted.key} (line ${longQuoted.lineNo}) is a long quoted value`,
  );
  console.log(
    "   — Node --env-file occasionally corrupts parsing of vars right AFTER such values.",
  );
  console.log(
    "   — Scripts should import src/lib/dev/load-env.ts instead of using --env-file.",
  );
}

console.log("");
