"use client";

// Step 4 (v2 upload-only flow) — replaces the legacy step-4-floorplan
// canvas builder.
//
// Flow:
//   1. Idle: dropzone + brief copy explaining what we'll extract
//   2. Resizing: client-side downscale via the existing util
//   3. Uploading: progress bar driven by elapsed time + cycling
//      substep labels (Sonnet vision lands in 15-25s)
//   4. Done: extract is in wizard state — auto-advance via next()
//   5. Error: surface the reason + retry
//
// The legacy step-4-floorplan stays in the codebase for now — see
// note in src/components/check-wizard/wizard-shell.tsx. This step
// uses the same `floorplan` step key so back/forward + persisted
// wizard state pick up where they left off.

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Upload,
} from "lucide-react";
import { resizeImage } from "@/lib/client/image-resize";
import { useCheckWizard } from "./context";
import {
  FloorplanExtractSchema,
  type FloorplanExtract,
} from "@/lib/schemas/floorplan-extract";

type State =
  | { kind: "idle" }
  | { kind: "resizing"; previewUrl: string }
  | {
      kind: "uploading";
      previewUrl: string;
      bytes: number;
      elapsedSec: number;
    }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

const SUBSTEPS = [
  "Reading rooms…",
  "Measuring floor areas…",
  "Inferring room types…",
  "Checking outdoor space…",
  "Estimating heat demand…",
  "Scoring heat-pump suitability…",
  "Drafting recommendations…",
] as const;

const TARGET_SECONDS = 25;
const TICK_MS = 200;

