"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  X,
} from "lucide-react";
import { resizeImage } from "@/lib/client/image-resize";
import { useCheckWizard } from "./context";
import { FloorplanEditor } from "./floorplan-editor";
import { applyAiPlacements } from "./floorplan-editor/utils";
import {
  emptyFloorplanAnalysis,
  type FloorplanAnalysis,
} from "@/lib/schemas/floorplan";
import type { FloorplanAnalyseResponse } from "@/app/api/floorplan/analyse/route";
import type { SuggestPlacementsResult } from "@/lib/services/claude-placements";

// Step 4 (v3 — user-annotation model):
//   1. Upload floorplan image → store object key
//   2. Background: hit /api/floorplan/analyse for the satellite outdoor
//      verdict (no Claude floorplan extraction in v3)
//   3. Render the FloorplanEditor with an empty analysis. The user draws
//      walls / doors / outdoor zones / stairs / radiators directly on top
//      of their uploaded image.
//   4. User presses "Find heat pump & cylinder" → POST to
//      /api/floorplan/suggest-placements → AI drops pins based on the
//      drawn annotations. User adjusts.
//   5. Continue → Step 5 sends the precomputed analysis to /api/analyse.

type UploadState =
  | { kind: "idle" }
  | { kind: "resizing"; previewUrl: string }
  | { kind: "uploading"; previewUrl: string; bytes: number }
  | { kind: "uploaded"; previewUrl: string; objectKey: string; bytes: number }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";

