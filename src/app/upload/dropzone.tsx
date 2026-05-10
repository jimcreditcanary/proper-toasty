"use client";

// UploadDropzone — the interactive bit of /upload.
//
// State machine:
//   idle      → user picks a file (drop or click)
//   resizing  → client-side downscale via existing resizeImage util
//   uploading → POST to /api/upload/floorplan, model call inline
//   error     → surface the error, offer a retry
//
// On success the API returns { id, status: 'complete' } and we
// router.push to /report/[id]. The substep messaging is cosmetic —
// the actual extraction is one Sonnet call, but a single
// "Analysing…" spinner reads as broken to users for ~30 seconds.

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { resizeImage } from "@/lib/client/image-resize";

type State =
  | { kind: "idle" }
  | { kind: "resizing"; previewUrl: string }
  | {
      kind: "uploading";
      previewUrl: string;
      bytes: number;
      /** Elapsed seconds since the upload started — drives the
       *  progress bar fill + the substep cursor. Updated by an
       *  interval tick. */
      elapsedSec: number;
    }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

// Substep labels — surfaced under the progress bar as supporting
// context. Cursor advances every TARGET_SECONDS / SUBSTEPS.length
// so by the time the bar reaches 90% we've cycled through every
// substep at least once.
const SUBSTEPS = [
  "Reading rooms…",
  "Measuring floor areas…",
  "Inferring room types…",
  "Checking outdoor space…",
  "Estimating heat demand…",
  "Scoring heat-pump suitability…",
  "Drafting recommendations…",
] as const;

/** Sonnet vision lands in 15-25s on a clean image. We model the
 *  bar as filling smoothly to 90% over TARGET_SECONDS, then crawling
 *  the last 10% slowly until the response arrives. Familiar pattern
 *  for waits with no real progress signal — feels accurate to most
 *  users without making them stare at a frozen spinner. */
const TARGET_SECONDS = 25;
const TICK_MS = 200;

