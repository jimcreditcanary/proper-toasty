"use client";

// Profile editor for /installer/profile.
//
// Two cards stacked:
//   1. Logo  — file input + preview. Uploads via the
//              /api/installer/profile/logo route (admin-tier writes
//              to the public installer-logos Supabase Storage bucket,
//              updates installers.logo_url on success).
//   2. Boost — radio selection (7 / 30 days, or off) + Activate /
//              Cancel button. Hits /api/installer/profile/sponsored.
//
// Both cards optimistically update on success and surface errors
// inline. No global toast system — there isn't one in the portal —
// so we render an inline alert per card.

import { useRef, useState } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  Sparkles,
  UploadCloud,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Props {
  companyName: string;
  initialLogoUrl: string | null;
  initialSponsoredUntil: string | null;
  creditBalance: number;
}

// Two SKUs. Keep these in sync with the API route's accepted values.
const BOOST_OPTIONS: Array<{ days: 7 | 30; label: string; sublabel: string }> = [
  { days: 7, label: "7 days", sublabel: "short test" },
  { days: 30, label: "30 days", sublabel: "recommended" },
];

export function ProfileEditor({
  companyName,
  initialLogoUrl,
  initialSponsoredUntil,
  creditBalance,
}: Props) {
  return (
    <div className="space-y-6">
      <LogoCard
        companyName={companyName}
        initialLogoUrl={initialLogoUrl}
      />
      <SponsoredCard
        initialSponsoredUntil={initialSponsoredUntil}
        creditBalance={creditBalance}
      />
    </div>
  );
}

// ─── Logo card ──────────────────────────────────────────────────────

