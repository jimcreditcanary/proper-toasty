"use client";

// Modal picker for binding a user to an installer.
//
// Lives next to row-actions.tsx; opens as a portaled overlay when
// the admin picks "Bind to installer" on a user row. Debounced
// search against /api/admin/installers/search, click a result to
// commit the binding via /api/admin/users/[id]/installer-binding.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Loader2, Search, X } from "lucide-react";

export interface InstallerResult {
  id: number;
  company_name: string;
  email: string | null;
  postcode: string | null;
}

interface Props {
  /**
   * Describes what the picker is being used for — shown in the sub-head
   * so admins know what they're about to do. Defaults to "Pick an installer".
   */
  heading?: string;
  subheading?: React.ReactNode;
  /**
   * Called when the admin clicks a result. The parent decides what to
   * do with the pick — the row-action variant immediately persists via
   * the installer-binding API; the create-user variant just stashes
   * the selection for the next step.
   */
  onPick: (installer: InstallerResult) => void | Promise<void>;
  onClose: () => void;
  /** Shown next to each result ("Bind →" vs "Select →"). */
  pickLabel?: string;
}

export function InstallerPicker({
  heading = "Pick an installer",
  subheading,
  onPick,
  onClose,
  pickLabel = "Select →",
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<InstallerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search. Cancels in-flight when the query changes so the
  // last response always wins. 250ms balances feel vs. request fan-out.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/installers/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const j = await res.json();
        setResults(j.results ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn(e);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => {
      controller.abort();
      clearTimeout(t);
    };
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function pick(installer: InstallerResult) {
    setCommitting(installer.id);
    try {
      await onPick(installer);
    } finally {
      setCommitting(null);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-coral" />
            <h2 className="text-base font-semibold text-navy">{heading}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-100">
          {subheading && (
            <p className="text-xs text-slate-600 mb-2">{subheading}</p>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by company name…"
              className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
            )}
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.trim().length < 2 ? (
            <p className="p-6 text-center text-xs text-slate-400">
              Type at least 2 characters to search.
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="p-6 text-center text-xs text-slate-400">
              No installers match.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => void pick(r)}
                    disabled={committing != null}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy truncate">
                        {r.company_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {r.postcode ?? "—"} · {r.email ?? "no email"}
                      </p>
                    </div>
                    {committing === r.id ? (
                      <Loader2 className="w-4 h-4 text-coral animate-spin shrink-0" />
                    ) : (
                      <span className="text-[11px] font-semibold text-coral shrink-0">
                        {pickLabel}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
