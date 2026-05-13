// scripts/epc-bulk/download.ts — request + save the full EPC domestic
// bulk dataset (zip of CSVs, regenerated monthly by DESNZ).
//
// Endpoint:
//   GET https://api.get-energy-performance-data.communities.gov.uk/api/files/domestic/csv
//   Authorization: Bearer ${EPC_API_KEY}
//   Accept: application/json
//
// Behaviour: GOV.UK responds 302 with a signed S3 redirect to the
// actual zip. We follow once (fetch's default), then stream the body
// to disk. The zip contains per-year CSV files; downstream aggregator
// scripts (next deliverable) walk it locally without touching the
// 6GB raw payload via the network again.
//
// IMPORTANT: per CLAUDE.md secrets policy we never print or log the
// EPC_API_KEY value. Progress output is bytes/time only.
//
// Usage:
//   npx tsx scripts/epc-bulk/download.ts
//   npx tsx scripts/epc-bulk/download.ts --out /path/to/file.zip
//   npx tsx scripts/epc-bulk/download.ts --info-only

import "../../src/lib/dev/load-env";

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";

const EPC_BASE =
  "https://api.get-energy-performance-data.communities.gov.uk";
const DOWNLOAD_PATH = "/api/files/domestic/csv";
const INFO_PATH = "/api/files/domestic/csv/info";

function requireToken(): string {
  const token = process.env.EPC_API_KEY;
  if (!token || token.trim() === "") {
    console.error(
      "[epc-bulk] EPC_API_KEY not set — add it to .env.local before running."
    );
    process.exit(1);
  }
  return token;
}

function defaultOutPath(): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(
    process.env.HOME ?? "/tmp",
    "Desktop",
    `epc-bulk-domestic-${today}.zip`
  );
}

function parseArgs(): { outPath: string; infoOnly: boolean } {
  const argv = process.argv.slice(2);
  let outPath = defaultOutPath();
  let infoOnly = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out" && argv[i + 1]) {
      outPath = argv[++i];
    } else if (a === "--info-only") {
      infoOnly = true;
    } else if (a === "--help" || a === "-h") {
      console.log(
        [
          "Usage: npx tsx scripts/epc-bulk/download.ts [options]",
          "",
          "Options:",
          "  --out <path>     Output path (default: ~/Desktop/epc-bulk-domestic-YYYY-MM-DD.zip)",
          "  --info-only      Only print dataset metadata, don't download",
          "  -h, --help       Show this help",
        ].join("\n")
      );
      process.exit(0);
    }
  }
  return { outPath, infoOnly };
}

async function fetchInfo(token: string): Promise<unknown> {
  const url = `${EPC_BASE}${INFO_PATH}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[epc-bulk] /info returned ${res.status}: ${body.slice(0, 300)}`
    );
  }
  return res.json();
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m === 0) return `${s}s`;
  const h = Math.floor(m / 60);
  if (h === 0) return `${m}m${s % 60}s`;
  return `${h}h${m % 60}m`;
}

