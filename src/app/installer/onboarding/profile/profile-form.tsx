"use client";

// Profile-onboarding client form. Reuses the existing logo-upload
// endpoint (/api/installer/profile/logo) for the logo dropzone +
// posts to a new /api/installer/onboarding/profile to save the bio
// + stamp the milestone + grant credits.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Image as ImageIcon,
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Props {
  installerId: number;
  companyName: string;
  initialLogoUrl: string | null;
  initialBio: string | null;
}

const MIN_BIO_LENGTH = 80;
const MAX_BIO_LENGTH = 600;

export function ProfileOnboardingForm({
  companyName,
  initialLogoUrl,
  initialBio,
}: Props) {
  const router = useRouter();
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [bio, setBio] = useState(initialBio ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ creditsGranted: number } | null>(
    null,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const bioTooShort = bio.trim().length < MIN_BIO_LENGTH;
  const canSubmit = !!logoUrl && !bioTooShort && !submitting;

  async function onLogoChange(file: File) {
    setError(null);
    setUploading(true);
    try {
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File is over the 2 MB limit");
      }
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/installer/profile/logo", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as
        | { ok: true; logoUrl: string }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Upload failed");
      }
      setLogoUrl(json.logoUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/installer/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: bio.trim() }),
      });
      const json = (await res.json()) as
        | { ok: true; creditsGranted: number }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Save failed");
      }
      setSuccess({ creditsGranted: json.creditsGranted });
      // Refresh server state + advance to overview after a beat.
      setTimeout(() => {
        router.push("/installer/onboarding");
        router.refresh();
      }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-6"
    >
      {/* Logo */}
      <section>
        <h2 className="text-sm font-semibold text-navy mb-2">
          Company logo
        </h2>
        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          <strong className="text-navy">Square (1:1) only.</strong> PNG,
          JPEG, WEBP or SVG. Up to 2 MB. Non-square uploads are rejected
          so logos never stretch.
        </p>
        <div className="flex items-start gap-4">
          <div className="shrink-0 w-24 h-24 rounded-2xl border border-[var(--border)] bg-cream relative overflow-hidden flex items-center justify-center">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt={`${companyName} logo`}
                fill
                sizes="96px"
                className="object-contain"
              />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-300" aria-hidden />
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white text-sm font-medium disabled:opacity-60 transition-colors"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UploadCloud className="w-4 h-4" />
              )}
              {logoUrl ? "Replace" : "Upload logo"}
            </button>
            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl(null)}
                className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium"
              >
                <X className="w-4 h-4" /> Remove
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onLogoChange(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </section>

      {/* Bio */}
      <section>
        <h2 className="text-sm font-semibold text-navy mb-2">
          Short bio
        </h2>
        <p className="text-xs text-slate-500 mb-3 leading-relaxed">
          2-3 sentences. What makes {companyName} different + how long
          you&rsquo;ve been doing this. Avoid marketing language — speak
          like a person.
        </p>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={MAX_BIO_LENGTH}
          rows={5}
          placeholder="We've been installing heat pumps in the West Midlands since 2012. We won't quote unless we think you'll actually save money — about 1 in 6 enquiries we tell to look at insulation first…"
          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-coral focus:outline-none text-sm text-slate-900 placeholder:text-slate-400 leading-relaxed"
        />
        <div className="mt-1 flex items-center justify-between text-[11px]">
          <span className={bioTooShort ? "text-amber-700" : "text-slate-500"}>
            {bioTooShort
              ? `At least ${MIN_BIO_LENGTH} characters (${bio.trim().length}/${MIN_BIO_LENGTH})`
              : `${bio.length}/${MAX_BIO_LENGTH}`}
          </span>
        </div>
      </section>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Profile saved.
            {success.creditsGranted > 0
              ? ` +${success.creditsGranted} credits landed in your balance.`
              : ""}{" "}
            Taking you back to onboarding…
          </span>
        </div>
      )}

      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-full bg-coral hover:bg-coral-dark disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          "Save profile + continue"
        )}
      </button>
    </form>
  );
}
