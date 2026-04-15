"use client";

import { useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  Image as ImageIcon,
  Loader2,
  X,
} from "lucide-react";
import { useWizard } from "./context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MarketplaceSource } from "./types";

const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

type SourceOption = {
  id: MarketplaceSource;
  label: string;
};

const SOURCES: SourceOption[] = [
  { id: "facebook", label: "Facebook Marketplace" },
  { id: "gumtree", label: "Gumtree" },
  { id: "ebay", label: "eBay" },
  { id: "other", label: "Other" },
];

export function Step4Marketplace() {
  const { state, update, setStep } = useWizard();
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const source = state.marketplaceSource;

  function pickSource(id: MarketplaceSource) {
    update({
      marketplaceSource: id,
      marketplaceError: null,
      // Reset screenshot if switching sources
      ...(id !== source
        ? {
            marketplaceScreenshot: null,
            marketplaceScreenshotUrl: null,
          }
        : {}),
    });
  }

  function skip() {
    update({
      marketplaceSource: null,
      marketplaceOther: "",
      marketplaceScreenshot: null,
      marketplaceScreenshotUrl: null,
      marketplaceError: null,
    });
    setStep(5);
  }

  async function handleFile(file: File | null | undefined) {
    if (!file) return;
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      update({ marketplaceError: "Please upload a PNG, JPG, or WebP image." });
      return;
    }
    update({
      marketplaceScreenshot: file,
      marketplaceScreenshotUrl: null,
      marketplaceUploading: true,
      marketplaceError: null,
    });

    // Upload via a small edge route — we defer until submission to keep this
    // step simple, just hold the File in memory. runVerification will upload.
    update({ marketplaceUploading: false });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  }

  function clearScreenshot() {
    update({
      marketplaceScreenshot: null,
      marketplaceScreenshotUrl: null,
      marketplaceError: null,
    });
  }

  const canContinue =
    source === null
      ? false
      : !!state.marketplaceScreenshot &&
        (source !== "other" || state.marketplaceOther.trim().length > 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-900">
        Are you buying through a marketplace?
      </h2>

      {/* Source cards */}
      <div className="grid grid-cols-2 gap-3">
        {SOURCES.map((s) => {
          const selected = source === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => pickSource(s.id)}
              className={`rounded-xl border-2 p-4 text-center transition-colors cursor-pointer hover:border-coral/40 ${
                selected ? "border-coral bg-coral/5" : "border-slate-200"
              }`}
            >
              <span className="text-sm font-medium text-slate-700">{s.label}</span>
            </button>
          );
        })}
      </div>

      {/* Skip link */}
      <div>
        <button
          type="button"
          onClick={skip}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 underline"
        >
          No, skip this step
        </button>
      </div>

      {source === "other" && (
        <div className="space-y-1.5 max-w-md">
          <Label className="text-sm text-slate-700">Which marketplace?</Label>
          <Input
            value={state.marketplaceOther}
            onChange={(e) => update({ marketplaceOther: e.target.value })}
            placeholder="e.g. AutoTrader, Preloved, etc."
            className="h-10 rounded-lg border-slate-200"
          />
        </div>
      )}

      {source && (source !== "other" || state.marketplaceOther.trim().length > 0) && (
        <div className="space-y-3">
          <div>
            <Label className="block text-sm font-medium text-slate-700 mb-1">
              Upload a screenshot of the listing
            </Label>
            <p className="text-xs text-slate-500">
              Drop, paste, or click to upload (PNG, JPG, or WebP).
            </p>
          </div>

          {!state.marketplaceScreenshot && !state.marketplaceUploading && (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`rounded-xl border-2 border-dashed p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                dragOver
                  ? "border-coral bg-coral/5"
                  : "border-slate-300 hover:border-slate-400"
              }`}
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm font-medium text-slate-700">
                Drop or click to upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => handleFile(e.target.files?.[0])}
                className="hidden"
              />
            </div>
          )}

          {state.marketplaceUploading && (
            <div className="flex items-center justify-center gap-2 p-6 rounded-xl border border-slate-200 bg-white">
              <Loader2 className="h-5 w-5 text-coral animate-spin" />
              <p className="text-sm text-slate-600">Uploading\u2026</p>
            </div>
          )}

          {state.marketplaceScreenshot && !state.marketplaceUploading && (
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <ImageIcon className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-sm text-slate-700 truncate flex-1">
                {state.marketplaceScreenshot.name}
              </span>
              <button
                type="button"
                onClick={clearScreenshot}
                className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Remove
              </button>
            </div>
          )}

          {state.marketplaceError && (
            <p className="text-sm text-red-600">{state.marketplaceError}</p>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={() => {
            // Go back to step 3 if vehicle, else step 2
            if (state.purchaseCategory === "vehicle") {
              setStep(3);
            } else {
              setStep(2);
            }
          }}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {canContinue && (
          <Button
            onClick={() => setStep(5)}
            className="bg-coral hover:bg-coral-dark text-white font-semibold"
          >
            Continue
            <ArrowRight className="h-4 w-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
