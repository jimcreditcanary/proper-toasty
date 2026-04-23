"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileImage,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { resizeImage } from "@/lib/client/image-resize";
import { useCheckWizard } from "./context";
import { FloorplanEditor } from "./floorplan-editor";
import type { FloorplanAnalysis } from "@/lib/schemas/floorplan";
import type { FloorplanAnalyseResponse } from "@/app/api/floorplan/analyse/route";

// Step 4 flow:
//   1. User drags / picks / pastes a floorplan image.
//   2. We upload to Supabase storage, get an objectKey.
//   3. We auto-fire /api/floorplan/analyse — Claude vision + satellite check
//      run in parallel; takes ~10–15s.
//   4. The editor renders inline. The user can place radiators, edit
//      dimensions, add extensions, and confirm outdoor space if the satellite
//      check was inconclusive.
//   5. Continue takes them to Step 5, which now skips the floorplan call.

type UploadState =
  | { kind: "idle" }
  | { kind: "resizing"; previewUrl: string }
  | { kind: "uploading"; previewUrl: string; bytes: number }
  | { kind: "uploaded"; previewUrl: string; objectKey: string; bytes: number }
  | { kind: "error"; message: string };

type AnalysisState =
  | { kind: "idle" }
  | { kind: "running" }
  | { kind: "done" }
  | { kind: "degraded"; reason: string }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";