export function Step4Floorplan() {
  const { state, update, next, back } = useCheckWizard();

  const [upload, setUpload] = useState<UploadState>(() =>
    state.floorplanObjectKey
      ? { kind: "uploaded", previewUrl: "", objectKey: state.floorplanObjectKey, bytes: 0 }
      : { kind: "idle" },
  );
  const [satelliteRunning, setSatelliteRunning] = useState(false);
  const [placementsRunning, setPlacementsRunning] = useState(false);
  const [placementsError, setPlacementsError] = useState<string | null>(null);
  const [autorunRunning, setAutorunRunning] = useState(false);
  const [autorunError, setAutorunError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URLs on unmount.
  useEffect(() => {
    return () => {
      if (upload.kind === "resizing" || upload.kind === "uploading" || upload.kind === "uploaded") {
        if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Make sure we always have a non-null analysis blob to feed the editor.
  useEffect(() => {
    if (upload.kind === "uploaded" && !state.floorplanAnalysis) {
      update({ floorplanAnalysis: emptyFloorplanAnalysis() });
    }
  }, [upload, state.floorplanAnalysis, update]);

  // Run the satellite check once after upload (gives us the outdoor-space
  // verdict for the editor's optional confirmation banner).
  const runSatelliteCheck = useCallback(async () => {
    if (state.satelliteOutdoorVerdict != null) return; // already have it
    if (state.address?.latitude == null) return;
    setSatelliteRunning(true);
    try {
      const res = await fetch("/api/floorplan/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: state.address.latitude,
          lng: state.address.longitude,
        }),
      });
      if (!res.ok) throw new Error(`Satellite check failed (${res.status})`);
      const data = (await res.json()) as FloorplanAnalyseResponse;
      update({ satelliteOutdoorVerdict: data.satellite.verdict });
    } catch (err) {
      console.warn("Satellite check failed:", err);
    } finally {
      setSatelliteRunning(false);
    }
  }, [state.address, state.satelliteOutdoorVerdict, update]);

  useEffect(() => {
    if (upload.kind === "uploaded") void runSatelliteCheck();
  }, [upload.kind, runSatelliteCheck]);

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
          floorplanAnalysis: emptyFloorplanAnalysis(),
          floorplanDegraded: false,
          floorplanDegradedReason: null,
          satelliteOutdoorVerdict: null,
        });
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setUpload({
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [update],
  );

  // Cmd/Ctrl+V on the upload page — pull an image out of the clipboard
  // if one's there. Only active while on the upload / error state so
  // paste doesn't stomp on an already-loaded floorplan.
  useEffect(() => {
    if (upload.kind !== "idle" && upload.kind !== "error") return;
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void handleFile(file);
            return;
          }
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [upload.kind, handleFile]);

  const reset = useCallback(() => {
    if (upload.kind === "resizing" || upload.kind === "uploading" || upload.kind === "uploaded") {
      if (upload.previewUrl) URL.revokeObjectURL(upload.previewUrl);
    }
    setUpload({ kind: "idle" });
    setPlacementsError(null);
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

  // Fire the AI placement step when the user clicks the button in the editor.
  const handleRequestPlacements = useCallback(async () => {
    if (upload.kind !== "uploaded" || !state.floorplanAnalysis) return;
    setPlacementsRunning(true);
    setPlacementsError(null);
    try {
      const res = await fetch("/api/floorplan/suggest-placements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: upload.objectKey,
          satelliteVerdict: state.satelliteOutdoorVerdict,
          satelliteNotes: null,
          annotations: {
            walls: state.floorplanAnalysis.walls,
            doors: state.floorplanAnalysis.doors,
            outdoorZones: state.floorplanAnalysis.outdoorZones,
            userStairs: state.floorplanAnalysis.userStairs,
            radiators: state.floorplanAnalysis.radiators,
          },
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Placement failed (${res.status})`);
      }
      const result = (await res.json()) as SuggestPlacementsResult;
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Placement failed");
      }
      update({
        floorplanAnalysis: applyAiPlacements(state.floorplanAnalysis, result.data),
      });
    } catch (err) {
      setPlacementsError(err instanceof Error ? err.message : "Placement failed");
    } finally {
      setPlacementsRunning(false);
    }
  }, [upload, state.floorplanAnalysis, state.satelliteOutdoorVerdict, update]);

  // "Let AI do it for me" — single-pass detection + placement, no drawing.
  // Same response shape as suggest-placements so we apply it via the same
  // applyAiPlacements util, but we mark `aiAutorun=true` on the analysis
  // so the editor can show the "your installer will verify" disclaimer.
  // Also pulls EPC floor area through as a scaling anchor when available.
  const handleRequestAutorun = useCallback(async () => {
    if (upload.kind !== "uploaded" || !state.floorplanAnalysis) return;
    setAutorunRunning(true);
    setAutorunError(null);
    try {
      const epcArea =
        state.analysis?.epc?.found === true
          ? state.analysis.epc.certificate.totalFloorAreaM2 ?? null
          : null;
      const res = await fetch("/api/floorplan/autorun", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectKey: upload.objectKey,
          satelliteVerdict: state.satelliteOutdoorVerdict,
          satelliteNotes: null,
          totalFloorAreaM2: epcArea,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `Autorun failed (${res.status})`);
      }
      const result = (await res.json()) as SuggestPlacementsResult;
      if (!result.ok || !result.data) {
        throw new Error(result.error ?? "Autorun failed");
      }
      const merged = applyAiPlacements(state.floorplanAnalysis, result.data);
      update({ floorplanAnalysis: { ...merged, aiAutorun: true } });
    } catch (err) {
      setAutorunError(err instanceof Error ? err.message : "Autorun failed");
    } finally {
      setAutorunRunning(false);
    }
  }, [upload, state.floorplanAnalysis, state.satelliteOutdoorVerdict, state.analysis, update]);

  const imageUrl = state.floorplanObjectKey
    ? `/api/floorplan/image?key=${encodeURIComponent(state.floorplanObjectKey)}`
    : null;

  // Only let the user advance once they've uploaded AND completed the
  // annotation flow (ie. fired "Find heat pump & cylinder"). Pre-v4.4
  // this was just "upload complete" which meant people could skip the
  // whole floorplan step.
  const canContinue =
    upload.kind === "uploaded" && state.floorplanAnalysis?.placementsRequested === true;

  // The editor stages have their own conversational prompt + title, so we
  // only show the big page title BEFORE upload completes. After upload,
  // the editor drives the heading hierarchy and we keep the page chrome
  // tight so as much of the canvas / CTA is above the fold as possible.
  const showPageHeader = upload.kind !== "uploaded";

  return (
    <div className="max-w-5xl mx-auto w-full">
      {showPageHeader && (
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy">
            Upload &amp; annotate your floorplan
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Drop your floorplan, then trace the walls, doors, outdoor space, stairs and
            radiators. We&rsquo;ll suggest where the heat pump and hot water cylinder go.
          </p>
        </div>
      )}

      {/* Upload UI (shown before / on error) */}
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
            <p className="mt-1 text-xs text-slate-500">
              JPG or PNG, up to 10 MB · or paste from clipboard ({typeof navigator !== "undefined" && /Mac/i.test(navigator.platform) ? "⌘V" : "Ctrl+V"})
            </p>
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
        <div className="space-y-4">
          {state.floorplanAnalysis && (
            <FloorplanEditor
              analysis={state.floorplanAnalysis}
              onChange={handleEditorChange}
              imageUrl={imageUrl}
              outdoorAsk={
                state.satelliteOutdoorVerdict === "unsure" ||
                state.satelliteOutdoorVerdict === "no"
              }
              onRequestPlacements={handleRequestPlacements}
              placementsRunning={placementsRunning}
              placementsError={placementsError}
              onRequestAutorun={handleRequestAutorun}
              autorunRunning={autorunRunning}
              autorunError={autorunError}
              onComplete={next}
            />
          )}

          {/* Compact replace control — no thumbnail, no status text */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 bg-white text-sm text-slate-600 hover:bg-slate-50"
            >
              <X className="w-3.5 h-3.5" />
              Upload a different floorplan
            </button>
          </div>
          {satelliteRunning && (
            <p className="text-right text-xs text-slate-500">
              Checking satellite for outdoor space…
            </p>
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
        {/* Continue button is hidden until the editor has completed
            (placementsRequested=true after "Find heat pump & cylinder").
            The editor's "Looks good — continue" button in the adjust
            stage also calls onComplete={next}, so users normally advance
            from there — this is a backstop. */}
        {canContinue && (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-full bg-coral hover:bg-coral-dark text-cream font-semibold text-sm transition-colors shadow-sm"
          >
            Continue to your report
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

