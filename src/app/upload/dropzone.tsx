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
  | { kind: "uploading"; previewUrl: string; bytes: number; substep: number }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";
const MAX_BYTES = 10 * 1024 * 1024;

// Cosmetic substep labels rotated through during the upload step.
// Each rotates after ~5s; with Sonnet vision typically landing in
// 15-25s the user sees 3-5 labels go past, which reads like progress
// without us actually knowing where the model is.
const SUBSTEPS = [
  "Reading rooms…",
  "Measuring floor areas…",
  "Inferring room types…",
  "Checking outdoor space…",
  "Estimating heat demand…",
  "Scoring heat-pump suitability…",
  "Drafting recommendations…",
] as const;
const SUBSTEP_INTERVAL_MS = 4500;

export function UploadDropzone() {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cycle the substep label while uploading so the spinner doesn't
  // sit on a single string for 25s.
  useEffect(() => {
    if (state.kind !== "uploading") return;
    const id = setInterval(() => {
      setState((s) => {
        if (s.kind !== "uploading") return s;
        return { ...s, substep: (s.substep + 1) % SUBSTEPS.length };
      });
    }, SUBSTEP_INTERVAL_MS);
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
        substep: 0,
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
    return (
      <section className="rounded-3xl border border-coral/30 bg-white p-8 sm:p-10 shadow-sm">
        <div className="flex items-center justify-center gap-3 mb-5">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-coral-pale text-coral">
            <Loader2 className="w-5 h-5 animate-spin" />
          </span>
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-emerald-50 text-emerald-600">
            <Sparkles className="w-4 h-4" />
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-navy text-center leading-tight">
          Analysing your floorplan…
        </h2>
        <p className="mt-3 text-sm text-[var(--muted-brand)] text-center" aria-live="polite">
          {SUBSTEPS[state.substep]}
        </p>
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
