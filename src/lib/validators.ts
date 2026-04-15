/**
 * UK identifier validators.
 *
 * Companies House registration number:
 *   8 chars total, either 8 digits (e.g. 12345678) or a 2-letter prefix
 *   + 6 digits (e.g. SC123456 for Scotland, NI for Northern Ireland,
 *   OC for LLPs, FC for foreign companies, etc.)
 *
 * UK VAT registration number:
 *   9 digits (standard), 12 digits (branch traders), or short prefixes
 *   GD### / HA### for government departments and health authorities.
 *   Optionally prefixed with "GB". Validated with HMRC's mod-97 / mod-97-55
 *   checksum.
 */

// ── Companies House ──────────────────────────────────────────────────

export function normaliseCompanyNumber(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase().slice(0, 8);
}

export function validateCompanyNumber(input: string): {
  ok: boolean;
  error?: string;
} {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { ok: true }; // optional
  const norm = normaliseCompanyNumber(trimmed);
  if (norm.length !== 8) {
    return {
      ok: false,
      error: "Company numbers are 8 characters (e.g. 12345678 or SC123456).",
    };
  }
  if (/^\d{8}$/.test(norm)) return { ok: true };
  if (/^[A-Z]{2}\d{6}$/.test(norm)) return { ok: true };
  return {
    ok: false,
    error: "Should be 8 digits, or 2 letters + 6 digits (e.g. SC123456).",
  };
}

// ── UK VAT ──────────────────────────────────────────────────────────

export function normaliseVatNumber(input: string): string {
  return (input ?? "")
    .replace(/\s+/g, "")
    .toUpperCase()
    .replace(/^GB/, "");
}

export function validateVatNumber(input: string): { ok: boolean; error?: string } {
  const trimmed = (input ?? "").trim();
  if (!trimmed) return { ok: true }; // optional

  const norm = normaliseVatNumber(trimmed);

  // Government department / health authority short formats
  if (/^GD\d{3}$/.test(norm)) return { ok: true };
  if (/^HA\d{3}$/.test(norm)) return { ok: true };

  if (!/^\d{9}(\d{3})?$/.test(norm)) {
    return {
      ok: false,
      error:
        "VAT numbers are 9 digits (e.g. 123456789), with or without a GB prefix.",
    };
  }

  // Checksum applies to the first 9 digits (12-digit numbers are branch
  // traders — same body, extra 3-digit branch identifier on the end).
  const first9 = norm.slice(0, 9);
  if (!ukVatChecksumOk(first9)) {
    return {
      ok: false,
      error:
        "That VAT number doesn't pass the HMRC checksum — please double-check.",
    };
  }

  return { ok: true };
}

/**
 * HMRC mod-97 / mod-97-55 checksum. A number passes if either variant
 * matches — older issued numbers use the legacy mod-97 method, newer
 * ones use mod-97-55.
 */
function ukVatChecksumOk(digits9: string): boolean {
  if (!/^\d{9}$/.test(digits9)) return false;
  const d = digits9.split("").map((c) => parseInt(c, 10));
  const weights = [8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += d[i] * weights[i];
  const check = d[7] * 10 + d[8];
  return (sum + check) % 97 === 0 || (sum + 55 + check) % 97 === 0;
}
