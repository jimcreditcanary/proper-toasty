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

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Ban,
  CheckCircle2,
  Coins,
  Loader2,
  MoreVertical,
  ShieldCheck,
  User as UserIcon,
  Wrench,
  ExternalLink,
} from "lucide-react";

interface Props {
  userId: string;
  email: string;
  currentRole: "admin" | "user" | "installer";
  blocked: boolean;
  // Self-protection — server passes the viewer's id so we disable
  // self-block / self-demote without a second roundtrip.
  isSelf: boolean;
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
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Click-outside to close the menu. Pointerdown rather than click so
  // the menu closes before the next click target gets focus, which
  // matters when the next click is itself inside another row's menu.
  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
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
    <div ref={wrapperRef} className="relative shrink-0">
      <button
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

      {open && (
        <div
          className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-slate-200 bg-white shadow-lg p-1.5"
          role="menu"
          // Stop the parent <Link> from receiving the click → no
          // accidental navigation when picking an action.
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* Role section */}
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Role
          </p>
          {ROLE_OPTIONS.map((opt) => {
            const isCurrent = opt.key === currentRole;
            const wouldDemoteSelf = isSelf && currentRole === "admin" && opt.key !== "admin";
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
        </div>
      )}
    </div>
  );
}
