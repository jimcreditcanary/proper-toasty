"use client";

// Client island for the API key panel — handles reveal toggle,
// copy-to-clipboard, generate-if-missing, and regenerate-with-
// confirmation. Server component above passes the initial key in;
// after a (re)generate we just keep the new key in local state so
// router.refresh() isn't needed.

import { useState } from "react";
import {
  Loader2,
  Copy,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
} from "lucide-react";

interface Props {
  initialKey: string | null;
}

type ActionState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

export function ApiKeyActions({ initialKey }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(initialKey);
  const [reveal, setReveal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [state, setState] = useState<ActionState>({ kind: "idle" });

  async function generate() {
    if (
      apiKey &&
      !window.confirm(
        "Regenerate the API key? Your old key will stop working immediately and any integration using it will start returning 401s.",
      )
    ) {
      return;
    }
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/v1/api-key", { method: "POST" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.api_key) {
        setState({
          kind: "error",
          message: j.error ?? `Failed (${res.status})`,
        });
        return;
      }
      setApiKey(j.api_key);
      // Auto-reveal a freshly minted key so the user can copy it
      // without an extra click — they won't be able to see it again
      // unless they regenerate.
      setReveal(true);
      setState({ kind: "idle" });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  async function copyToClipboard() {
    if (!apiKey) return;
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      // Don't keep the "Copied" affordance up forever — short flash
      // then back to normal so repeat copies feel responsive.
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback noop — clipboard.writeText only fails when the page
      // isn't focused or the browser blocked it; either way the
      // user can still triple-click the key text.
    }
  }

  // Empty-state — no key minted yet.
  if (!apiKey) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-5 text-center">
        <p className="text-sm text-slate-700 mb-3">
          You don&rsquo;t have an API key yet.
        </p>
        <button
          type="button"
          onClick={generate}
          disabled={state.kind === "loading"}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-wait"
        >
          {state.kind === "loading" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          Generate my API key
        </button>
        {state.kind === "error" && (
          <p className="text-xs text-red-700 mt-3">{state.message}</p>
        )}
      </div>
    );
  }

  const display = reveal ? apiKey : maskKey(apiKey);

  return (
    <div className="space-y-3">
      <div className="flex items-stretch gap-2 flex-wrap">
        <code className="flex-1 min-w-[260px] font-mono text-sm text-navy bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 break-all flex items-center">
          {display}
        </code>
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          aria-label={reveal ? "Hide key" : "Reveal key"}
          className="inline-flex items-center justify-center h-11 w-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
        >
          {reveal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center gap-1.5 h-11 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy
            </>
          )}
        </button>
      </div>
      <button
        type="button"
        onClick={generate}
        disabled={state.kind === "loading"}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {state.kind === "loading" ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <RefreshCw className="w-3.5 h-3.5" />
        )}
        Regenerate
      </button>
      {state.kind === "error" && (
        <p className="text-xs text-red-700">{state.message}</p>
      )}
    </div>
  );
}

function maskKey(key: string): string {
  // Show the prefix (so the user can see the format) + the last 4
  // chars (so they can verify the same key visually) — everything
  // else as bullets.
  if (key.length < 12) return "•".repeat(key.length);
  const prefix = key.slice(0, 4); // "wap_"
  const tail = key.slice(-4);
  return `${prefix}${"•".repeat(20)}${tail}`;
}
