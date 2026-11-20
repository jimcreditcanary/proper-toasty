"use client";

// Client form for /installer/onboarding/confirm-business.
//
// Three radio choices for the CH match:
//   - confirm   → "Yes, that's us" (default when CH match exists)
//   - different → "Different company" → inline CH search + pick
//   - not_ltd   → "Not a limited company" → legal-structure select
//
// Below those, an always-visible trading-details block (address,
// phone, website) prefilled with current row values. Submit calls
// POST /api/installer/onboarding/confirm-business.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Loader2,
  Search,
} from "lucide-react";

interface InitialValues {
  company_number: string | null;
  ch_matched_name: string | null;
  ch_matched_address: string | null;
  legal_structure:
    | "limited_company"
    | "sole_trader"
    | "partnership"
    | "llp"
    | null;
  address_line_1: string | null;
  address_line_2: string | null;
  address_line_3: string | null;
  county: string | null;
  postcode: string | null;
  telephone: string | null;
  website: string | null;
  alreadyConfirmedAt: string | null;
}

interface Props {
  installerId: number;
  companyName: string;
  mcsNumber: string;
  initial: InitialValues;
}

type Choice = "confirm" | "different" | "not_ltd";

interface SearchItem {
  company_number: string;
  title: string;
  company_status?: string;
  address_snippet?: string;
}

