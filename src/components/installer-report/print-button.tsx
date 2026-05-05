"use client";

// Tiny client island for the print buttons in InstallerSiteBrief.
// Keeps the rest of the brief as a server component so we don't
// pay client-JS for the dense static content.

import { Printer } from "lucide-react";
import type { ReactNode } from "react";

interface PrintButtonProps {
  variant?: "compact" | "full";
  children?: ReactNode;
}

export function PrintButton({ variant = "compact", children }: PrintButtonProps) {
  const cls =
    variant === "compact"
      ? "hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 hover:border-coral/40 hover:bg-coral-pale/30 text-xs font-semibold text-slate-700 transition-colors print:hidden"
      : "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white border border-slate-200 hover:border-coral/40 text-xs font-semibold text-slate-700 transition-colors";
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className={cls}
    >
      <Printer className="w-3.5 h-3.5" />
      {children ?? "Print"}
    </button>
  );
}
