"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
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

type UploadState =
  | { kind: "idle" }
  | { kind: "resizing"; previewUrl: string }
  | { kind: "uploading"; previewUrl: string; bytes: number }
  | { kind: "done"; previewUrl: string; objectKey: string; bytes: number }
  | { kind: "error"; message: string };

const ACCEPT = "image/jpeg,image/png";

export function Step4Floorplan() {
  const { state, update, next, back } = useCheckWizard();
  const [upload, setUpload] = useState<UploadState>(() =>
    state.floorplanObjectKey
      ? { kind: "done", previewUrl: "", objectKey: state.floorplanObjectKey, bytes: 0 }
      : { kind: "idle" }
  );
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Revoke object URLs when the component unmounts or state swaps.
  useEffect(() => {
    return () => {
      if (upload.kind !== "idle" && upload.kind !== "error" && upload.previewUrl) {
        URL.revokeObjectURL(upload.previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        if (file.type === "application/pdf") {
          setUpload({
            kind: "error",
            message: "PDF floorplans aren't supported yet — please save the first page as an image and try again.",
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
        setUpload({ kind: "done", previewUrl, objectKey: j.objectKey, bytes: j.bytes });
        update({ floorplanObjectKey: j.objectKey });
      } catch (err) {
        URL.revokeObjectURL(previewUrl);
        setUpload({
          kind: "error",
          message: err instanceof Error ? err.message : "Upload failed",
        });
      }
    },
    [update]
  );

  const reset = useCallback(() => {
    if (upload.kind !== "idle" && upload.kind !== "error" && upload.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
    }
    setUpload({ kind: "idle" });
    update({ floorplanObjectKey: null });
  }, [upload, update]);

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = ""; // allow re-selecting the same file after reset
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const done = upload.kind === "done";

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="text-center mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-coral mb-2">
          Step 4 of 6
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-navy">
          Upload your floorplan
        </h2>
        <p className="mt-3 text-slate-600">
          A JPG or PNG — our AI reads rooms, radiators, and where the cylinder might go.
        </p>
      </div>

      {upload.kind === "idle" || upload.kind === "error" ? (
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
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="relative w-28 h-28 shrink-0 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
              {upload.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={upload.previewUrl}
                  alt="Floorplan preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <FileImage className="w-8 h-8 text-slate-400" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-navy">Floorplan</p>
              <div className="mt-1 text-xs text-slate-500">
                {upload.kind === "resizing" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Resizing…
                  </span>
                )}
                {upload.kind === "uploading" && (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Uploading · {(upload.bytes / 1024).toFixed(0)} KB
                  </span>
                )}
                {upload.kind === "done" && (
                  <span className="inline-flex items-center gap-1.5 text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ready for analysis
                  </span>
                )}
              </div>
              {done && (
                <button
                  type="button"
                  onClick={reset}
                  className="mt-3 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900"
                >
                  <X className="w-3 h-3" />
                  Replace
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {upload.kind === "error" && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
          {upload.message}
        </p>
      )}

      <details className="mt-6 text-sm text-slate-600">
        <summary className="cursor-pointer font-medium">What we look for</summary>
        <ul className="mt-3 space-y-1.5 text-xs list-disc pl-5 text-slate-500">
          <li>Room types and counts (bedrooms, bathrooms, living rooms)</li>
          <li>Radiator markings if present</li>
          <li>Boiler and hot water cylinder locations</li>
          <li>Approximate floor area (if a scale is shown)</li>
          <li>External walls and garden / outdoor boundaries</li>
        </ul>
        <p className="mt-3 text-xs text-slate-500">
          We delete uploaded floorplans automatically after 90 days. You can delete yours sooner
          by contacting us.
        </p>
      </details>

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
          disabled={!done}
          className="inline-flex items-center gap-2 h-11 px-6 rounded-lg bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
        >
          Run the analysis
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
