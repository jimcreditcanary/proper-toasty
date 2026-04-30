// Masks an email address for use in the public installer claim search.
//
// Goal: give the user a hint that's enough to recognise their own
// company's email (so they don't sign up under the wrong installer)
// without exposing a clean email harvest target.
//
// Examples:
//   info@acmeheating.co.uk    → in**@a***heating.co.uk
//   bob@example.com           → b**@e***ple.com
//   a@b.com                   → a@b***.com
//
// Defensive: returns null for malformed input (no `@`).

export function maskEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const at = trimmed.indexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  return `${maskPart(local)}@${maskPart(domain, 1)}`;
}

// Keep the first `keep` characters, replace the next chunk with
// asterisks, keep the tail (e.g. ".co.uk"). For local parts we keep
// the first 2 chars; for domains we keep the first 1 then everything
// after the dot.
function maskPart(s: string, keep = 2): string {
  if (s.length <= keep) return s + "***";
  // For domains specifically — preserve the TLD.
  const dot = s.indexOf(".");
  if (dot > 0) {
    const head = s.slice(0, keep);
    const tld = s.slice(dot);
    return `${head}***${tld}`;
  }
  return `${s.slice(0, keep)}***`;
}
