"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, AlertCircle, Wallet } from "lucide-react";

interface Props {
  balance: number;
  costPerSend: number;
}

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "error"; message: string };

export function PreSurveyForm({ balance, costPerSend }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [postcode, setPostcode] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  const insufficient = balance < costPerSend;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (insufficient) {
      setState({
        kind: "error",
        message: `You need at least ${costPerSend} credit. Top up from /installer/credits.`,
      });
      return;
    }
    if (!name.trim() || !email.trim()) {
      setState({ kind: "error", message: "Name + email needed." });
      return;
    }
    setState({ kind: "submitting" });
    try {
      const res = await fetch("/api/installer/pre-survey-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contact_name: name.trim(),
          contact_email: email.trim(),
          contact_postcode: postcode.trim() || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState({
          kind: "error",
          message: j.error ?? "Send failed — try again",
        });
        return;
      }
      // Reset + refresh the server tree so the new row appears in the
      // list below.
      setName("");
      setEmail("");
      setPostcode("");
      setState({ kind: "idle" });
      router.replace("/installer/pre-survey-requests?sent=1");
      router.refresh();
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Network error",
      });
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4"
    >
      <div className="flex items-start justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-base font-semibold text-navy">
            Send a customer their personalised check link
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter their details and they&rsquo;ll get an email from{" "}
            <span className="font-medium">your</span> company name with a
            5-minute check link. The completed report lands back in your
            leads inbox.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
            insufficient
              ? "bg-red-50 text-red-700 border border-red-200"
              : "bg-slate-50 text-slate-700 border border-slate-200"
          }`}
        >
          <Wallet className="w-3 h-3" />
          {balance} credit{balance === 1 ? "" : "s"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Customer name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sam Patel"
            maxLength={120}
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            required
          />
        </label>
        <label className="block">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
            Customer email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="sam@example.com"
            maxLength={254}
            className="w-full h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
            required
          />
        </label>
      </div>
      <label className="block">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
          Postcode <span className="text-slate-400 font-normal normal-case">(optional)</span>
        </span>
        <input
          type="text"
          value={postcode}
          onChange={(e) => setPostcode(e.target.value)}
          placeholder="SW1A 1AA"
          maxLength={10}
          className="w-full sm:w-48 h-11 px-3 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 uppercase focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
        <p className="text-[10px] text-slate-400 mt-1">
          We pre-fill the customer&rsquo;s wizard with their postcode so
          they spend less time hunting for their address.
        </p>
      </label>

      {state.kind === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-start gap-2 text-sm">
          <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
          <p className="text-red-900">{state.message}</p>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-2">
        <p className="text-xs text-slate-500">
          Cost: <strong className="text-navy">{costPerSend} credit</strong>{" "}
          per send. Resends after 72h cost another credit.
        </p>
        <button
          type="submit"
          disabled={state.kind === "submitting" || insufficient}
          className="inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {state.kind === "submitting" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send the check link
        </button>
      </div>
    </form>
  );
}
