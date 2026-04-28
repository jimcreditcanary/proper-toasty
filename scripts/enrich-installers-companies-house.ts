// One-shot enrichment: pull Companies House data for every installer
// with a `company_number`, persist incorporation_date + years_in_business.
//
// Usage:
//   npx tsx scripts/enrich-installers-companies-house.ts
//   npx tsx scripts/enrich-installers-companies-house.ts --refresh   # ignore cache
//   npx tsx scripts/enrich-installers-companies-house.ts --limit 50  # smoke test
//
// Required env:
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   COMPANIES_HOUSE_API_KEY  (free signup: https://developer.company-information.service.gov.uk/)
//
// API:
//   GET https://api.company-information.service.gov.uk/company/{company_number}
//   Auth: HTTP Basic with API key as username, blank password.
//   Rate limit: 600 reqs / 5 min = 2 reqs/sec. We throttle to 2/sec to be safe.
//
// At ~4,900 installers with company numbers, expect ~41 minutes for a
// full run. Re-runs are cheap because we skip rows fetched in the last
// 365 days unless --refresh is passed.

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

const REFRESH = process.argv.includes("--refresh");
const LIMIT_FLAG = process.argv.indexOf("--limit");
const LIMIT = LIMIT_FLAG > 0 ? Number(process.argv[LIMIT_FLAG + 1]) : 0;

const STALE_AFTER_DAYS = 365;
const THROTTLE_MS = 500; // 2 reqs/sec — well under CH's 600/5min limit

interface CompanyResponse {
  date_of_creation?: string; // YYYY-MM-DD
  company_status?: string;
}

async function fetchCompany(
  number: string,
  apiKey: string,
): Promise<{ ok: true; data: CompanyResponse } | { ok: false; status: string }> {
  const auth = Buffer.from(`${apiKey}:`).toString("base64");
  let res: Response;
  try {
    res = await fetch(
      `https://api.company-information.service.gov.uk/company/${encodeURIComponent(number)}`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: "application/json",
        },
      },
    );
  } catch (e) {
    return { ok: false, status: `network: ${e instanceof Error ? e.message : "unknown"}` };
  }
  if (res.status === 404) return { ok: false, status: "not_found" };
  if (res.status === 429) return { ok: false, status: "rate_limited" };
  if (!res.ok) return { ok: false, status: `http_${res.status}` };
  try {
    const data = (await res.json()) as CompanyResponse;
    return { ok: true, data };
  } catch (e) {
    return { ok: false, status: `parse: ${e instanceof Error ? e.message : "unknown"}` };
  }
}

function yearsBetween(isoDate: string): number | null {
  const created = new Date(isoDate).getTime();
  if (Number.isNaN(created)) return null;
  const ms = Date.now() - created;
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24 * 365.25)));
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const chKey = process.env.COMPANIES_HOUSE_API_KEY;
  if (!url || !key) {
    console.error("Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  if (!chKey) {
    console.error(
      "Set COMPANIES_HOUSE_API_KEY (free at https://developer.company-information.service.gov.uk/)",
    );
    process.exit(1);
  }
  const supabase = createClient<Database>(url, key);

  // Pull installers with a company_number that haven't been enriched
  // recently (or at all). Re-runs become near-instant after the first
  // pass because cached rows are skipped.
  const staleCutoff = new Date(
    Date.now() - STALE_AFTER_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  let q = supabase
    .from("installers")
    .select("id, company_number, companies_house_fetched_at")
    .not("company_number", "is", null);

  if (!REFRESH) {
    q = q.or(
      `companies_house_fetched_at.is.null,companies_house_fetched_at.lt.${staleCutoff}`,
    );
  }

  const { data: rows, error } = await q;
  if (error) {
    console.error("query failed:", error.message);
    process.exit(1);
  }
  const work = LIMIT > 0 ? (rows ?? []).slice(0, LIMIT) : (rows ?? []);
  console.log(
    `📦 ${work.length.toLocaleString()} installer(s) to enrich${REFRESH ? " (--refresh)" : ""}${LIMIT > 0 ? ` (--limit ${LIMIT})` : ""}`,
  );

  let ok = 0;
  let notFound = 0;
  let failed = 0;

  for (let i = 0; i < work.length; i++) {
    const row = work[i];
    if (!row.company_number) continue;
    const result = await fetchCompany(row.company_number, chKey);
    const now = new Date().toISOString();
    if (result.ok) {
      const date = result.data.date_of_creation ?? null;
      const years = date ? yearsBetween(date) : null;
      await supabase
        .from("installers")
        .update({
          incorporation_date: date,
          years_in_business: years,
          companies_house_fetched_at: now,
          companies_house_status: "ok",
        })
        .eq("id", row.id);
      ok += 1;
    } else {
      if (result.status === "not_found") notFound += 1;
      else failed += 1;
      await supabase
        .from("installers")
        .update({
          companies_house_fetched_at: now,
          companies_house_status: result.status,
        })
        .eq("id", row.id);
    }

    if (i % 25 === 24) {
      process.stdout.write(
        `\r  progress: ${(i + 1).toLocaleString()} / ${work.length.toLocaleString()} (ok=${ok} not_found=${notFound} failed=${failed})`,
      );
    }
    await sleep(THROTTLE_MS);
  }
  process.stdout.write("\n");

  console.log(
    `\nDone. ok=${ok.toLocaleString()} not_found=${notFound.toLocaleString()} failed=${failed.toLocaleString()}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