export function ConfirmBusinessForm({
  companyName,
  mcsNumber,
  initial,
}: Props) {
  const router = useRouter();

  const hasMatch = initial.company_number != null;
  const [choice, setChoice] = useState<Choice>(hasMatch ? "confirm" : "different");

  // "Different company" flow — CH search + pick
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{
    company_number: string;
    ch_matched_name: string;
    ch_matched_address: string;
  } | null>(null);
  const [pickingId, setPickingId] = useState<string | null>(null);

  // "Not limited" flow — legal structure
  const [legalStructure, setLegalStructure] = useState<
    "sole_trader" | "partnership" | "llp"
  >(
    initial.legal_structure === "sole_trader" ||
      initial.legal_structure === "partnership" ||
      initial.legal_structure === "llp"
      ? initial.legal_structure
      : "sole_trader",
  );

  // Trading details — always editable
  const [trading, setTrading] = useState({
    address_line_1: initial.address_line_1 ?? "",
    address_line_2: initial.address_line_2 ?? "",
    address_line_3: initial.address_line_3 ?? "",
    county: initial.county ?? "",
    postcode: initial.postcode ?? "",
    telephone: initial.telephone ?? "",
    website: initial.website ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  // Debounced CH search as the user types.
  useEffect(() => {
    if (choice !== "different") return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return;
    }
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;
    searchDebounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `/api/installer/companies-house/search?q=${encodeURIComponent(q)}`,
          { signal: controller.signal },
        );
        if (!res.ok) {
          setResults([]);
          return;
        }
        const j = await res.json();
        setResults(j.items ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") console.warn(e);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      controller.abort();
    };
  }, [query, choice]);

  async function pickCompany(item: SearchItem) {
    setPickingId(item.company_number);
    try {
      const res = await fetch(
        `/api/installer/companies-house/${encodeURIComponent(item.company_number)}`,
      );
      if (!res.ok) {
        setError("Couldn't load that company — try another.");
        return;
      }
      const j = await res.json();
      setPicked({
        company_number: j.company_number ?? item.company_number,
        ch_matched_name: j.company_name ?? item.title,
        ch_matched_address:
          j.registered_office_formatted ?? item.address_snippet ?? "",
      });
      setError(null);
    } finally {
      setPickingId(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!trading.address_line_1.trim()) {
      setError("Address line 1 is required");
      return;
    }
    if (!trading.postcode.trim()) {
      setError("Postcode is required");
      return;
    }

    let body: Record<string, unknown>;
    if (choice === "confirm") {
      if (!hasMatch) {
        setError("No existing match to confirm — pick a different option.");
        return;
      }
      body = { action: "confirm_match", trading };
    } else if (choice === "different") {
      if (!picked) {
        setError("Pick the correct company from the search results.");
        return;
      }
      body = { action: "update_company", ...picked, trading };
    } else {
      body = {
        action: "declare_non_limited",
        legal_structure: legalStructure,
        trading,
      };
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/installer/onboarding/confirm-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Save failed");
        return;
      }
      router.push("/installer/onboarding?confirmed=business");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Current attached company */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-start gap-3 mb-3">
          <span className="shrink-0 inline-flex items-center justify-center w-10 h-10 rounded-xl bg-coral-pale text-coral-dark">
            <Building2 className="w-5 h-5" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Currently attached
            </p>
            <h2 className="text-base font-semibold text-navy leading-tight">
              {companyName}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              MCS certificate: {mcsNumber}
            </p>
          </div>
        </div>
        {hasMatch ? (
          <dl className="text-xs space-y-1.5 ml-13">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Companies House</dt>
              <dd className="text-navy font-medium text-right">
                {initial.ch_matched_name} ({initial.company_number})
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Registered office</dt>
              <dd className="text-navy text-right max-w-[60%]">
                {initial.ch_matched_address ?? "—"}
              </dd>
            </div>
          </dl>
        ) : (
          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            No Companies House match on file — tell us how you&rsquo;re set up.
          </div>
        )}
        {initial.alreadyConfirmedAt && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            You last confirmed these details on{" "}
            {new Date(initial.alreadyConfirmedAt).toLocaleDateString("en-GB")}.
          </div>
        )}
      </section>

      {/* Choice */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Is this your business?
        </p>
        <div className="space-y-2">
          {hasMatch && (
            <ChoiceRow
              active={choice === "confirm"}
              onClick={() => setChoice("confirm")}
              title="Yes, that's us"
              body="Keep the Companies House match as is."
            />
          )}
          <ChoiceRow
            active={choice === "different"}
            onClick={() => setChoice("different")}
            title="Different limited company"
            body="Search Companies House and pick the right entity."
          />
          <ChoiceRow
            active={choice === "not_ltd"}
            onClick={() => setChoice("not_ltd")}
            title="We're not a limited company"
            body="Sole trader, partnership or LLP."
          />
        </div>

        {choice === "different" && (
          <div className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company name or number…"
                className="w-full h-10 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 animate-spin" />
              )}
            </div>
            {picked ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                <p className="font-medium text-emerald-900">
                  Selected: {picked.ch_matched_name} ({picked.company_number})
                </p>
                <p className="text-emerald-800 mt-0.5">
                  {picked.ch_matched_address}
                </p>
                <button
                  type="button"
                  onClick={() => setPicked(null)}
                  className="mt-1 text-[11px] font-semibold text-emerald-900 hover:text-emerald-700 underline"
                >
                  Change
                </button>
              </div>
            ) : query.trim().length >= 2 && !searching && results.length === 0 ? (
              <p className="text-xs text-slate-500">
                No Companies House matches.
              </p>
            ) : results.length > 0 ? (
              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {results.map((r) => (
                  <li key={r.company_number}>
                    <button
                      type="button"
                      onClick={() => void pickCompany(r)}
                      disabled={pickingId != null}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy truncate">
                            {r.title}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {r.company_number}
                            {r.company_status
                              ? ` · ${r.company_status}`
                              : ""}
                            {r.address_snippet
                              ? ` · ${r.address_snippet}`
                              : ""}
                          </p>
                        </div>
                        {pickingId === r.company_number ? (
                          <Loader2 className="w-4 h-4 text-coral animate-spin shrink-0" />
                        ) : (
                          <span className="text-[11px] font-semibold text-coral shrink-0">
                            Select →
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}

        {choice === "not_ltd" && (
          <div className="mt-4 space-y-2">
            <label
              htmlFor="legal-structure"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
            >
              Legal structure
            </label>
            <select
              id="legal-structure"
              value={legalStructure}
              onChange={(e) =>
                setLegalStructure(
                  e.target.value as "sole_trader" | "partnership" | "llp",
                )
              }
              className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            >
              <option value="sole_trader">Sole trader</option>
              <option value="partnership">Partnership</option>
              <option value="llp">Limited Liability Partnership (LLP)</option>
            </select>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              We&rsquo;ll clear the Companies House details from your public
              listing.
            </p>
          </div>
        )}
      </section>

      {/* Trading details */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
          Trading address &amp; contact
        </p>
        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          This is what homeowners see on your public directory page. May be
          different from your registered office.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <TextField
            label="Address line 1"
            value={trading.address_line_1}
            onChange={(v) =>
              setTrading((t) => ({ ...t, address_line_1: v }))
            }
            required
            className="sm:col-span-2"
          />
          <TextField
            label="Address line 2"
            value={trading.address_line_2}
            onChange={(v) =>
              setTrading((t) => ({ ...t, address_line_2: v }))
            }
          />
          <TextField
            label="Address line 3"
            value={trading.address_line_3}
            onChange={(v) =>
              setTrading((t) => ({ ...t, address_line_3: v }))
            }
          />
          <TextField
            label="County"
            value={trading.county}
            onChange={(v) => setTrading((t) => ({ ...t, county: v }))}
          />
          <TextField
            label="Postcode"
            value={trading.postcode}
            onChange={(v) => setTrading((t) => ({ ...t, postcode: v }))}
            required
          />
          <TextField
            label="Telephone"
            value={trading.telephone}
            onChange={(v) => setTrading((t) => ({ ...t, telephone: v }))}
            placeholder="e.g. 0121 707 9991"
          />
          <TextField
            label="Website"
            value={trading.website}
            onChange={(v) => setTrading((t) => ({ ...t, website: v }))}
            placeholder="https://…"
          />
        </div>
      </section>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-coral hover:bg-coral-dark text-white text-sm font-semibold transition-colors disabled:opacity-60"
      >
        {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
        Save and continue
      </button>
    </form>
  );
}

function ChoiceRow({
  active,
  onClick,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border px-4 py-3 transition-colors ${
        active
          ? "border-coral/60 bg-coral-pale/40"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <p
        className={`text-sm font-semibold ${
          active ? "text-coral-dark" : "text-navy"
        }`}
      >
        {title}
      </p>
      <p className="text-xs text-slate-600 mt-0.5">{body}</p>
    </button>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  required,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
      />
    </label>
  );
}
