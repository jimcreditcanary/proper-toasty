// /upload — v2 upload-only entry point.
//
// Server component shell — the dropzone + extraction status is a
// client component (UploadDropzone) so we keep the marketing-shell
// chrome here and only ship the interactive bits as JS.

import type { Metadata } from "next";
import { MarketingHeader } from "@/components/marketing-header";
import { UploadDropzone } from "./dropzone";

export const metadata: Metadata = {
  title: "Upload your floorplan — Propertoasty",
  description:
    "Upload a floorplan image. We'll extract every room, estimate heat-pump suitability, and produce a site-visit-ready report in under a minute.",
};

export default function UploadPage() {
  return (
    <div className="flex min-h-screen flex-col bg-cream text-navy">
      <MarketingHeader active="home" />
      <main className="mx-auto w-full max-w-3xl px-4 sm:px-6 py-12 sm:py-16 flex-1">
        <header className="text-center mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-3">
            One image, one minute, one report
          </p>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-navy leading-tight">
            Upload your floorplan
          </h1>
          <p className="mt-4 text-base sm:text-lg text-[var(--muted-brand)] max-w-xl mx-auto leading-relaxed">
            JPG or PNG, up to 10 MB. We&rsquo;ll read every room, estimate
            heat-pump suitability, and produce a report your installer can
            use to prep a site visit.
          </p>
        </header>

        <UploadDropzone />

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm text-[var(--muted-brand)]">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy mb-1">
              What we read
            </p>
            <p className="leading-relaxed">
              Rooms, floor areas, layout, outdoor space, orientation —
              everything that&rsquo;s printed or visible.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy mb-1">
              What we estimate
            </p>
            <p className="leading-relaxed">
              Peak heat demand, recommended HP capacity, indicative
              eligibility score, BUS grant context.
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-navy mb-1">
              What we don&rsquo;t do
            </p>
            <p className="leading-relaxed">
              Engineering design. The numbers are pre-survey indicative — an
              MCS heat-loss survey is the source of truth.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