async function downloadZip(token: string, outPath: string): Promise<void> {
  console.log(`[epc-bulk] Output: ${outPath}`);

  // Ensure the parent dir exists (Desktop normally does, but be safe).
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Refuse to silently overwrite a recent download.
  if (fs.existsSync(outPath)) {
    const stat = fs.statSync(outPath);
    console.warn(
      `[epc-bulk] File already exists (${fmtBytes(stat.size)}, modified ${stat.mtime.toISOString()}).`
    );
    console.warn(`[epc-bulk] Delete it first if you want a fresh copy:`);
    console.warn(`  rm "${outPath}"`);
    process.exit(1);
  }

  const url = `${EPC_BASE}${DOWNLOAD_PATH}`;
  console.log(`[epc-bulk] Requesting ${url}`);
  const startedAt = Date.now();

  // Node fetch follows redirects by default — the 302 → signed S3 URL
  // happens transparently. We never see the signed URL in logs (which
  // is good; it embeds short-lived credentials).
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[epc-bulk] Download failed: ${res.status} ${res.statusText}\n${body.slice(0, 500)}`
    );
  }

  if (!res.body) {
    throw new Error("[epc-bulk] Response had no body");
  }

  const contentLength = Number(res.headers.get("content-length") ?? 0);
  if (contentLength > 0) {
    console.log(`[epc-bulk] Expected size: ${fmtBytes(contentLength)}`);
  } else {
    console.log(
      "[epc-bulk] Expected size: unknown (no Content-Length on signed URL)"
    );
  }

  // Write to .partial first; rename at end so a half-finished download
  // can't be mistaken for a complete one.
  const partial = `${outPath}.partial`;
  if (fs.existsSync(partial)) fs.unlinkSync(partial);

  let bytesWritten = 0;
  let lastReportAt = Date.now();
  let lastReportBytes = 0;

  // Wrap the web ReadableStream as a Node Readable so we can pipeline
  // it through a write stream with backpressure.
  const nodeStream = Readable.fromWeb(
    res.body as unknown as import("node:stream/web").ReadableStream<Uint8Array>
  );

  nodeStream.on("data", (chunk: Buffer) => {
    bytesWritten += chunk.length;
    const now = Date.now();
    // Throttle progress prints to once per 2s.
    if (now - lastReportAt >= 2000) {
      const dtSec = (now - lastReportAt) / 1000;
      const rateMBps = ((bytesWritten - lastReportBytes) / dtSec / 1048576);
      const pctStr = contentLength
        ? ` (${((bytesWritten / contentLength) * 100).toFixed(1)}%)`
        : "";
      const etaStr =
        contentLength && rateMBps > 0
          ? `, ETA ${fmtDuration(
              ((contentLength - bytesWritten) / (rateMBps * 1048576)) * 1000
            )}`
          : "";
      console.log(
        `[epc-bulk] ${fmtBytes(bytesWritten)}${pctStr} @ ${rateMBps.toFixed(1)} MB/s${etaStr}`
      );
      lastReportAt = now;
      lastReportBytes = bytesWritten;
    }
  });

  const out = fs.createWriteStream(partial);
  await pipeline(nodeStream, out);

  // Sanity-check: zip files start with magic bytes "PK\x03\x04".
  // Catches the case where GOV.UK returns a JSON error body that
  // still has 200 OK (rare but seen historically).
  const head = Buffer.alloc(4);
  const fd = fs.openSync(partial, "r");
  fs.readSync(fd, head, 0, 4, 0);
  fs.closeSync(fd);
  const isZip =
    head[0] === 0x50 &&
    head[1] === 0x4b &&
    (head[2] === 0x03 || head[2] === 0x05 || head[2] === 0x07) &&
    (head[3] === 0x04 || head[3] === 0x06 || head[3] === 0x08);
  if (!isZip) {
    console.error(
      `[epc-bulk] Downloaded file doesn't start with ZIP magic bytes. First 4 bytes: ${head
        .toString("hex")
        .toUpperCase()}`
    );
    console.error(
      `[epc-bulk] File kept at ${partial} for inspection. Likely an error payload, not a real zip.`
    );
    process.exit(1);
  }

  fs.renameSync(partial, outPath);

  const elapsed = Date.now() - startedAt;
  const finalStat = fs.statSync(outPath);
  console.log("");
  console.log(`[epc-bulk] Done.`);
  console.log(`[epc-bulk] Saved ${fmtBytes(finalStat.size)} to ${outPath}`);
  console.log(`[epc-bulk] Total time: ${fmtDuration(elapsed)}`);
}

async function main(): Promise<void> {
  const token = requireToken();
  const { outPath, infoOnly } = parseArgs();

  console.log("[epc-bulk] EPC bulk download — domestic CSV dataset");
  console.log(`[epc-bulk] EPC_API_KEY: present (${token.length} chars)`);

  // Always fetch metadata first so we know the dataset version.
  let info: unknown = null;
  try {
    info = await fetchInfo(token);
    console.log("[epc-bulk] Dataset metadata:");
    console.log(JSON.stringify(info, null, 2));
  } catch (err) {
    console.warn(
      `[epc-bulk] Couldn't fetch /info (${err instanceof Error ? err.message : err}) — continuing without metadata.`
    );
  }

  if (infoOnly) {
    console.log("[epc-bulk] --info-only set, exiting without download.");
    return;
  }

  await downloadZip(token, outPath);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
