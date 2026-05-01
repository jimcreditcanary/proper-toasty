"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Building2, Search, ShieldCheck } from "lucide-react";
import type {
  ClaimLookupHit,
  ClaimLookupResponse,
} from "@/lib/schemas/installer-claim";

// Client island — search box + result list. On result click, the
// user is sent to /installer-signup?id=<chosen> which re-renders the
// page in prefill mode.
//
// Submission is debounced via simple "press Enter" or click — no
// type-ahead network calls, since the lookup endpoint hits the DB
// and we don't want to fire one per keystroke.

export function ClaimSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<ClaimLookupHit[] | null>(null);
  const [byNumber, setByNumber] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function runLookup(query: string) {
    if (query.trim().length < 2) {
      setError("Type at least 2 characters");
      return;
    }
    setError(null);
    try {
      const res = await fetch("/api/installer-signup/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ q: query }),
      });
      const json = (await res.json()) as ClaimLookupResponse;
      if (!json.ok) {
        setError(json.error ?? "Lookup failed");
        setResults(null);
        return;
      }
      setResults(json.matches);
      setByNumber(json.byNumber);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lookup failed");
      setResults(null);
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(() => {
      void runLookup(q);
    });
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-3">
        <label
          htmlFor="installer-search"
          className="text-xs font-semibold uppercase tracking-wider text-slate-600"
        >
          Search
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="installer-search"
              type="text"
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Acme Heating Ltd or 12345678"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={pending || q.trim().length < 2}
            className="h-11 px-5 rounded-xl bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
          >
            {pending ? "…" : "Search"}
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </form>

      <div className="mt-5">
        {results && results.length > 0 && (
          <ul className="space-y-2">
            {results.map((hit) => (
              <li key={hit.id}>
                <Link
                  href={`/installer-signup?id=${hit.id}`}
                  className={`block rounded-xl border p-3 transition-colors ${
                    hit.alreadyClaimed
                      ? "border-amber-200 bg-amber-50/60 hover:bg-amber-50"
                      : "border-slate-200 bg-white hover:border-coral/40 hover:bg-coral-pale/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-lg border ${
                        hit.alreadyClaimed
                          ? "bg-amber-100/60 border-amber-200 text-amber-700"
                          : "bg-coral-pale/40 border-coral/30 text-coral"
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div className="flex-1 text-sm leading-relaxed">
                      <p className="font-semibold text-navy">
                        {hit.companyName}
                      </p>
                      {(hit.certificationBody || hit.postcode) && (
                        <p className="text-xs text-slate-600 mt-0.5">
                          {[hit.certificationBody, hit.postcode]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                      {hit.companyNumber && (
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          #{hit.companyNumber}
                        </p>
                      )}
                      {hit.alreadyClaimed && (
                        <p className="text-[11px] text-amber-800 mt-1 font-medium">
                          ⚠ Already claimed
                        </p>
                      )}
                      {!hit.alreadyClaimed && hit.emailHint && (
                        <p className="text-[11px] text-slate-500 mt-1">
                          Notifications go to {hit.emailHint}
                        </p>
                      )}
                    </div>
                    <ShieldCheck
                      className={`shrink-0 mt-1 w-4 h-4 ${
                        hit.alreadyClaimed ? "text-amber-500" : "text-coral"
                      }`}
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {results && results.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 text-center">
            <p className="font-semibold text-navy mb-1">
              No matches for &ldquo;{q}&rdquo;.
            </p>
            <p className="text-xs mb-3">
              {byNumber
                ? "We don't have an MCS-listed installer with that Companies House number."
                : "Try a different spelling — or your Companies House number for an exact match."}
            </p>
            <Link
              href="/installer-signup/request"
              className="inline-flex items-center justify-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-xs shadow-sm transition-colors"
            >
              Can&rsquo;t find your company? Request to be added →
            </Link>
          </div>
        )}

        {!results && (
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 text-xs text-slate-500 leading-relaxed">
            We match against the MCS-certified directory we scrape from{" "}
            <a
              href="https://mcscertified.com"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              mcscertified.com
            </a>
            . If yours isn&rsquo;t there yet,{" "}
            <Link
              href="/installer-signup/request"
              className="text-coral hover:text-coral-dark font-medium underline"
            >
              request to be added
            </Link>
            {" "}— we&rsquo;ll review and get back to you within a working day.
          </div>
        )}
      </div>
    </>
  );
}
