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

      // Square-only — best-effort pre-check before upload. Server
      // re-validates as the trust boundary. We use a hidden <img>
      // because it works for all four MIME types we accept,
      // including SVG (which uses viewBox to compute naturalSize).
      const dims = await readImageDimensions(file);
      if (dims && dims.width !== dims.height) {
        throw new Error(
          `Logo must be square. This one is ${dims.width}×${dims.height}. Re-export at a 1:1 aspect ratio (e.g. 512×512).`,
        );
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
        listings.{" "}
        <strong className="text-navy">
          Must be square (1:1 aspect ratio)
        </strong>{" "}
        — e.g. 512×512 px. PNG, JPEG, WEBP or SVG, up to 2 MB.
        Non-square uploads are rejected so logos never stretch.
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

/**
 * SponsoredCard UX (post Jim's UX feedback):
 *
 *  ┌─────────────────────────────────────────────┐
 *  │ ✦ Sponsored placement                  [○]  │   ← Switch
 *  │ Float to the top of directory pages…        │
 *  │                                             │
 *  │ ┌── only when ON (pending) ───────────────┐ │
 *  │ │ For how long?                           │ │
 *  │ │ [ 7 days ] [ 30 days ] [ 90 days ]      │ │   ← Each button
 *  │ └─────────────────────────────────────────┘ │     activates
 *  └─────────────────────────────────────────────┘
 *
 * Three states:
 *   - OFF:     switch is off, card is collapsed (no duration UI)
 *   - PENDING: user clicked switch ON but hasn't picked a duration
 *              yet. Switch shows "on" but disabled-looking; duration
 *              buttons revealed.
 *   - ACTIVE:  boost has been activated. Switch on, expiry shown,
 *              Cancel button (which flips back to OFF).
 *
 * Picking a duration button immediately POSTs to the API and moves
 * the card to ACTIVE. No separate "Activate" button — the duration
 * pick IS the activate.
 */

const BOOST_DURATIONS: Array<{
  days: 7 | 30 | 90;
  label: string;
  sublabel: string;
}> = [
  { days: 7, label: "7 days", sublabel: "short test" },
  { days: 30, label: "30 days", sublabel: "recommended" },
  { days: 90, label: "90 days", sublabel: "quarterly" },
];

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
  // Drives the "PENDING" state — when the installer flips the switch
  // ON but hasn't picked a duration yet. Resets to false on activate
  // or when the switch goes back OFF.
  const [pendingDuration, setPendingDuration] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const active =
    sponsoredUntil != null &&
    new Date(sponsoredUntil).getTime() > Date.now();
  const switchOn = active || pendingDuration;

  const expiresLabel = sponsoredUntil
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(sponsoredUntil))
    : null;

  function onSwitchChange(next: boolean) {
    setError(null);
    setSuccess(null);
    if (next) {
      // Flipping ON: enter PENDING — show duration buttons. The
      // actual activate fires when the installer picks a duration.
      setPendingDuration(true);
    } else if (active) {
      // Flipping OFF while ACTIVE: cancel the boost.
      void onCancel();
    } else {
      // Flipping OFF while PENDING (changed their mind): just clear.
      setPendingDuration(false);
    }
  }

  async function onPickDuration(days: 7 | 30 | 90) {
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      const res = await fetch("/api/installer/profile/sponsored", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const json = (await res.json()) as
        | { ok: true; sponsoredUntil: string }
        | { ok: false; error: string };
      if (!res.ok || !json.ok) {
        throw new Error(("error" in json && json.error) || "Update failed");
      }
      setSponsoredUntil(json.sponsoredUntil);
      setPendingDuration(false);
      setSuccess(
        `Boost active until ${new Intl.DateTimeFormat("en-GB", {
          day: "numeric",
          month: "short",
        }).format(new Date(json.sponsoredUntil))}. You're at the top of directory pages.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onCancel() {
    setBusy(true);
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
      setPendingDuration(false);
      setSuccess(
        "Boost cancelled. You're back to organic placement + the standard 5-credit lead cost.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
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
      <header className="flex items-start gap-3 mb-1">
        <Sparkles className="w-4 h-4 text-coral mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-navy">
            Sponsored placement
            {active && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-coral text-white text-[10px] font-bold uppercase tracking-wider px-2 py-0.5">
                <Sparkles className="w-3 h-3" /> Active
              </span>
            )}
          </h2>
        </div>
        <Switch
          checked={switchOn}
          disabled={busy}
          onChange={onSwitchChange}
          ariaLabel="Sponsored placement"
        />
      </header>
      <p className="text-xs text-slate-600 leading-relaxed mb-4">
        Float to the top of every directory listing in your area. While
        active, accepting a lead debits{" "}
        <strong className="text-navy">10 credits</strong> instead of the
        standard 5 — that&rsquo;s the deal. No charge happens just for
        being boosted; you only pay when a homeowner accepts your slot.
      </p>

      {/* ── ACTIVE state ── */}
      {active && (
        <div className="rounded-xl border border-coral/30 bg-white p-3 mt-3 text-sm">
          <p className="text-navy">
            <strong>Active</strong> until {expiresLabel}.
          </p>
          <p className="text-xs text-slate-600 mt-1">
            Flip the switch off (or click below) to cancel and return to
            organic placement.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="mt-3 inline-flex items-center gap-1.5 h-9 px-4 rounded-full bg-white border border-slate-300 hover:border-slate-400 text-slate-700 text-xs font-medium disabled:opacity-60 transition-colors"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Cancel boost
          </button>
        </div>
      )}

      {/* ── PENDING state — installer flipped switch on, now picks duration ── */}
      {!active && pendingDuration && (
        <div className="mt-3 rounded-xl border border-coral/30 bg-coral-pale/30 p-3">
          <p className="text-xs font-semibold text-navy mb-2">
            For how long?
          </p>
          <div className="grid grid-cols-3 gap-2">
            {BOOST_DURATIONS.map((o) => (
              <button
                key={o.days}
                type="button"
                disabled={busy}
                onClick={() => void onPickDuration(o.days)}
                className="text-left rounded-xl border border-slate-200 bg-white hover:border-coral hover:bg-coral-pale/40 disabled:opacity-60 p-3 transition-colors"
              >
                <p className="text-sm font-semibold text-navy">
                  {o.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {o.sublabel}
                </p>
              </button>
            ))}
          </div>
          {creditBalance < 10 && (
            <p className="mt-3 text-[11px] text-amber-700 leading-relaxed">
              Heads up — you&rsquo;ve got {creditBalance} credit
              {creditBalance === 1 ? "" : "s"}. Each sponsored lead
              accept costs 10. Top up first so you don&rsquo;t miss
              any.
            </p>
          )}
        </div>
      )}

      {error && <InlineAlert kind="error">{error}</InlineAlert>}
      {success && <InlineAlert kind="success">{success}</InlineAlert>}
    </section>
  );
}

// ─── Switch ────────────────────────────────────────────────────────
//
// Tailwind-only switch. No headlessui — we already lean on shadcn-
// style primitives elsewhere but a single switch isn't worth the dep.
// Uses a hidden checkbox for keyboard + screen-reader support.

function Switch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-coral focus:ring-offset-2 ${
        checked ? "bg-coral" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

// ─── Shared ─────────────────────────────────────────────────────────

/**
 * Read image natural dimensions in the browser without uploading.
 * Works for raster + SVG (SVG uses viewBox to compute naturalSize).
 * Returns null on decode failure so the caller can fall back to
 * server-side validation.
 */
async function readImageDimensions(
  file: File,
): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);
      if (w > 0 && h > 0) resolve({ width: w, height: h });
      else resolve(null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

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
