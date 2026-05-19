// One-shot enrichment: populate `installers.first_name` +
// `first_name_source` so outreach emails can address the recipient
// by name when the `{{#first_name}}` conditional fires.
//
// Heuristic ladder, per installer (stops at first hit):
//
//   a) Email local-part extraction. Splits on `.` `_` `-` and
//      accepts the first plain-alphabetic token. Role accounts
//      (info@, sales@, careers@, etc) bypass this step entirely.
//      For un-delimited single tokens (e.g. "jamesfell"), defers
//      to Claude with strict JSON output — bail to step (b) on null.
//
//   b) Companies House `/officers` lookup. Picks the active director
//      (sole survivor, or most-recently-appointed when several).
//      Cached via `api_cache` (namespace "companies:officers", 30d).
//
//   c) Otherwise leave first_name = NULL — the `{{#first_name}}`
//      conditional in subject_variants drops cleanly.
//
// Usage:
//   npx tsx scripts/outreach/enrich-installer-names.ts
//   npx tsx scripts/outreach/enrich-installer-names.ts --dry-run
//   npx tsx scripts/outreach/enrich-installer-names.ts --limit 50
//   npx tsx scripts/outreach/enrich-installer-names.ts --force
//
// Idempotent: re-runs skip rows that already have first_name unless
// --force is passed. Rows with first_name_source = 'manual' are
// NEVER overwritten regardless of --force.
//
// Required env (loaded via src/lib/dev/load-env.ts):
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   COMPANIES_HOUSE_API_KEY
//   ANTHROPIC_API_KEY   (only used when the LLM step fires)

import "../../src/lib/dev/load-env";

import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import type { Database } from "../../src/types/database";
import {
  classifyLocalPart,
  extractLocalPart,
  parseOfficerFirstName,
  pickPrimaryDirector,
  sanitiseFirstName,
  type OfficerLite,
  type OfficersResponse,
} from "../../src/lib/outreach/first-name";
import { cacheGet, cacheSet } from "../../src/lib/services/api-cache";

// ─── CLI flags ────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const LIMIT_FLAG = process.argv.indexOf("--limit");
const LIMIT = LIMIT_FLAG > 0 ? Number(process.argv[LIMIT_FLAG + 1]) : 0;
const BATCH = 100;

// CH throttle. The CH limit is 600 reqs / 5 min = 2/sec — match the
// existing scripts/enrich-installers-companies-house.ts pacing.
const CH_THROTTLE_MS = 500;

// Officers cache TTL (30 days). Officers move around slowly; refreshing
// monthly is plenty.
const OFFICERS_CACHE_TTL_S = 30 * 24 * 60 * 60;

type Source = "email_local_part" | "companies_house_director";

interface InstallerLite {
  id: number;
  company_name: string;
  email: string | null;
  company_number: string | null;
  first_name: string | null;
  first_name_source:
    | "email_local_part"
    | "companies_house_director"
    | "manual"
    | null;
}

interface EnrichResult {
  installerId: number;
  companyName: string;
  firstName: string;
  source: Source;
  detail: string;
}

interface SkipReason {
  installerId: number;
  reason: string;
}

// ─── Companies House officers (with cache) ────────────────────────

async function fetchOfficers(
  companyNumber: string,
  apiKey: string,
): Promise<
  | { ok: true; data: OfficersResponse; cached: boolean }
  | { ok: false; status: string }
