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
  CheckCircle2,
  Loader2,
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
      /** 0 = first attempt; 1 = silent retry after a transient
       *  failure (504/5xx/network). Drives the "Taking a bit longer
       *  than usual…" copy so the user knows we're still working. */
      attempt: number;
    }
  | { kind: "error"; message: string; transient: boolean };

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

// Status codes worth retrying. Skip the rest (e.g. 400 bad image)
// because re-sending the same payload won't help.
const RETRYABLE_STATUSES = new Set([502, 503, 504]);
const MAX_ATTEMPTS = 2;

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
        setUi({
          kind: "error",
          message: "Only JPG or PNG images are supported.",
          transient: false,
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        setUi({
          kind: "error",
          message: "File too large (10 MB max).",
          transient: false,
        });
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
          transient: false,
        });
        return;
      }

      const formData = new FormData();
      formData.append(
        "file",
        new File([resized.blob], "floorplan.jpg", { type: "image/jpeg" }),
      );

      // Attempt loop — silent retry on 502/503/504 + network errors.
      // The Sonnet vision call occasionally times out under load (60s
      // Vercel function limit). One retry recovers most of the time.
      // The user just sees the progress bar keep going with a friendly
      // "Taking a bit longer than usual…" hint on the second pass.
      let res: Response | null = null;
      let lastTransientReason: string | null = null;
      let attempt = 0;
      let id: string | null = null;
      while (attempt < MAX_ATTEMPTS) {
        setUi({
          kind: "uploading",
          previewUrl,
          bytes: resized.blob.size,
          elapsedSec: 0,
          attempt,
        });

        try {
          res = await fetch("/api/upload/floorplan", {
            method: "POST",
            body: formData,
          });
        } catch (e) {
          // Network-layer failure (no response at all). Retryable.
          lastTransientReason = e instanceof Error ? e.message : "Network error";
          res = null;
          attempt += 1;
          continue;
        }

        // Gateway / timeout class — same image might succeed if the
        // upstream load eases. Retry without surfacing the failure.
        if (RETRYABLE_STATUSES.has(res.status)) {
          lastTransientReason = `Upstream busy (${res.status})`;
          attempt += 1;
          continue;
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
              : "Something went wrong reading the image. Try another one or skip ahead.";
          setUi({ kind: "error", message: err, transient: false });
          return;
        }

        const ok = body as { ok?: boolean; id?: string; error?: string };
        if (!ok.ok || !ok.id) {
          URL.revokeObjectURL(previewUrl);
          setUi({
            kind: "error",
            message:
              ok.error ??
              "Something went wrong reading the image. Try another one or skip ahead.",
            transient: false,
          });
          return;
        }

        id = ok.id;
        break;
      }

      // Both attempts exhausted on transient failure. Surface a
      // friendly error with the "skip ahead" option so the user
      // isn't stuck — they can still finish the wizard, just
      // without the AI floorplan extract.
      if (!id) {
        URL.revokeObjectURL(previewUrl);
        setUi({
          kind: "error",
          message:
            lastTransientReason && /502|503|504/.test(lastTransientReason)
              ? "Our AI is busier than usual right now. Try again in a moment, or skip ahead — we'll still produce a report from your EPC + roof + answers."
              : "We couldn't reach our analysis service. Check your connection and try again, or skip ahead.",
          transient: true,
        });
        return;
      }
      const okId = id;

      // Re-fetch the validated extract from the server so we're using
      // the post-validate shape (defensive against schema drift). One
      // small extra call but it keeps the wizard's state strictly
      // typed against FloorplanExtractSchema.
      let extract: FloorplanExtract | null = null;
      try {
        const r = await fetch(`/api/upload/floorplan/${okId}`);
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
            "We read the image but couldn't turn it into useful data. Try another image, or skip ahead — we'll produce a report from your EPC + roof + answers.",
          transient: true,
        });
        return;
      }

      // Stash in wizard state + advance. Auto-advance keeps the user
      // moving through the wizard rather than parking them on a
      // success screen they have to click out of.
      update({
        floorplanExtract: extract,
        floorplanUploadId: okId,
      });
      URL.revokeObjectURL(previewUrl);
      next();
    },
    [update, next],
  );

  // "Skip ahead" — bypass the floorplan step entirely. We don't
  // populate floorplanExtract; the analyse pipeline already handles
  // a missing extract (the report renders from EPC + solar + wizard
  // answers, just without the AI floorplan-specific insights). Only
  // shown on the error screen so users don't take the easy path by
  // default — the floorplan adds genuine value when it works.
  const skipAhead = useCallback(() => {
    update({
      floorplanExtract: null,
      floorplanUploadId: null,
    });
    next();
  }, [update, next]);

  function reset() {
    if (ui.kind === "resizing" || ui.kind === "uploading") {
      URL.revokeObjectURL(ui.previewUrl);
    }
    setUi({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  // ─── UPLOADING — stepper + elapsed time ──────────────────────────
  //
  // No percentage. Step-based progress + honest elapsed-time counter
  // means we never have to "lie up" to 98% and then stall there.
  // When the back-end takes longer than expected, the last step just
  // keeps spinning — that reads as "still working on this step",
  // which is true.
  if (ui.kind === "uploading") {
    const substepIdx = Math.min(
      SUBSTEPS.length - 1,
      Math.floor((ui.elapsedSec / TARGET_SECONDS) * SUBSTEPS.length),
    );
    // Second attempt — let the user know we're still working rather
    // than leaving them wondering. The first attempt times out
    // silently behind the existing progress bar; once we're on retry
    // we tell them why it's taking longer.
    const retryHint =
      ui.attempt > 0
        ? "Taking a bit longer than usual — having another go."
        : null;
    return (
      <div className="max-w-2xl mx-auto">
        <ProgressView
          previewUrl={ui.previewUrl}
          substepIdx={substepIdx}
          elapsedSec={ui.elapsedSec}
          retryHint={retryHint}
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

  // ─── ERROR — surface + retry + (skip on transient) ──────────────
  if (ui.kind === "error") {
    // Transient errors (server busy / timeout / network) get a
    // softer styling (amber, not rose) + a "Skip ahead" option so
    // the user isn't stuck behind a single flaky call. Hard
    // validation errors (wrong file type, image unreadable) keep
    // the rose styling and only offer "Try another image" — the
    // skip path isn't useful when the problem is the image itself.
    const isTransient = ui.transient;
    const accent = isTransient
      ? {
          border: "border-amber-200",
          bg: "bg-amber-50",
          icon: "text-amber-700",
          title: "text-amber-900",
          body: "text-amber-800",
          heading: "Hit a small snag",
        }
      : {
          border: "border-rose-200",
          bg: "bg-rose-50",
          icon: "text-rose-700",
          title: "text-rose-900",
          body: "text-rose-800",
          heading: "We couldn’t read this floorplan",
        };
    return (
      <div className="max-w-2xl mx-auto">
        <section
          className={`rounded-3xl border ${accent.border} ${accent.bg} p-8`}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={`w-5 h-5 ${accent.icon} mt-0.5 shrink-0`}
            />
            <div className="flex-1">
              <h2 className={`text-base font-bold ${accent.title}`}>
                {accent.heading}
              </h2>
              <p className={`mt-1 text-sm ${accent.body} leading-relaxed`}>
                {ui.message}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Try again
                </button>
                {isTransient && (
                  <button
                    type="button"
                    onClick={skipAhead}
                    className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-300 hover:bg-slate-50 text-navy font-medium text-sm transition-colors"
                  >
                    Skip ahead
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
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
  substepIdx,
  elapsedSec,
  retryHint,
}: {
  previewUrl: string;
  /** Index of the currently-active substep (0..SUBSTEPS.length-1).
   *  Steps before this index render with a tick; this one spins;
   *  later ones are faded. When the back-end overruns TARGET_SECONDS
   *  the index caps at the last item — the spinner keeps spinning,
   *  which honestly reads as "still on this step". */
  substepIdx: number;
  /** Wall-clock seconds since the upload started. Rendered as an
   *  honest counter ("Analysing for 23s") — no percentage, no fake
   *  ETA. The previous progress bar plateaued at 98% because Claude
   *  Opus 4.7 vision regularly overruns the 25s linear-fill window,
   *  which read to users as "stuck / broken". The stepper + elapsed
   *  pair reframes the wait as "work happening" without making a
   *  numerical promise we can't keep. */
  elapsedSec: number;
  /** Non-null on the retry attempt — friendly hint that we're
   *  taking a second pass after a transient upstream failure. */
  retryHint: string | null;
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

      <div className="mt-6 max-w-sm mx-auto">
        <ol
          className="space-y-2"
          role="list"
          aria-label="Floorplan extraction progress"
        >
          {SUBSTEPS.map((label, i) => {
            const state =
              i < substepIdx ? "done" : i === substepIdx ? "active" : "pending";
            return <StepperRow key={label} label={label} state={state} />;
          })}
        </ol>

        <p
          className="mt-4 text-center text-[11px] text-slate-500 tabular-nums"
          aria-live="polite"
        >
          Analysing for {Math.round(elapsedSec)}s · usually 20–40s
        </p>

        {retryHint && (
          <p
            className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-center leading-relaxed"
            aria-live="polite"
          >
            {retryHint}
          </p>
        )}
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
        Don&rsquo;t close this tab — we&rsquo;ll take you to the report
        automatically.
      </p>
    </section>
  );
}

// One row of the stepper. Three states:
//   done    → green tick, copy at normal weight + colour
//   active  → coral spinner, copy bold
//   pending → grey hollow dot, copy faded
//
// All three use the same row geometry (28px icon column + label) so
// nothing reflows as the active step advances.
function StepperRow({
  label,
  state,
}: {
  label: string;
  state: "done" | "active" | "pending";
}) {
  return (
    <li className="grid grid-cols-[28px_1fr] items-center gap-2">
      <span className="flex items-center justify-center" aria-hidden="true">
        {state === "done" && (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        )}
        {state === "active" && (
          <Loader2 className="w-4 h-4 text-coral animate-spin" />
        )}
        {state === "pending" && (
          <span className="w-2 h-2 rounded-full bg-slate-300" />
        )}
      </span>
      <span
        className={
          state === "active"
            ? "text-sm font-semibold text-navy"
            : state === "done"
              ? "text-sm text-slate-700"
              : "text-sm text-slate-400"
        }
      >
        {label}
      </span>
    </li>
  );
}
