// ComparisonTable — semantic <table> for any compare-this-vs-that
// page (heat pump vs gas, ASHP vs GSHP, brand A vs brand B).
//
// Why a real `<table>` matters: AI engines preserve table structure
// when extracting content. A piece of comparison data laid out as a
// proper `<table>` with `<th scope="col">` headers and a `<caption>`
// gets lifted as a coherent answer block. The same data in styled
// divs ("flex" cards) gets flattened into prose and the comparison
// breaks down.
//
// Caption is REQUIRED — it's both the visible context and the
// schema.org "name" that LLMs pair with the table when they cite it.

import * as React from "react";

export interface ComparisonTableProps {
  /** Visible caption. Required — describes what the table compares. */
  caption: string;
  /** Column headers (left to right). First column is typically the
   *  "row label" column (e.g. "Property type", "Year"). */
  headers: string[];
  /** Rows of cells. Each row must have length === headers.length.
   *  Cells can be plain strings or pre-formatted React nodes. */
  rows: Array<Array<string | React.ReactNode>>;
  /** Footnote shown beneath the table — e.g. data source +
   *  sample-size disclaimer. Plain text or markup. */
  footnote?: string | React.ReactNode;
}

export function ComparisonTable({
  caption,
  headers,
  rows,
  footnote,
}: ComparisonTableProps): React.ReactElement {
  if (process.env.NODE_ENV !== "production") {
    const bad = rows.find((r) => r.length !== headers.length);
    if (bad) {
      console.warn(
        `[AEO:ComparisonTable] row width (${bad.length}) doesn't match headers (${headers.length}); render will be jagged`,
      );
    }
  }

  return (
    <figure
      className="my-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-white"
      data-aeo="comparison-table"
    >
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-cream-deep">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-3 text-left font-semibold text-navy border-b border-[var(--border)]"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={ri % 2 === 1 ? "bg-cream-deep/30" : "bg-white"}
              >
                {row.map((cell, ci) => {
                  // First column gets <th scope="row"> so screen
                  // readers + structured-data crawlers understand
                  // it as the row label.
                  if (ci === 0) {
                    return (
                      <th
                        key={ci}
                        scope="row"
                        className="px-4 py-3 text-left font-medium text-navy border-b border-[var(--border)] align-top"
                      >
                        {cell}
                      </th>
                    );
                  }
                  return (
                    <td
                      key={ci}
                      className="px-4 py-3 text-slate-700 border-b border-[var(--border)] align-top"
                    >
                      {cell}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="px-4 py-3 bg-cream text-xs text-slate-500 border-t border-[var(--border)]">
        <span className="font-semibold">{caption}</span>
        {footnote && (
          <span className="ml-2 text-slate-400">— {footnote}</span>
        )}
      </figcaption>
    </figure>
  );
}