export function UploadDropzone() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Drive the progress bar by counting elapsed seconds. Single
  // interval handles BOTH the bar fill + the substep cursor — keeps
  // the two visually in sync.
  useEffect(() => {
    if (state.kind !== "uploading") return;
    const id = setInterval(() => {
      setState((s) => {
        if (s.kind !== "uploading") return s;
        return { ...s, elapsedSec: s.elapsedSec + TICK_MS / 1000 };
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [state.kind]);

  // Cleanup object URLs when the state holding them goes away.
  useEffect(() => {
    return () => {
      if (state.kind === "resizing" || state.kind === "uploading") {
        if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      }
    };
  }, [state]);

  const handleFile = useCallback(
    async (file: File) => {
      if (!ACCEPT.split(",").includes(file.type)) {
        setState({
          kind: "error",
          message: "Only JPG or PNG images are supported.",
        });
        return;
      }
      if (file.size > MAX_BYTES) {
        setState({
          kind: "error",
          message: "File too large (10 MB max).",
        });
        return;
      }

      const previewUrl = URL.createObjectURL(file);
      setState({ kind: "resizing", previewUrl });

      // Resize client-side so we keep upload payload + model token
      // costs sane. The existing util re-encodes to JPEG which trims
      // most floorplan images by 60-80%.
      let resized: { blob: Blob };
      try {
        resized = await resizeImage(file);
      } catch {
        setState({
          kind: "error",
          message: "Couldn't read the image. Try saving it again from your floorplan source.",
        });
        URL.revokeObjectURL(previewUrl);
        return;
      }

      setState({
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
        setState({
          kind: "error",
          message: e instanceof Error ? e.message : "Network error",
        });
        URL.revokeObjectURL(previewUrl);
        return;
      }

      // Read the body as text first so we can surface both JSON
      // errors AND the raw text from upstream (Vercel runtime, etc.)
      // when the response isn't JSON. The previous body.json().catch(...)
      // dropped that text on the floor.
      const rawText = await res.text();
      let data:
        | { ok: true; id: string }
        | { ok: false; error: string; id?: string }
        | null = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        data = null;
      }

      if (!res.ok || !data || !data.ok) {
        const surface =
          data && "error" in data && data.error
            ? data.error
            : rawText.trim().length > 0
              ? `Upload failed (${res.status}): ${rawText.slice(0, 400)}`
              : `Upload failed (${res.status})`;
        setState({ kind: "error", message: surface });
        URL.revokeObjectURL(previewUrl);
        return;
      }

      // router.push doesn't reliably scroll to top after a long
      // request; the report page does its own scroll-restore.
      router.push(`/report/${data.id}`);
    },
    [router],
  );

  function reset() {
    if (state.kind === "resizing" || state.kind === "uploading") {
      URL.revokeObjectURL(state.previewUrl);
    }
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  // ─── Render ───────────────────────────────────────────────────────

  if (state.kind === "uploading") {
    // Progress curve: fast to 90%, then slow crawl. Linear-to-90
    // would jump the user from "almost done" to "stuck", so we ease
    // the last 10% into a long tail. If the response actually lands
    // before the bar gets to 90%, the success path moves us to the
    // next state; if it takes longer, the bar inches up to ~98%
    // and stays there.
    const linearFrac = Math.min(1, state.elapsedSec / TARGET_SECONDS);
    const fastFill = linearFrac * 0.9; // 0 → 0.9 over TARGET_SECONDS
    const overrunFrac =
      state.elapsedSec > TARGET_SECONDS
        ? Math.min(0.08, (state.elapsedSec - TARGET_SECONDS) / 60)
        : 0; // crawl 0 → 0.08 over the next minute
    const fillPct = Math.round((fastFill + overrunFrac) * 100);
    const substepIdx = Math.min(
      SUBSTEPS.length - 1,
      Math.floor((state.elapsedSec / TARGET_SECONDS) * SUBSTEPS.length),
    );

    return (
      <section className="rounded-3xl border border-coral/30 bg-white p-8 sm:p-10 shadow-sm">
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-coral-pale text-coral-dark">
            <Sparkles className="w-4 h-4" />
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-navy text-center leading-tight">
          Analysing your floorplan…
        </h2>

        {/* Progress bar — determinate fill driven by elapsed time.
            ARIA progressbar role + value props so screen readers
            announce the percentage rather than a silent spinner. */}
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
            <span aria-live="polite">{SUBSTEPS[substepIdx]}</span>
            <span className="tabular-nums">{fillPct}%</span>
          </div>
        </div>

        {/* Preview thumb so the user can verify they uploaded the
            right image while the extraction runs. */}
        {state.previewUrl && (
          <div className="mt-6 mx-auto max-w-md rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.previewUrl}
              alt="Uploaded floorplan"
              className="w-full max-h-80 object-contain"
            />
          </div>
        )}
        <p className="mt-6 text-[11px] text-slate-400 text-center">
          Usually under 30 seconds. Don&rsquo;t close this tab.
        </p>
      </section>
    );
  }

  if (state.kind === "resizing") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10 shadow-sm text-center">
        <Loader2 className="w-6 h-6 mx-auto animate-spin text-coral" />
        <p className="mt-3 text-sm text-[var(--muted-brand)]">Preparing your image…</p>
      </section>
    );
  }

  if (state.kind === "error") {
    return (
      <section className="rounded-3xl border border-rose-200 bg-rose-50 p-8 sm:p-10">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-700 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h2 className="text-base font-bold text-rose-900">
              We couldn&rsquo;t read this floorplan
            </h2>
            <p className="mt-1 text-sm text-rose-800 leading-relaxed">
              {state.message}
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
    );
  }

  // Idle — the dropzone.
  return (
    <section
      className={`relative rounded-3xl border-2 border-dashed bg-white p-8 sm:p-12 text-center transition-colors ${
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
      <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-coral-pale text-coral mb-5">
        <Upload className="w-6 h-6" />
      </span>
      <h2 className="text-xl sm:text-2xl font-bold text-navy">
        Drop your floorplan here
      </h2>
      <p className="mt-2 text-sm text-[var(--muted-brand)]">
        PNG or JPG, up to 10 MB
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mt-6 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-coral hover:bg-coral-dark text-white font-semibold text-sm shadow-sm transition-colors"
      >
        Choose a file
        <ArrowRight className="w-4 h-4" />
      </button>
      <p className="mt-5 text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
        We delete the image after 90 days. The extracted JSON stays so
        installers can prep their site visit.
      </p>
    </section>
  );
}

// Re-export shared icons for the loading state — keeps the import
// list above tidy when we add more states later.
export { CheckCircle2, X };
