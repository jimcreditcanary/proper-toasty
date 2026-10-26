"use client";

// Quick-actions for /admin/users list rows.
//
// Sits to the right of each row as a "..." dropdown so the row body
// itself stays a single click target into the user detail page. The
// dropdown gives admins one-click access to the most-used ops:
//
//   - Make admin / installer / user (role flip)
//   - Block / Unblock
//   - Open detail (drilldown — for credits, audit log, history)
//
// Hits the same /api/admin/users/[id]/{role,blocked} endpoints the
// detail page uses, so behaviour + permissions stay consistent.
// Credits stay on the detail page because they need a reason field
// + audit context that doesn't fit in a row dropdown.

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Ban,
  Building2,
  CheckCircle2,
  Coins,
  KeyRound,
  Link2Off,
  Loader2,
  MoreVertical,
  ShieldCheck,
  User as UserIcon,
  Wrench,
  ExternalLink,
} from "lucide-react";
import { InstallerPicker } from "./installer-picker";

interface Props {
  userId: string;
  email: string;
  currentRole: "admin" | "user" | "installer";
  blocked: boolean;
  // Self-protection — server passes the viewer's id so we disable
  // self-block / self-demote without a second roundtrip.
  isSelf: boolean;
  // Current installer binding (users.installer_id). Null if unbound.
  // Enables the "Unbind" item + "Change installer" vs "Bind" labelling.
  installerId: number | null;
  installerName: string | null;
}

type RoleKey = "admin" | "installer" | "user";

const ROLE_OPTIONS: { key: RoleKey; label: string; icon: React.ReactNode }[] = [
  { key: "admin", label: "Make admin", icon: <ShieldCheck className="w-3.5 h-3.5" /> },
  { key: "installer", label: "Make installer", icon: <Wrench className="w-3.5 h-3.5" /> },
  { key: "user", label: "Make user", icon: <UserIcon className="w-3.5 h-3.5" /> },
];