function LogoCard({
  companyName,
  initialLogoUrl,
}: {
  companyName: string;
  initialLogoUrl: string | null;
}) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function onFile(file: File) {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      // Client-side size cap mirrors the bucket policy (2 MiB) so we
      // fail fast before paying the upload bandwidth.
      if (file.size > 2 * 1024 * 1024) {
        throw new Error("File is over the 2 MB limit");
      }
      const allowed = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
      if (!allowed.includes(file.type)) {
        throw new Error("Use PNG, JPEG, WEBP or SVG");
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
        throw new Error(
          ("error" in json && json.error) || "Upload failed",
        );
      }
      setLogoUrl(json.logoUrl);
      setSuccess("Logo updated — visible on directory pages now.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onRemove() {
    setError(null);
    setSuccess(null);
    setUploading(true);
    try {
      const res = await fetch("/api/installer/profile/logo", {
        method: "DELETE",
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(
          ("error" in json && json.error) || "Removal failed",
        );
      }
      setLogoUrl(null);
      setSuccess("Logo removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Removal failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <header className="flex items-center gap-2 mb-1">
        <ImageIcon className="w-4 h-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-navy">Logo</h2>
      </header>
      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
        Shown on your card across {companyName}&rsquo;s directory
        listings. Square works best. PNG, JPEG, WEBP, SVG. Up to 2 MB.
      </p>

      <div className="flex flex-col sm:flex-row items-start gap-5">
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

        <div className="flex-1 min-w-0 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-coral hover:bg-coral-dark text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
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
              disabled={uploading}
              onClick={onRemove}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium disabled:opacity-60 transition-colors"
            >
              <X className="w-4 h-4" />
              Remove
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
              // Clear so picking the same file again re-fires onChange.
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {error && <InlineAlert kind="error">{error}</InlineAlert>}
      {success && <InlineAlert kind="success">{success}</InlineAlert>}
    </section>
  );
}

// ─── Sponsored card ─────────────────────────────────────────────────

function SponsoredCard({
  initialSponsoredUntil,
  creditBalance,
}: {
  initialSponsoredUntil: string | null;
  creditBalance: number;
}) {
  const [sponsoredUntil, setSponsoredUntil] = useState<string | null>(
    initialSponsoredUntil,
  );
  const [selected, setSelected] = useState<7 | 30>(30);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const active =
    sponsoredUntil != null &&
    new Date(sponsoredUntil).getTime() > Date.now();
  const expiresLabel = sponsoredUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(sponsoredUntil))
    : null;

  async function onActivate() {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/installer/profile/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: selected }),
      });
      const json = (await res.json()) as
        | { ok: true; sponsoredUntil: string }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Update failed");
      }
      setSponsoredUntil(json.sponsoredUntil);
      setSuccess(
        `Boost active until ${new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
        }).format(new Date(json.sponsoredUntil))}. You're at the top of directory pages.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  async function onCancel() {
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const res = await fetch("/api/installer/profile/sponsored", {
        method: "DELETE",
      });
      const json = (await res.json()) as
        | { ok: true }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Update failed");
      }
      setSponsoredUntil(null);
      setSuccess(
        "Boost cancelled. You're back to organic placement + the standard 5-credit lead cost.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      className={`rounded-2xl border p-5 sm:p-6 ${
        active
          ? "border-coral/40 bg-coral-pale/30"
          : "border-slate-200 bg-white"
      }`}
    >
      <header className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-coral" />
        <h2 className="text-sm font-semibold text-navy">
          Sponsored placement
        </h2>
        {active && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-coral text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
            <Sparkles className="w-3 h-3" /> Active
          </span>
        )}
      </header>
      <p className="text-xs text-slate-600 leading-relaxed mb-5">
        Float to the top of every directory listing in your area. While
        active, accepting a lead debits{" "}
        <strong className="text-navy">10 credits</strong> instead of the
        standard 5 — that&rsquo;s the deal. No charge happens just for
        being boosted; you only pay when a homeowner accepts your slot.
      </p>

      {active ? (
        <ActiveState
          expiresLabel={expiresLabel}
          onCancel={onCancel}
          pending={pending}
        />
      ) : (
        <InactiveState
          options={BOOST_OPTIONS}
          selected={selected}
          onSelect={setSelected}
          onActivate={onActivate}
          pending={pending}
          creditBalance={creditBalance}
        />
      )}

      {error && <InlineAlert kind="error">{error}</InlineAlert>}
      {success && <InlineAlert kind="success">{success}</InlineAlert>}
    </section>
  );
}

function ActiveState({
  expiresLabel,
  onCancel,
  pending,
}: {
  expiresLabel: string | null;
  onCancel: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-navy">
          <strong>Active</strong> until {expiresLabel}.
        </p>
        <p className="text-xs text-slate-600 mt-1">
          Cancelling demotes you back to organic placement immediately.
          We don&rsquo;t refund the boost cost (there isn&rsquo;t one —
          you only paid for accepted leads).
        </p>
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className="inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-sm font-medium disabled:opacity-60 transition-colors"
      >
        {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Cancel boost
      </button>
    </div>
  );
}

function InactiveState({
  options,
  selected,
  onSelect,
  onActivate,
  pending,
  creditBalance,
}: {
  options: Array<{ days: 7 | 30; label: string; sublabel: string }>;
  selected: 7 | 30;
  onSelect: (d: 7 | 30) => void;
  onActivate: () => void;
  pending: boolean;
  creditBalance: number;
}) {
  return (
    <div className="space-y-4">
      <fieldset>
        <legend className="text-xs font-semibold text-slate-700 mb-2">
          Boost duration
        </legend>
        <div className="grid grid-cols-2 gap-3">
          {options.map((o) => {
            const isSelected = o.days === selected;
            return (
              <button
                key={o.days}
                type="button"
                onClick={() => onSelect(o.days)}
                className={`text-left rounded-xl border p-3 transition-colors ${
                  isSelected
                    ? "border-coral bg-coral-pale/40"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <p className="text-sm font-semibold text-navy">
                  {o.label}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {o.sublabel}
                </p>
              </button>
            );
          })}
        </div>
      </fieldset>

      <button
        type="button"
        disabled={pending}
        onClick={onActivate}
        className="inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-coral hover:bg-coral-dark text-white text-sm font-semibold disabled:opacity-60 transition-colors"
      >
        {pending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        Activate boost
      </button>

      {creditBalance < 10 && (
        <p className="text-[11px] text-amber-700 leading-relaxed">
          Heads up — you&rsquo;ve got {creditBalance} credit
          {creditBalance === 1 ? "" : "s"}. Each sponsored lead accept
          costs 10. Top up first so you don&rsquo;t miss any.
        </p>
      )}
    </div>
  );
}

// ─── Shared ─────────────────────────────────────────────────────────

function InlineAlert({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: React.ReactNode;
}) {
  const palette =
    kind === "error"
      ? "border-rose-200 bg-rose-50 text-rose-900"
      : "border-emerald-200 bg-emerald-50 text-emerald-900";
  const Icon = kind === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      className={`mt-4 rounded-lg border px-3 py-2 text-xs leading-relaxed flex items-start gap-2 ${palette}`}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </div>
  );
}
