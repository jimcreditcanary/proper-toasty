"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import type { PlaceSuggestion } from "@/lib/schemas/places";
import type { UkCountry } from "@/lib/postcode/region";
import { isV1SupportedCountry } from "@/lib/postcode/region";
import { useCheckWizard } from "./context";

function randomSessionToken(): string {
  // 32-char hex. Not crypto-secret — just needs to be unique per autocomplete session.
  const a = new Uint8Array(16);
  if (typeof crypto !== "undefined") crypto.getRandomValues(a);
  else for (let i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function Step1Address() {
  const { update, next, goTo } = useCheckWizard();
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const sessionTokenRef = useRef<string>("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  if (!sessionTokenRef.current) sessionTokenRef.current = randomSessionToken();

  const fetchSuggestions = useCallback(async (value: string) => {
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/address/autocomplete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: value, sessionToken: sessionTokenRef.current }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { suggestions: PlaceSuggestion[] };
      setSuggestions(data.suggestions);
    } catch (e) {
      setError("Couldn't fetch suggestions. Try again in a moment.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(input), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [input, fetchSuggestions]);

  const pick = useCallback(
    async (s: PlaceSuggestion) => {
      setResolving(true);
      setError(null);
      try {
        const res = await fetch("/api/address/details", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId: s.placeId, sessionToken: sessionTokenRef.current }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as {
          details: import("@/lib/schemas/places").PlaceDetails;
          country: UkCountry | null;
        };
        // Rotate the session token once we've "closed" the session via a Details call.
        sessionTokenRef.current = randomSessionToken();
        update({ address: data.details, country: data.country });

        if (data.country && !isV1SupportedCountry(data.country)) {
          // Scotland / NI → country gate
          goTo("preview"); // will short-circuit inside preview step via wizard shell
          return;
        }
        next();
      } catch (e) {
        setError("Couldn't fetch that address. Please try a different one.");
      } finally {
        setResolving(false);
      }
    },
    [update, next, goTo]
  );

  const showDropdown = useMemo(
    () => input.trim().length >= 3 && (suggestions.length > 0 || loading),
    [input, suggestions.length, loading]
  );

  return (
    <div className="max-w-xl mx-auto w-full">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 1 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
          What&rsquo;s your address?
        </h2>
        <p className="mt-3 text-slate-600">
          We use this to look up your property&rsquo;s EPC, roof, and local data.
        </p>
      </div>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            inputMode="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Start typing your address..."
            className="w-full h-14 pl-12 pr-12 rounded-xl border border-slate-300 bg-white text-base text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent shadow-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={resolving}
          />
          {(loading || resolving) && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 animate-spin" />
          )}
        </div>

        {showDropdown && (
          <div className="absolute left-0 right-0 mt-2 rounded-xl bg-white border border-slate-200 shadow-lg overflow-hidden z-10">
            {loading && suggestions.length === 0 ? (
              <div className="p-4 text-sm text-slate-500">Searching…</div>
            ) : (
              <ul>
                {suggestions.map((s) => (
                  <li key={s.placeId}>
                    <button
                      type="button"
                      onClick={() => pick(s)}
                      disabled={resolving}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-coral-pale transition-colors"
                    >
                      <MapPin className="w-4 h-4 mt-1 shrink-0 text-coral" />
                      <span className="flex-1">
                        <span className="block text-sm font-medium text-navy">
                          {s.primaryText}
                        </span>
                        {s.secondaryText && (
                          <span className="block text-xs text-slate-500 mt-0.5">
                            {s.secondaryText}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <p className="mt-8 text-center text-xs text-slate-500">
        England &amp; Wales only for now. Scotland and Northern Ireland have separate schemes — we&rsquo;ll let you know when we add them.
      </p>
    </div>
  );
}