export function UserRowActions({
  userId,
  email,
  currentRole,
  blocked,
  isSelf,
  installerId,
  installerName,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  // Menu panel coords. Portaled to document.body (position: fixed) so
  // it escapes every parent stacking context — otherwise sibling row
  // cards (bg-white, later in document order) paint over it and hide
  // half the menu.
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(
    null,
  );
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) {
      setCoords(null);
      return;
    }
    function place() {
      const btn = buttonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      setCoords({
        top: r.bottom + 4,
        right: window.innerWidth - r.right,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Click-outside to close the menu. Pointerdown rather than click so
  // the menu closes before the next click target gets focus, which
  // matters when the next click is itself inside another row's menu.
  // Checks both the button and the portaled panel, since the panel
  // is no longer a DOM descendant of the button wrapper.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  async function changeRole(role: RoleKey) {
    if (role === currentRole) {
      setOpen(false);
      return;
    }
    setBusy(`role:${role}`);
    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Role change failed");
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  // Generated temp password is kept in local state so we can render
  // it in a modal with a Copy button. Cleared when the modal closes
  // so it doesn't linger in memory or in the DOM.
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function setNewPassword() {
    const ok = window.confirm(
      `Generate a new temporary password for ${email}? They'll be forced to pick a new one on their next login.`,
    );
    if (!ok) return;
    setBusy("set-password");
    try {
      const res = await fetch(`/api/admin/users/${userId}/set-password`, {
        method: "POST",
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.error ?? "Set password failed");
        return;
      }
      setTempPassword(j.password);
      setOpen(false);
    } finally {
      setBusy(null);
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail on insecure contexts / older browsers —
      // the password is still visible on screen for manual copy.
    }
  }

  const [pickerOpen, setPickerOpen] = useState(false);

  async function unbindInstaller() {
    const ok = window.confirm(
      `Unbind ${email} from ${installerName ?? "their installer"}? They'll lose installer-portal access on their next page load.`,
    );
    if (!ok) return;
    setBusy("unbind-installer");
    try {
      const res = await fetch(
        `/api/admin/users/${userId}/installer-binding`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installer_id: null }),
        },
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(j.error ?? "Unbind failed");
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function toggleBlocked() {
    const next = !blocked;
    if (next) {
      // Confirm only when blocking — unblocking is reversible.
      const ok = window.confirm(
        `Block ${email}? They won't be able to sign in until you unblock.`,
      );
      if (!ok) return;
    }
    setBusy("blocked");
    try {
      const res = await fetch(`/api/admin/users/${userId}/blocked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocked: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(j.error ?? "Block toggle failed");
        return;
      }
      setOpen(false);
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={`Quick actions for ${email}`}
        className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-navy transition-colors"
      >
        {pending || busy != null ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <MoreVertical className="w-4 h-4" />
        )}
      </button>

      {open && coords && mounted &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: "fixed",
              top: coords.top,
              right: coords.right,
            }}
            className="z-50 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5"
            role="menu"
          >
            {/* Role section */}
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role
            </p>
            {ROLE_OPTIONS.map((opt) => {
              const isCurrent = opt.key === currentRole;
              const wouldDemoteSelf =
                isSelf && currentRole === "admin" && opt.key !== "admin";
              const disabled = isCurrent || wouldDemoteSelf || busy != null;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => void changeRole(opt.key)}
                  disabled={disabled}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                    isCurrent
                      ? "text-slate-400 cursor-default"
                      : disabled
                        ? "text-slate-300 cursor-not-allowed"
                        : "text-navy hover:bg-coral-pale/40 hover:text-coral-dark"
                  }`}
                  title={
                    wouldDemoteSelf ? "You can't demote yourself" : undefined
                  }
                >
                  {opt.icon}
                  <span className="flex-1">{opt.label}</span>
                  {isCurrent && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  )}
                </button>
              );
            })}

            {/* Status section */}
            <div className="my-1.5 border-t border-slate-100" />
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Account
            </p>
            <button
              type="button"
              onClick={() => void setNewPassword()}
              disabled={busy != null}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left text-navy hover:bg-coral-pale/40 hover:text-coral-dark transition-colors disabled:text-slate-300 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-300"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Set new password
            </button>
            <button
              type="button"
              onClick={() => void toggleBlocked()}
              disabled={isSelf || busy != null}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                isSelf
                  ? "text-slate-300 cursor-not-allowed"
                  : blocked
                    ? "text-emerald-700 hover:bg-emerald-50"
                    : "text-rose-700 hover:bg-rose-50"
              }`}
              title={isSelf ? "You can't block yourself" : undefined}
            >
              <Ban className="w-3.5 h-3.5" />
              {blocked ? "Unblock" : "Block account"}
            </button>

            {/* Installer binding */}
            <div className="my-1.5 border-t border-slate-100" />
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Installer
            </p>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setPickerOpen(true);
              }}
              disabled={busy != null}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left text-navy hover:bg-coral-pale/40 hover:text-coral-dark transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
              title={installerName ? `Currently: ${installerName}` : undefined}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span className="flex-1 truncate">
                {installerId ? "Change installer…" : "Bind to installer…"}
              </span>
            </button>
            {installerId !== null && (
              <button
                type="button"
                onClick={() => void unbindInstaller()}
                disabled={busy != null}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left text-rose-700 hover:bg-rose-50 transition-colors disabled:text-slate-300 disabled:cursor-not-allowed"
              >
                <Link2Off className="w-3.5 h-3.5" />
                Unbind installer
              </button>
            )}

            {/* Detail page jumps */}
            <div className="my-1.5 border-t border-slate-100" />
            <a
              href={`/admin/users/${userId}#credits`}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left text-navy hover:bg-coral-pale/40 hover:text-coral-dark transition-colors"
              onClick={() => setOpen(false)}
            >
              <Coins className="w-3.5 h-3.5" />
              Adjust credits…
            </a>
            <a
              href={`/admin/users/${userId}`}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium text-left text-slate-600 hover:bg-slate-50 transition-colors"
              onClick={() => setOpen(false)}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Open user detail
            </a>
          </div>,
          document.body,
        )}

      {pickerOpen && (
        <InstallerPicker
          userId={userId}
          userEmail={email}
          onClose={() => setPickerOpen(false)}
          onBound={() => startTransition(() => router.refresh())}
        />
      )}

      {tempPassword && mounted &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
            onClick={() => setTempPassword(null)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-5 h-5 text-coral" />
                <h2 className="text-base font-semibold text-navy">
                  Temporary password set
                </h2>
              </div>
              <p className="text-xs text-slate-600 mb-4">
                Share this with <span className="font-medium">{email}</span>.
                They&apos;ll be forced to pick a new password on next login.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-sm text-navy break-all">
                  {tempPassword}
                </code>
                <button
                  type="button"
                  onClick={() => void copyTempPassword()}
                  className="shrink-0 px-3 py-2 rounded-lg bg-coral hover:bg-coral-dark text-white text-xs font-semibold transition-colors"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                This password will not be shown again — copy it now.
              </p>
              <button
                type="button"
                onClick={() => setTempPassword(null)}
                className="mt-5 w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
              >
                Done
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
