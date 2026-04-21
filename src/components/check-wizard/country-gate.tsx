"use client";

import Link from "next/link";
import { ArrowLeft, Info } from "lucide-react";
import type { UkCountry } from "@/lib/postcode/region";
import { useCheckWizard } from "./context";

const COPY: Record<UkCountry, { title: string; body: string; scheme: string }> = {
  Scotland: {
    title: "We're adding Scotland soon",
    body: "Scotland has its own heat pump support via Home Energy Scotland loans and grants, not the Boiler Upgrade Scheme. We're working on a Scotland-specific check — we'll email you when it's live.",
    scheme: "Home Energy Scotland",
  },
  "Northern Ireland": {
    title: "We're adding Northern Ireland soon",
    body: "Northern Ireland has its own energy support schemes distinct from the Boiler Upgrade Scheme. We're adding NI coverage next — we'll email you when it's live.",
    scheme: "NI Department for the Economy",
  },
  England: { title: "", body: "", scheme: "" },
  Wales: { title: "", body: "", scheme: "" },
};

export function CountryGate({ country }: { country: UkCountry }) {
  const { goTo, reset } = useCheckWizard();
  const copy = COPY[country];

  return (
    <div className="max-w-lg mx-auto text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral-pale text-coral mb-6">
        <Info className="w-6 h-6" />
      </div>
      <h2 className="text-3xl font-bold tracking-tight text-navy">{copy.title}</h2>
      <p className="mt-4 text-slate-600 leading-relaxed">{copy.body}</p>

      <form
        className="mt-8 flex flex-col sm:flex-row gap-3 justify-center"
        onSubmit={(e) => {
          e.preventDefault();
          const email = new FormData(e.currentTarget).get("email") as string;
          // TODO: wire this to a lead-capture endpoint when we build it.
          alert(`Thanks — we'll email ${email} when ${country} support is live.`);
        }}
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="h-12 px-4 rounded-lg border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-coral focus:border-transparent flex-1 max-w-xs"
        />
        <button
          type="submit"
          className="h-12 px-6 rounded-lg bg-coral hover:bg-coral-dark text-white font-semibold text-sm transition-colors"
        >
          Notify me
        </button>
      </form>

      <div className="mt-10 flex items-center justify-center gap-4 text-sm">
        <button
          type="button"
          onClick={() => {
            reset();
            goTo("address");
          }}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Try a different address
        </button>
        <span className="text-slate-300">·</span>
        <Link href="/" className="text-slate-600 hover:text-slate-900">
          Back to home
        </Link>
      </div>
    </div>
  );
}
