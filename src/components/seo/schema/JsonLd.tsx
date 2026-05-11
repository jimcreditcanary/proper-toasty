// JSON-LD primitive — emits a <script type="application/ld+json"> tag
// with a JSON-stringified payload.
//
// Every concrete schema component in this directory composes this
// primitive; one place to handle:
//
//   - sanitising the payload (removing undefined / null / empty arrays
//     so the rendered JSON doesn't carry dead fields that LLMs and
//     Google would have to ignore)
//   - escaping `</script>` sequences in any string value (otherwise a
//     hostile or naive string in a description field could close the
//     script tag — XSS surface, even if remote)
//
// Server-component by default; no client JS needed. Drops anywhere
// in the document (Google reads JSON-LD wherever it sits).

import * as React from "react";

/**
 * Recursively strip undefined values, null values, and empty arrays /
 * empty objects from a JSON-LD payload. Schema.org consumers (Google,
 * the AI engines) interpret a missing field correctly; a field with
 * value `null` is ambiguous and a few validators flag it.
 *
 * Numbers (including 0) are preserved; "" empty strings are removed
 * because every schema field we use treats "" as no-data.
 */
function clean(input: unknown): unknown {
  if (Array.isArray(input)) {
    const cleaned = input
      .map((v) => clean(v))
      .filter((v) => v !== undefined);
    return cleaned.length > 0 ? cleaned : undefined;
  }
  if (input !== null && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const c = clean(v);
      if (c !== undefined) out[k] = c;
    }
    return Object.keys(out).length > 0 ? out : undefined;
  }
  if (input === null || input === undefined) return undefined;
  if (typeof input === "string" && input.trim() === "") return undefined;
  return input;
}

/**
 * Escape `</script>` in any string value so a curated description that
 * happens to contain that token can't terminate the script tag early.
 * Cheap belt + braces; the actual JSON encoding already protects
 * against most injection, but the closing-tag pattern slips through
 * because `<` and `>` are valid JSON characters.
 */
function safeStringify(data: unknown): string {
  return JSON.stringify(data).replace(/<\/script/gi, "<\\/script");
}

interface JsonLdProps {
  /** The JSON-LD payload — any nested object with the
   *  schema.org @context and @type fields at the root. */
  data: Record<string, unknown> | Array<Record<string, unknown>>;
}

export function JsonLd({ data }: JsonLdProps): React.ReactElement | null {
  const cleaned = clean(data);
  if (!cleaned) return null;
  return (
    <script
      type="application/ld+json"
      // dangerouslySetInnerHTML is the standard pattern for JSON-LD
      // in React — React's normal child-rendering would HTML-escape
      // the angle brackets in JSON keys (e.g. "@context") and break
      // parsing. The safeStringify call above neutralises the only
      // realistic XSS vector.
      dangerouslySetInnerHTML={{ __html: safeStringify(cleaned) }}
    />
  );
}
