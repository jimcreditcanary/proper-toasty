/**
 * Normalise a UK Companies House company number for API lookup.
 *
 * UK company numbers are 8 characters. Pure numeric numbers (England
 * & Wales — the bulk of the register) are zero-padded to 8 digits.
 * Prefixed numbers (SC* Scotland, NI* Northern Ireland, OC* LLPs,
 * SO* Scottish LLPs, NC* NI LLPs etc.) are uppercased and padded
 * such that prefix + digits totals 8 characters.
 *
 * Examples:
 *   "1489529"   → "01489529"   (E&W, missing leading zero)
 *   "01489529"  → "01489529"   (E&W, already correct)
 *   " sc12345 " → "SC012345"   (Scotland, pad after the prefix)
 *   "OC123456"  → "OC123456"   (LLP, already correct)
 *   ""          → ""           (caller treats as skip)
 *
 * Lives in its own module (rather than inside
 * scripts/outreach/enrich-installer-names.ts) so that test files can
 * import it without also pulling in the script's top-level
 * `main().catch(process.exit)` — which Vitest treats as an unhandled
 * error in CI. PR #81 added the function inline + a test importing
 * from the script; CI tripped on the side-effect and aborted with
 * exit 1 even though all 10 test cases were passing. Hoisting the
 * helper into the lib tree decouples the pure function from the
 * script orchestration.
 */
export function normaliseCompanyNumber(raw: string): string {
  const stripped = raw.trim().toUpperCase().replace(/\s+/g, "");
  if (!stripped) return "";
  // Pure digits → left-pad with zeros to 8.
  if (/^\d+$/.test(stripped)) {
    return stripped.padStart(8, "0");
  }
  // Prefix + digits → pad just the numeric portion to fill 8.
  const m = /^([A-Z]+)(\d+)$/.exec(stripped);
  if (m) {
    const [, prefix, digits] = m;
    const padTo = Math.max(0, 8 - prefix.length);
    return prefix + digits.padStart(padTo, "0");
  }
  // Anything else (mixed garbage) — pass through; CH will 404 and
  // we'll skip cleanly.
  return stripped;
}
