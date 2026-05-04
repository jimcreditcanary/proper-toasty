// CSV serialiser for admin export endpoints.
//
// RFC 4180 escaping: any cell containing a comma, double-quote, CR
// or LF gets wrapped in double-quotes, with internal double-quotes
// doubled. Everything else passes through unwrapped, which keeps the
// output compact + diff-friendly when the data is well-behaved.
//
// We avoid streaming for now — admin exports are bounded to a few
// thousand rows by the page filters, so building the whole string
// in memory is fine. If a list ever grows past ~50k rows we'd switch
// to a ReadableStream that yields rows as they arrive from Postgres.

export function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function csvRow(cells: unknown[]): string {
  return cells.map(csvEscape).join(",");
}

/**
 * Build a complete CSV body from a header row + rows of cells.
 * Rows are CRLF-terminated as RFC 4180 specifies — Excel and Numbers
 * both accept LF too, but CRLF is the spec.
 */
export function buildCsv(header: string[], rows: unknown[][]): string {
  const lines = [csvRow(header), ...rows.map(csvRow)];
  return lines.join("\r\n") + "\r\n";
}

/**
 * Filename like "propertoasty-reports-2026-05-04.csv". Slug stays
 * lower-case + ascii so download dialogs don't choke.
 */
export function csvFilename(slug: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return `propertoasty-${slug}-${today}.csv`;
}

/**
 * Build the standard Response wrapper. Setting Content-Disposition
 * triggers a download in the browser; without it the CSV would just
 * render as text.
 */
export function csvResponse(body: string, filenameSlug: string): Response {
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename(filenameSlug)}"`,
      // No-cache: every export is a snapshot of "right now" and we
      // don't want a CDN serving stale data.
      "Cache-Control": "no-store",
    },
  });
}