> {
  const cleaned = companyNumber.trim().toUpperCase().replace(/\s+/g, "");
  if (!cleaned) return { ok: false, status: "empty_number" };

  const cached = await cacheGet<OfficersResponse>("companies:officers", cleaned);
  if (cached) return { ok: true, data: cached, cached: true };

  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  let res: Response;
  try {
    res = await fetch(
      `https://api.company-information.service.gov.uk/company/${encodeURIComponent(
        cleaned,
      )}/officers`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
    );
  } catch (e) {
    return {
      ok: false,
      status: `network: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
  if (res.status === 404) return { ok: false, status: "not_found" };
  if (res.status === 429) return { ok: false, status: "rate_limited" };
  if (!res.ok) return { ok: false, status: `http_${res.status}` };
  try {
    const data = (await res.json()) as OfficersResponse;
    await cacheSet("companies:officers", cleaned, data, OFFICERS_CACHE_TTL_S);
    return { ok: true, data, cached: false };
  } catch (e) {
    return {
      ok: false,
      status: `parse: ${e instanceof Error ? e.message : "unknown"}`,
    };
  }
}

// ─── Claude LLM disambiguator ─────────────────────────────────────

const CLAUDE_MODEL = "claude-sonnet-4-5";

async function claudeExtractFirstName(
  client: Anthropic,
  localPart: string,
): Promise<string | null> {
  // Strict JSON output — { "first_name": "James" | null }.
  // Bail to next step on any parse weirdness.
  const res = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 100,
    system:
      "You identify recognisable first names inside email local-parts (the part before the @). Many local-parts are concatenated forms like 'jamesfell' (James Fell), 'lornapearce' (Lorna Pearce), or 'mikeohara' (Mike O'Hara). Others are vanity handles ('greentech', 'solarguy') with no real personal name. Respond with strict JSON. No prose.",
    messages: [
      {
        role: "user",
        content: `Local-part: "${localPart}"\n\nWhat first name (if any) does this contain? Output exactly one line of JSON of the form {"first_name": "James"} or {"first_name": null}. Use null when the local-part is a vanity handle, brand name, role account, or anything where you're not confident the substring is a real personal first name. Title-case the name when present.`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") return null;
  const text = block.text.trim();
  // Strip a code-fence wrap if present.
  const fenced = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(text);
  const candidate = fenced ? fenced[1].trim() : text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    return null;
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("first_name" in parsed)
  ) {
    return null;
  }
  const fn = (parsed as { first_name: unknown }).first_name;
  if (fn === null) return null;
  if (typeof fn !== "string") return null;
  return fn;
}

// ─── Enrichment ladder for a single installer ─────────────────────

interface LadderDeps {
  anthropic: Anthropic | null;
  chKey: string;
}

interface LadderOutcome {
  firstName: string;
  source: Source;
  detail: string;
  /** True iff a live CH HTTP fetch happened during this ladder run.
   *  Caller uses this to gate the 500ms throttle so cache hits don't
   *  needlessly slow down the script. */
  hitChNetwork: boolean;
}

async function runLadder(
  installer: InstallerLite,
  deps: LadderDeps,
): Promise<LadderOutcome | { skip: string; hitChNetwork: boolean }> {
  // Step (a): email local-part.
  const lp = extractLocalPart(installer.email);
  let bypassedToCh = false;
  if (lp) {
    const cls = classifyLocalPart(lp);
    if (cls.isRoleAccount) {
      bypassedToCh = true;
    } else if (cls.candidate && !cls.needsLlm) {
      const sane = sanitiseFirstName(cls.candidate);
      if (sane) {
        return {
          firstName: sane,
          source: "email_local_part",
          detail: `delimited:${lp}`,
          hitChNetwork: false,
        };
      }
    } else if (cls.candidate && cls.needsLlm) {
      if (deps.anthropic) {
        let llmRaw: string | null = null;
        try {
          llmRaw = await claudeExtractFirstName(deps.anthropic, lp);
        } catch (e) {
          // LLM error → fall through to CH lookup.
          console.warn(
            `  [${installer.id}] claude error: ${e instanceof Error ? e.message : "unknown"}`,
          );
        }
        const sane = sanitiseFirstName(llmRaw);
        if (sane) {
          return {
            firstName: sane,
            source: "email_local_part",
            detail: `llm:${lp}`,
            hitChNetwork: false,
          };
        }
      }
      // Claude returned null or no key configured → fall through.
    }
    // Plain unrecognisable local-part → fall through to CH only if
    // we haven't already short-circuited via the role-account path.
    if (!bypassedToCh && !cls.isRoleAccount) {
      // We tried (a) and got nothing useful. Still try CH so the
      // ladder is genuinely a ladder — but only when a company
      // number exists. (If a personal-shaped email genuinely lacks
      // a recoverable name, the director lookup is still our best
      // remaining shot.)
    }
  }

  // Step (b): Companies House director lookup.
  if (!installer.company_number) {
    return {
      skip: lp ? "no_local_match_no_ch" : "no_email_no_ch",
      hitChNetwork: false,
    };
  }
  const officersRes = await fetchOfficers(installer.company_number, deps.chKey);
  const hitNet = officersRes.ok ? !officersRes.cached : true;
  if (!officersRes.ok) {
    return { skip: `ch_${officersRes.status}`, hitChNetwork: hitNet };
  }
  const director = pickPrimaryDirector(officersRes.data.items);
  if (!director) {
    return { skip: "ch_no_active_director", hitChNetwork: hitNet };
  }
  const raw = parseOfficerFirstName(director.name);
  const sane = sanitiseFirstName(raw);
  if (!sane) {
    return { skip: "ch_unparseable_name", hitChNetwork: hitNet };
  }
  return {
    firstName: sane,
    source: "companies_house_director",
    detail: `ch:${installer.company_number}:${director.appointed_on ?? "unknown"}`,
    hitChNetwork: hitNet,
  };
}

// ─── Throttle helper ──────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const chKey = process.env.COMPANIES_HOUSE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!chKey) {
    console.error("Set COMPANIES_HOUSE_API_KEY");
    process.exit(1);
  }
  const supabase = createClient<Database>(url, key);
  const anthropic = anthropicKey ? new Anthropic({ apiKey: anthropicKey }) : null;
  if (!anthropic) {
    console.warn(
      "ANTHROPIC_API_KEY not set — un-delimited local-parts will be skipped at step (a) and may fall through to CH.",
    );
  }

  // Page through installers. We pull a minimum set of columns; the
  // ladder only needs id, company_name, email, company_number,
  // first_name (existing), first_name_source.
  // PostgREST caps individual queries at 1000 rows; page until short.
  type CandidateRow = InstallerLite;
  const PAGE = 1000;
  const all: CandidateRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("installers")
      .select("id, company_name, email, company_number, first_name, first_name_source")
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (!FORCE) {
      // Skip rows that already have a first_name.
      q = q.is("first_name", null);
    }
    // Never overwrite manual entries regardless of --force.
    q = q.or("first_name_source.is.null,first_name_source.neq.manual");

    const { data: page, error } = await q;
    if (error) {
      console.error("query failed:", error.message);
      process.exit(1);
    }
    const rows = (page ?? []) as CandidateRow[];
    all.push(...rows);
    if (rows.length < PAGE) break;
  }
  const work = LIMIT > 0 ? all.slice(0, LIMIT) : all;

  console.log(
    `${work.length.toLocaleString()} installer(s) to consider` +
      `${FORCE ? " (--force)" : ""}` +
      `${LIMIT > 0 ? ` (--limit ${LIMIT})` : ""}` +
      `${DRY_RUN ? " (DRY-RUN)" : ""}`,
  );

  const deps: LadderDeps = { anthropic, chKey };

  const updates: EnrichResult[] = [];
  const skips: SkipReason[] = [];
  const sourceCounts = { email_local_part: 0, companies_house_director: 0 };

  for (let i = 0; i < work.length; i += BATCH) {
    const batch = work.slice(i, i + BATCH);
    for (const row of batch) {
      const outcome = await runLadder(row, deps);
      if ("skip" in outcome) {
        skips.push({ installerId: row.id, reason: outcome.skip });
        if (outcome.hitChNetwork) await sleep(CH_THROTTLE_MS);
        continue;
      }
      updates.push({
        installerId: row.id,
        companyName: row.company_name,
        firstName: outcome.firstName,
        source: outcome.source,
        detail: outcome.detail,
      });
      sourceCounts[outcome.source] += 1;
      if (DRY_RUN) {
        console.log(
          `  [${row.id}] ${row.company_name} → ${outcome.firstName} (${outcome.source} / ${outcome.detail})`,
        );
      } else {
        const { error } = await supabase
          .from("installers")
          .update({
            first_name: outcome.firstName,
            first_name_source: outcome.source,
          })
          .eq("id", row.id);
        if (error) {
          console.error(`  [${row.id}] update failed: ${error.message}`);
          skips.push({ installerId: row.id, reason: `update_error` });
          continue;
        }
      }
      // Only throttle when we actually hit CH upstream — cache
      // hits don't count against the rate-limit budget.
      if (outcome.hitChNetwork) {
        await sleep(CH_THROTTLE_MS);
      }
    }
    process.stdout.write(
      `\r  progress: ${Math.min(i + BATCH, work.length).toLocaleString()} / ${work.length.toLocaleString()} ` +
        `(updates=${updates.length} skipped=${skips.length})`,
    );
  }
  process.stdout.write("\n");

  // ─── Summary ────────────────────────────────────────────────────
  console.log("\n── Summary ──");
  console.log(`Total considered:           ${work.length.toLocaleString()}`);
  console.log(`Updated (or would update):  ${updates.length.toLocaleString()}`);
  console.log(`  email_local_part:         ${sourceCounts.email_local_part.toLocaleString()}`);
  console.log(
    `  companies_house_director: ${sourceCounts.companies_house_director.toLocaleString()}`,
  );
  console.log(`Skipped (no source):        ${skips.length.toLocaleString()}`);

  // Top skip reasons, descending — useful audit signal.
  const skipReasonCounts: Record<string, number> = {};
  for (const s of skips) {
    skipReasonCounts[s.reason] = (skipReasonCounts[s.reason] ?? 0) + 1;
  }
  const topReasons = Object.entries(skipReasonCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  if (topReasons.length > 0) {
    console.log("Top skip reasons:");
    for (const [reason, count] of topReasons) {
      console.log(`  ${reason.padEnd(28)} ${count.toLocaleString()}`);
    }
  }

  if (DRY_RUN) {
    console.log("\n(dry-run — nothing was written)");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