export function Step4Upload() {
  const { state, update, next, back } = useCheckWizard();

  const [ui, setUi] = useState<State>(() =>
    // Coming back to step 4 with an extract already in state — show
    // the success state with a Continue button rather than re-running
    // the upload.
    state.floorplanExtract ? { kind: "idle" } : { kind: "idle" },
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drive elapsed-time counter for the progress bar.
  useEffect(() => {
    if (ui.kind !== "uploading") return;
    const id = setInterval(() => {
      setUi((s) => {
        if (s.kind !== "uploading") return s;
        return { ...s, elapsedSec: s.elapsedSec + TICK_MS / 1000 };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [ui.kind]);

  // Cleanup preview object URLs.
  useEffect(() => {
    return () => {
      if (ui.kind === "resizing" || ui.kind === "uploading") {
        if (ui.previewUrl) URL.revokeObjectURL(ui.previewUrl);
      }
    };
  }, [ui]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPT.split(",").includes(file.type)) {
        setUi({ kind: "error", message: "Only JPG or PNG images are supported." });
        return;
      }
      if (file.size > MAX_BYTES) {
        setUi({ kind: "error", message: "File too large (10 MB max)." });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setUi({ kind: "resizing", previewUrl });

      let resized: { blob: Blob };
      try {
        resized = await resizeImage(file);
      } catch {
        URL.revokeObjectURL(previewUrl);
        setUi({
          kind: "error",
          message:
            "Couldn't read the image. Try saving it again from your floorplan source.",
        });
        return;
      }

      setUi({
        kind: "uploading",
        previewUrl,
        bytes: resized.blob.size,
        elapsedSec: 0,
      });

      const formData = new FormData();
      formData.append(
        "file",
        new File([resized.blob], "floorplan.jpg", { type: "image/jpeg" }),
      );

      let res: Response;
      try {
        res = await fetch("/api/upload/floorplan", {
          method: "POST",
          body: formData,
        });
      } catch (e) {
        URL.revokeObjectURL(previewUrl);
        setUi({
          kind: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
        return;
      }

      const rawText = await res.text();
      let body: unknown = null;
      try {
        body = JSON.parse(rawText);
      } catch {
        body = null;
      }

      if (!res.ok || !body || typeof body !== "object") {
        URL.revokeObjectURL(previewUrl);
        const err =
          body &&
          typeof body === "object" &&
          "error" in body &&
          typeof (body as { error?: unknown }).error === "string"
            ? (body as { error: string }).error
            : `Upload failed (${res.status})`;
        setUi({ kind: "error", message: err });
        return;
      }

      const ok = body as { ok?: boolean; id?: string; error?: string };
      if (!ok.ok || !ok.id) {
        URL.revokeObjectURL(previewUrl);
        setUi({
          kind: "error",
          message: ok.error ?? `Upload failed (${res.status})`,
        });
        return;
      }

      // Re-fetch the validated extract from the server so we're using
      // the post-validate shape (defensive against schema drift). One
      // small extra call but it keeps the wizard's state strictly
      // typed against FloorplanExtractSchema.
      let extract: FloorplanExtract | null = null;
      try {
        const r = await fetch(`/api/upload/floorplan/${ok.id}`);
        if (r.ok) {
          const j = (await r.json()) as { extract?: unknown };
          const parsed = FloorplanExtractSchema.safeParse(j.extract);
          if (parsed.success) extract = parsed.data;
        }
      } catch {
        // fall through
      }

      if (!extract) {
        URL.revokeObjectURL(previewUrl);
        setUi({
          kind: "error",
          message:
            "Extraction completed but the data shape was unexpected. Try another image, or contact hello@propertoasty.com.",
        });
        return;
      }

      // Stash in wizard state + advance. Auto-advance keeps the user
      // moving through the wizard rather than parking them on a
      // success screen they have to click out of.
      update({
        floorplanExtract: extract,
        floorplanUploadId: ok.id,
      });
      URL.revokeObjectURL(previewUrl);
      next();
    },
    [update, next],
  );

  function reset() {
    if (ui.kind === "resizing" || ui.kind === "uploading") {
      URL.revokeObjectURL(ui.previewUrl);
    }
    setUi({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  // ─── UPLOADING — progress bar ────────────────────────────────────
  if (ui.kind === "uploading") {
    const linearFrac = Math.min(1, ui.elapsedSec / TARGET_SECONDS);
    const fastFill = linearFrac * 0.9;
    const overrunFrac =
      ui.elapsedSec > TARGET_SECONDS
        ? Math.min(0.08, (ui.elapsedSec - TARGET_SECONDS) / 60)
        : 0;
    const fillPct = Math.round((fastFill + overrunFrac) * 100);
    const substepIdx = Math.min(
      SUBSTEPS.length - 1,
      Math.floor((ui.elapsedSec / TARGET_SECONDS) * SUBSTEPS.length),
    );
    return (
      <div className="max-w-2xl mx-auto">
        <ProgressView
          previewUrl={ui.previewUrl}
          fillPct={fillPct}
          substep={SUBSTEPS[substepIdx]}
        />
      </div>
    );
  }

  // ─── RESIZING — quick spinner ────────────────────────────────────
  if (ui.kind === "resizing") {
    return (
      <div className="max-w-2xl mx-auto">
        <section className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <Sparkles className="w-6 h-6 mx-auto text-coral animate-pulse" />
          <p className="mt-3 text-sm text-[var(--muted-brand)]">
            Preparing your image…
          </p>
        </section>
      </div>
    );
  }

  // ─── ERROR — surface + retry ─────────────────────────────────────
  if (ui.kind === "error") {
    return (
      <div className="max-w-2xl mx-auto">
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-700 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h2 className="text-base font-bold text-rose-900">
                We couldn&rsquo;t read this floorplan
              </h2>
              <p className="mt-1 text-sm text-rose-800 leading-relaxed">
                {ui.message}
              </p>
              <button
                type="button"
                onClick={reset}
                className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                Try another image
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ─── IDLE — dropzone ─────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      <header className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 4 of 6
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-navy leading-tight">
          Upload your floorplan
        </h1>
        <p className="mt-3 text-sm text-[var(--muted-brand)] leading-relaxed max-w-md mx-auto">
          We&rsquo;ll read every room, estimate heat-pump suitability, and
          combine it with the EPC + solar data we&rsquo;ve already pulled.
        </p>
      </header>

      <section
        className={`relative rounded-3xl border-2 border-dashed bg-white p-8 sm:p-10 text-center transition-colors ${
          dragOver
            ? "border-coral bg-coral-pale/30"
            : "border-slate-300 hover:border-coral/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files?.[0];
          if (f) void handleFile(f);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-coral-pale text-coral mb-4">
          <Upload className="w-5 h-5" />
        </span>
        <h2 className="text-lg sm:text-xl font-bold text-navy">
          Drop your floorplan here
        </h2>
        <p className="mt-1 text-sm text-[var(--muted-brand)]">
          PNG or JPG, up to 10 MB
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
        >
          Choose a file
          <ArrowRight className="w-4 h-4" />
        </button>
      </section>

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium text-[var(--muted-brand)] hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        {/* Resume support — if the user dropped earlier, came back,
            and the extract is already in state, let them carry on. */}
        {state.floorplanExtract && (
          <button
            type="button"
            onClick={next}
            className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-colors"
          >
            Continue with previous upload
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function ProgressView({
  previewUrl,
  fillPct,
  substep,
}: {
  previewUrl: string;
  fillPct: number;
  substep: string;
}) {
  return (
    <section className="rounded-3xl border border-coral/30 bg-white p-8 shadow-sm">
      <div className="flex items-center justify-center mb-4">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-coral-pale text-coral-dark">
          <Sparkles className="w-4 h-4" />
        </span>
      </div>
      <h2 className="text-xl sm:text-2xl font-bold text-navy text-center leading-tight">
        Analysing your floorplan…
      </h2>

      <div className="mt-6 max-w-md mx-auto">
        <div
          role="progressbar"
          aria-valuenow={fillPct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Floorplan extraction progress"
          className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden"
        >
          <div
            className="h-full bg-coral rounded-full transition-[width] duration-200 ease-linear"
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span aria-live="polite">{substep}</span>
          <span className="tabular-nums">{fillPct}%</span>
        </div>
      </div>

      {previewUrl && (
        <div className="mt-6 mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Uploaded floorplan"
            className="w-full max-h-72 object-contain"
          />
        </div>
      )}
      <p className="mt-6 text-[11px] text-slate-400 text-center">
        Usually under 30 seconds. Don&rsquo;t close this tab.
      </p>
    </section>
  );
}
