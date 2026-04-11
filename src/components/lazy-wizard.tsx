"use client";

import dynamic from "next/dynamic";

const FreeCheckWizard = dynamic(
  () => import("@/components/free-check-wizard").then((m) => m.FreeCheckWizard),
  {
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 shadow-lg shadow-slate-200/50 animate-pulse">
        <div className="h-4 w-24 bg-slate-100 rounded mb-4" />
        <div className="h-1.5 w-full bg-slate-100 rounded-full mb-6" />
        <div className="h-6 w-3/4 bg-slate-100 rounded mb-2" />
        <div className="h-4 w-full bg-slate-100 rounded mb-6" />
        <div className="grid grid-cols-2 gap-4">
          <div className="h-24 bg-slate-50 rounded-lg border border-slate-100" />
          <div className="h-24 bg-slate-50 rounded-lg border border-slate-100" />
        </div>
      </div>
    ),
    ssr: false,
  }
);

export function LazyWizard() {
  return <FreeCheckWizard />;
}