export function Step4Floorplan() {
  const { state, update, next, back } = useCheckWizard();
  const [upload, setUpload] = useState<UploadState>(() =>
    state.floorplanObjectKey
      ? { kind: "uploaded", previewUrl: "", objectKey: state.floorplanObjectKey, bytes: 0 }
      : { kind: "idle" },
  );
  const [analysis, setAnalysis] = useState<AnalysisState>(() =>
    state.floorplanAnalysis
      ? { kind: "done" }
      : state.floorplanDegraded
        ? { kind: "degraded", reason: state.floorplanDegradedReason ?? "Couldn't read your floorplan." }
        : { kind: "idle" },
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs.
  useEffect(() => {
    return () => {
      if (upload.kind === "resizing" || upload.kind === "uploading" || upload.kind === "uploaded") {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const runAnalysis = useCallback(
    async (objectKey: string) => {
      setAnalysis({ kind: "running" });
      try {
        const res = await fetch("/api/floorplan/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectKey,
            // EPC context isn't on the client — Step 5 has access via the
            // analyse pipeline. For Step 4 we pass nulls and Claude works
            // off the image alone. (We could fetch EPC here too, but it
            // adds latency before the user sees anything.)
            epcContext: null,
            lat: state.address?.latitude ?? null,
            lng: state.address?.longitude ?? null,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `Analyse failed (${res.status})`);
        }
        const data = (await res.json()) as FloorplanAnalyseResponse;
        if (data.degraded || !data.analysis) {
          update({
            floorplanAnalysis: null,
            floorplanDegraded: true,
            floorplanDegradedReason: data.reason ?? "Couldn't read your floorplan.",
            satelliteOutdoorVerdict: data.satellite.verdict,
          });
          setAnalysis({
            kind: "degraded",
            reason: data.reason ?? "We couldn't read your floorplan reliably.",
          });
          return;
        }
        update({
          floorplanAnalysis: data.analysis,
          floorplanDegraded: false,
          floorplanDegradedReason: null,
          satelliteOutdoorVerdict: data.satellite.verdict,
        });
        setAnalysis({ kind: "done" });
      } catch (err) {
        setAnalysis({
          kind: "error",
          message: err instanceof Error ? err.message : "Analysis failed",
        });
      }
    },
    [update, state.address?.latitude, state.address?.longitude],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        if (file.type === "application/pdf") {
          setUpload({
            kind: "error",
            message:
              "PDF floorplans aren't supported yet — please save the first page as an image and try again.",
          });
          return;
        }
        setUpload({ kind: "error", message: "Please upload a JPG or PNG." });
        return;
      }
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        setUpload({ kind: "error", message: "Only JPG and PNG are supported right now." });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setUpload({ kind: "resizing", previewUrl });

      let resized: Blob;
      try {
        const r = await resizeImage(file);
        resized = r.blob;
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setUpload({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't read image",
        });
        return;
      }

      setUpload({ kind: "uploading", previewUrl, bytes: resized.size });

      try {
        const form = new FormData();
        form.append("file", new File([resized], "floorplan.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/floorplan/upload", { method: "POST", body: form });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? `Upload failed (${res.status})`);
        }
        const j = (await res.json()) as { objectKey: string; bytes: number };
        setUpload({ kind: "uploaded", previewUrl, objectKey: j.objectKey, bytes: j.bytes });
        update({
          floorplanObjectKey: j.objectKey,
          floorplanAnalysis: null,
          floorplanDegraded: false,
          floorplanDegradedReason: null,
          satelliteOutdoorVerdict: null,
        });
        // Auto-fire analysis as soon as the upload lands.
        void runAnalysis(j.objectKey);
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setUpload({
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [update, runAnalysis],
  );

  const reset = useCallback(() => {
    if (upload.kind === "resizing" || upload.kind === "uploading" || upload.kind === "uploaded") {
      if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
    }
    setUpload({ kind: "idle" });
    setAnalysis({ kind: "idle" });
    update({
      floorplanObjectKey: null,
      floorplanAnalysis: null,
      floorplanDegraded: false,
      floorplanDegradedReason: null,
      satelliteOutdoorVerdict: null,
    });
  }, [upload, update]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const handleEditorChange = useCallback(
    (next: FloorplanAnalysis) => {
      update({ floorplanAnalysis: next });
    },
    [update],
  );

  // The continue button enables once analysis is done OR degraded — we let
  // users press on past a failed analysis (Step 5 will run the eligibility
  // engine on whatever data we do have).
  const canContinue =
    upload.kind === "uploaded" &&
    (analysis.kind === "done" || analysis.kind === "degraded");

  return (
    <div className="max-w-5xl mx-auto w-full">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 4 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
          Upload your floorplan
        </h2>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          A JPG or PNG. We&rsquo;ll read the rooms, then ask you to mark up where the radiators are.
        </p>
      </div>

      {/* Upload UI */}
      {upload.kind === "idle" || upload.kind === "error" ? (
        <div className="max-w-2xl mx-auto">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
            }}
            className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-coral bg-coral-pale"
                : "border-slate-300 bg-white hover:border-slate-400"
            }`}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral-pale text-coral mb-4">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-navy">
              Drag your floorplan here, or <span className="text-coral">click to choose</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">JPG or PNG, up to 10 MB</p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={onInput}
            />
          </div>
          {upload.kind === "error" && (
            <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
              {upload.message}
            </p>
          )}
        </div>
      ) : (
        // Upload card + (loader OR editor OR degraded fallback)
        <div className="space-y-5">
          <UploadCard
            preview={upload.previewUrl}
            label={uploadLabel(upload, analysis)}
            onReplace={reset}
          />

          {analysis.kind === "running" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
              <Loader2 className="w-10 h-10 text-coral animate-spin mx-auto mb-4" />
              <p className="text-sm font-medium text-navy">
                Reading your floorplan and checking the satellite view…
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Usually 10–15 seconds.
              </p>
            </div>
          )}

          {analysis.kind === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
              <p className="font-semibold">Analysis failed</p>
              <p className="mt-1">{analysis.message}</p>
              <button
                type="button"
                onClick={() => upload.kind === "uploaded" && void runAnalysis(upload.objectKey)}
                className="mt-3 h-9 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
              >
                Try again
              </button>
            </div>
          )}

          {analysis.kind === "degraded" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              <p className="font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> We couldn&rsquo;t read your floorplan reliably
              </p>
              <p className="mt-1 text-amber-800">{analysis.reason}</p>
              <p className="mt-2 text-xs text-amber-700">
                You can carry on — your installer will assess everything on their site visit.
                Or replace the file with a higher-quality image and try again.
              </p>
            </div>
          )}

          {analysis.kind === "done" && state.floorplanAnalysis && (
            <FloorplanEditor
              analysis={state.floorplanAnalysis}
              onChange={handleEditorChange}
              outdoorAsk={state.satelliteOutdoorVerdict === "unsure" || state.satelliteOutdoorVerdict === "no"}
            />
          )}
        </div>
      )}

      <div className="mt-10 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-cream font-semibold text-sm transition-colors shadow-sm"
        >
          Continue
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function uploadLabel(upload: UploadState, analysis: AnalysisState): string {
  if (upload.kind === "resizing") return "Resizing…";
  if (upload.kind === "uploading") return `Uploading · ${(upload.bytes / 1024).toFixed(0)} KB`;
  if (analysis.kind === "running") return "Analysing…";
  if (analysis.kind === "done") return "Ready — mark up your radiators below";
  if (analysis.kind === "degraded") return "Uploaded — analysis incomplete";
  if (analysis.kind === "error") return "Uploaded — analysis failed";
  return "Uploaded";
}

function UploadCard({
  preview,
  label,
  onReplace,
}: {
  preview: string;
  label: string;
  onReplace: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Floorplan preview" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <FileImage className="w-8 h-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-navy">Floorplan</p>
          <p className="mt-1 text-xs text-slate-500 inline-flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            {label}
          </p>
          <button
            type="button"
            onClick={onReplace}
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
          >
            <X className="w-3 h-3" />
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
