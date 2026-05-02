"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MailX, AlertCircle } from "lucide-react";

interface Props {
  requestId: string;
}

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "error"; message: string };

export function ResendButton({ requestId }: Props) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });

  async function onClick() {
    if (
      !window.confirm(
        "Send another reminder to this customer? This will charge 1 credit.",
      )
    ) {
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch(
        `/api/installer/pre-survey-requests/${requestId}/resend`,
        { method: "POST" },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({ kind: "error", message: j.error ?? "Resend failed" });
        return;
      }
      setState({ kind: "idle" });
      router.refresh();
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      {state.kind === "error" && (
        <span
          className="inline-flex items-center gap-1 text-[11px] text-red-700"
          title={state.message}
        >
          <AlertCircle className="w-3 h-3" />
          {state.message.length > 40
            ? state.message.slice(0, 40) + "…"
            : state.message}
        </span>
      )}
      <button
        type="button"
        onClick={onClick}
        disabled={state.kind === "sending"}
        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white border border-coral hover:bg-coral-pale text-coral-dark font-semibold text-[11px] transition-colors disabled:opacity-60 disabled:cursor-wait"
      >
        {state.kind === "sending" ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <MailX className="w-3 h-3" />
        )}
        Resend (1 credit)
      </button>
    </span>
  );
}
