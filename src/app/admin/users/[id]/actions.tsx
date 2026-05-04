"use client";

// Client-side action UI for /admin/users/[id].
//
// Three small forms, each posting to a dedicated route:
//   - RoleForm     → /api/admin/users/[id]/role
//   - BlockedForm  → /api/admin/users/[id]/blocked
//   - CreditsForm  → /api/admin/users/[id]/credits
//
// All three follow the same shape: optimistic-ish (button shows
// "Saving…"), router.refresh() on success to repaint the page with
// the new server state. Inline error text on failure. Confirmation
// dialogs for destructive actions (block, large credit clawbacks).
//
// Using router.refresh() rather than mutating local state keeps the
// page server-rendered and avoids the "stale view" problem if the
// admin opens the same user in two tabs.

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

interface RoleFormProps {
  userId: string;
  currentRole: "admin" | "user" | "installer";
  isSelf: boolean;
}

export function RoleForm({ userId, currentRole, isSelf }: RoleFormProps) {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "user" | "installer">(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const dirty = role !== currentRole;

  async function submit() {
    setError(null);
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Update failed");
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
        Role
      </label>
      <div className="flex items-center gap-2">
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          disabled={pending}
          className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        >
          <option value="user">User</option>
          <option value="installer">Installer</option>
          <option value="admin">Admin</option>
        </select>
        <button
          onClick={() => {
            void submit();
          }}
          disabled={!dirty || pending}
          className="h-9 px-4 rounded-lg bg-coral hover:bg-coral-dark text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {pending ? "Saving…" : "Save role"}
        </button>
      </div>
      {isSelf && (
        <p className="text-[11px] text-slate-400 mt-1">
          You can&rsquo;t demote yourself.
        </p>
      )}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

interface BlockedFormProps {
  userId: string;
  blocked: boolean;
  isSelf: boolean;
}

export function BlockedForm({ userId, blocked, isSelf }: BlockedFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    setError(null);
    const next = !blocked;
    if (next) {
      const ok = window.confirm(
        "Block this user? They will not be able to sign in until you unblock them.",
      );
      if (!ok) return;
    }
    const res = await fetch(`/api/admin/users/${userId}/blocked`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocked: next }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Update failed");
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div>
      <label className="block text-[11px] uppercase tracking-wider text-slate-400 mb-1">
        Account status
      </label>
      <button
        onClick={() => {
          void toggle();
        }}
        disabled={pending || isSelf}
        className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          blocked
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-rose-600 hover:bg-rose-700 text-white"
        }`}
      >
        {pending ? "Saving…" : blocked ? "Unblock account" : "Block account"}
      </button>
      {isSelf && (
        <p className="text-[11px] text-slate-400 mt-1">
          You can&rsquo;t block yourself.
        </p>
      )}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

interface CreditsFormProps {
  userId: string;
  currentBalance: number;
}

export function CreditsForm({ userId, currentBalance }: CreditsFormProps) {
  const router = useRouter();
  const [delta, setDelta] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const deltaNum = Number.parseInt(delta, 10);
  const deltaValid = Number.isFinite(deltaNum) && deltaNum !== 0;
  const reasonValid = reason.trim().length >= 3;
  const projected = deltaValid ? currentBalance + deltaNum : currentBalance;
  const wouldGoNegative = projected < 0;

  async function submit() {
    setError(null);
    if (!deltaValid || !reasonValid || wouldGoNegative) return;
    if (deltaNum < -1000 || deltaNum > 1000) {
      const ok = window.confirm(
        `That's a ${deltaNum > 0 ? "large grant" : "large clawback"} of ${Math.abs(deltaNum)} credits. Continue?`,
      );
      if (!ok) return;
    }
    const res = await fetch(`/api/admin/users/${userId}/credits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta: deltaNum, reason: reason.trim() }),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Adjustment failed");
      return;
    }
    setDelta("");
    setReason("");
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <label className="block text-[11px] uppercase tracking-wider text-slate-400">
        Adjust credits
      </label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          placeholder="±delta"
          className="h-9 w-24 px-3 rounded-lg border border-slate-200 bg-white text-sm text-navy focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
        />
        <span className="text-xs text-slate-500">
          {currentBalance}
          {deltaValid && (
            <>
              {" → "}
              <span className={wouldGoNegative ? "text-rose-600 font-semibold" : "text-navy font-semibold"}>
                {projected}
              </span>
            </>
          )}
        </span>
      </div>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (e.g. Goodwill credit for failed report)"
        maxLength={500}
        className="h-9 w-full px-3 rounded-lg border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
      />
      <button
        onClick={() => {
          void submit();
        }}
        disabled={!deltaValid || !reasonValid || wouldGoNegative || pending}
        className="h-9 px-4 rounded-lg bg-coral hover:bg-coral-dark text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {pending ? "Saving…" : "Apply adjustment"}
      </button>
      {wouldGoNegative && (
        <p className="text-xs text-rose-600">Would push balance below zero.</p>
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  );
}
