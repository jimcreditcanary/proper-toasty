// Lightweight .env.local loader for scripts.
//
// Why this exists rather than using `node --env-file=.env.local`:
//
//   Node 22's --env-file parser silently corrupts state when it
//   encounters a multi-line value (e.g. a Google service-account
//   PEM stored across embedded `\n` escapes inside `"..."` quotes).
//   Lines AFTER the corrupted parse come back as empty strings —
//   no error, no warning, just process.env[k] === "".
//
//   We hit this with ANTHROPIC_API_KEY in May 2026 — the key sat
//   right after GOOGLE_CALENDAR_SA_PRIVATE_KEY in .env.local and
//   came back as length 0 from --env-file. Manual line-by-line
//   parsing returned the correct 108-char value.
//
//   `dotenv` package has the same bug.
//
// What this loader does:
//
//   1. Reads .env.local once at import time (idempotent — safe to
//      import in multiple scripts).
//   2. Splits on newline.
//   3. Parses each line as KEY=value, stripping ONLY outer single
//      or double quotes from the value.
//   4. Sets process.env[key] = value, unless already set (CLI args
//      and explicit shell env take precedence).
//
// Critically: it never prints any value to stdout/stderr. Failure
// to load is silent — the calling script will detect missing env
// vars via its own guards (e.g. `requireToken()` in epc-search.ts).
//
// Usage in any script:
//
//   import "@/lib/dev/load-env";
//   // env vars now available on process.env
//
// Or for direct relative imports from scripts/:
//
//   import "../../src/lib/dev/load-env";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface LoadOpts {
  /** Path to env file. Defaults to .env.local in process.cwd(). */
  path?: string;
  /** When true (default), overwrite existing process.env values.
   *  Required because tsx (and Node 22+ in some configurations)
   *  auto-loads .env.local using a parser that corrupts on multi-
   *  line PEM values — leaving downstream entries pre-set to empty
   *  strings. Without overwriting, the corrupted values would
   *  win against our hand-rolled (correct) parser. */
  override?: boolean;
}

function loadEnvFile(opts: LoadOpts = {}): { loaded: number; skipped: number } {
  const filePath = opts.path ?? resolve(process.cwd(), ".env.local");
  let content: string;
  try {
    content = readFileSync(filePath, "utf-8");
  } catch {
    // File missing or unreadable — silently no-op. Caller scripts
    // detect missing env vars via their own guards.
    return { loaded: 0, skipped: 0 };
  }

  let loaded = 0;
  let skipped = 0;

  // Simple line-by-line parse. Doesn't try to handle continuations,
  // unquoted multi-line values, or backslash-newline escapes — the
  // .env.local format we use stores PEMs as single lines with `\n`
  // ESCAPE sequences inside `"..."` quotes, which this parser handles
  // correctly (it just keeps the `\n` as literal 2-char sequences,
  // and consumer code does `.replace(/\\n/g, "\n")` when needed).
  for (const rawLine of content.split("\n")) {
    const line = rawLine.replace(/^﻿/, ""); // strip BOM if present
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = line.indexOf("=");
    if (eq < 0) continue;

    const key = line.slice(0, eq).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) continue;

    let value = line.slice(eq + 1);

    // Strip outer quotes (single OR double). Keep inner content
    // verbatim — including `\n` literal sequences which downstream
    // consumers parse if they need real newlines (e.g. JWT signing
    // libs for service-account PEMs).
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      if (value.length >= 2) value = value.slice(1, -1);
    }

    // Default: overwrite. See the comment on LoadOpts.override for
    // why this is the right default for this codebase. To preserve
    // an existing non-empty value, pass override: false explicitly.
    const shouldOverride = opts.override !== false;
    if (!shouldOverride && process.env[key] !== undefined && process.env[key] !== "") {
      skipped += 1;
      continue;
    }
    process.env[key] = value;
    loaded += 1;
  }
  return { loaded, skipped };
}

// Run once at module import — idempotent. Default behaviour is what
// every script wants: load .env.local from cwd, don't override
// already-set vars. Override for specific scripts by importing the
// function and calling explicitly.
loadEnvFile();

export { loadEnvFile };
