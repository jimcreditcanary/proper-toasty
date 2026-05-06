// GET /api/admin/debug/epc-raw?uprn=<n>  or  ?postcode=<x>
//
// Temporary admin-gated diagnostic. Hits the GOV.UK EPC API directly,
// bypasses our cache, our zod validation, and our normalisation layer
// entirely. Returns the raw upstream JSON so we can see the actual
// field shape (camelCase vs snake_case, nested envelope, etc.) instead
// of guessing from the broken downstream output.
//
// Two queries:
//   /api/admin/debug/epc-raw?uprn=12082227
//     → search by UPRN, then fetch detail for the first matching cert
//   /api/admin/debug/epc-raw?postcode=W5+4SE
//     → search by postcode, then fetch detail for the first cert
//
// Safe to leave in — admin-only, returns 403 to anyone else. Rip out
// once the EPC pipeline is verified end-to-end.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/require-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EPC_BASE = "https://api.get-energy-performance-data.communities.gov.uk";

function authHeaders(): Record<string, string> {
  const token = process.env.EPC_API_KEY;
  if (!token) throw new Error("EPC_API_KEY not set");
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

export async function GET(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(req.url);
  const uprn = url.searchParams.get("uprn")?.trim();
  const postcode = url.searchParams.get("postcode")?.trim();

  if (!uprn && !postcode) {
    return NextResponse.json(
      { error: "provide ?uprn= or ?postcode=" },
      { status: 400 }
    );
  }

  const out: Record<string, unknown> = {};

  // ── 1. Search ────────────────────────────────────────────────────
  const searchUrl = new URL(`${EPC_BASE}/api/domestic/search`);
  if (uprn) {
    searchUrl.searchParams.set("uprn", uprn);
    searchUrl.searchParams.set("page_size", "10");
  } else {
    searchUrl.searchParams.set(
      "postcode",
      (postcode ?? "").toUpperCase().replace(/\s+/g, "")
    );
    searchUrl.searchParams.set("page_size", "10");
  }

  let searchJson: unknown = null;
  try {
    const res = await fetch(searchUrl.toString(), { headers: authHeaders() });
    out.search = {
      status: res.status,
      ok: res.ok,
      url: searchUrl.toString().replace(uprn ?? "", "***"),
    };
    const text = await res.text();
    try {
      searchJson = JSON.parse(text);
      out.search = {
        ...(out.search as object),
        topLevelKeys:
          searchJson && typeof searchJson === "object"
            ? Object.keys(searchJson as object)
            : null,
        firstRowKeys: getFirstRowKeys(searchJson),
        body: searchJson,
      };
    } catch {
      out.search = { ...(out.search as object), bodyText: text.slice(0, 2000) };
    }
  } catch (err) {
    out.searchError = err instanceof Error ? err.message : String(err);
    return NextResponse.json(out, { status: 502 });
  }

  // ── 2. Pick a certificate number from the search response ────────
  const certNumber = pickFirstCertNumber(searchJson);
  if (!certNumber) {
    out.note = "search returned no certificate number; cannot fetch detail";
    return NextResponse.json(out);
  }

  // ── 3. Detail ────────────────────────────────────────────────────
  const detailUrl = new URL(`${EPC_BASE}/api/certificate`);
  detailUrl.searchParams.set("certificate_number", certNumber);

  try {
    const res = await fetch(detailUrl.toString(), { headers: authHeaders() });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      out.detail = {
        status: res.status,
        ok: res.ok,
        bodyText: text.slice(0, 2000),
      };
      return NextResponse.json(out);
    }

    out.detail = {
      status: res.status,
      ok: res.ok,
      topLevelKeys:
        body && typeof body === "object" ? Object.keys(body as object) : null,
      // Pull out the common band fields under both casings to settle
      // the camelCase-vs-snake_case question definitively.
      bandSamples: pluckBandSamples(body),
      body,
    };
  } catch (err) {
    out.detailError = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(out);
}

function getFirstRowKeys(json: unknown): string[] | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0];
  if (!first || typeof first !== "object") return null;
  return Object.keys(first as object);
}

function pickFirstCertNumber(json: unknown): string | null {
  if (!json || typeof json !== "object") return null;
  const data = (json as { data?: unknown }).data;
  if (!Array.isArray(data) || data.length === 0) return null;
  const first = data[0] as Record<string, unknown>;
  const candidate =
    first.certificate_number ?? first.certificateNumber ?? first.lmkKey;
  return typeof candidate === "string" ? candidate : null;
}

function pluckBandSamples(json: unknown): Record<string, unknown> {
  if (!json || typeof json !== "object") return {};
  // Try both flat and { data: ... } envelope.
  const flat = json as Record<string, unknown>;
  const wrapped = (flat.data ?? flat) as Record<string, unknown>;
  const target = (wrapped && typeof wrapped === "object" ? wrapped : flat) as Record<
    string,
    unknown
  >;

  const fields = [
    "current_energy_efficiency_band",
    "currentEnergyEfficiencyBand",
    "current_energy_band",
    "currentEnergyBand",
    "potential_energy_efficiency_band",
    "potentialEnergyEfficiencyBand",
    "current_energy_efficiency_rating",
    "currentEnergyEfficiencyRating",
  ];
  return Object.fromEntries(
    fields.map((f) => [f, target[f] ?? null])
  );
}
