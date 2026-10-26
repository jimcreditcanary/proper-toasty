"use client";

// Dialog launched from the "New user" button on /admin/users.
//
// Flow:
//   1. Admin types email + picks a role.
//   2. Optionally clicks "Pick installer" to attach a company — opens
//      the shared InstallerPicker modal, selection stashes to state.
//   3. Submit → POST /api/admin/users/create → server creates the auth
//      user, flips must_change_password, binds the installer if one
//      was picked, and returns the generated temp password.
//   4. We swap the dialog for the temp-password reveal with Copy,
//      same style the row action uses.

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import {
  Building2,
  KeyRound,
  Loader2,
  UserPlus,
  X,
} from "lucide-react";
import { InstallerPicker, type InstallerResult } from "./installer-picker";

interface Props {
  onClose: () => void;
}

type Role = "user" | "installer" | "admin";

export function NewUserDialog({ onClose }: Props) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [installer, setInstaller] = useState<InstallerResult | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Picking an installer implies the new user should land as role=installer.
  // Admin can still override by changing the role select afterwards.
  function onInstallerPicked(i: InstallerResult) {
    setInstaller(i);
    setRole("installer");
    setPickerOpen(false);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Email required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          installer_id: installer?.id ?? null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(j.error ?? "Create failed");
        return;
      }
      setTempPassword(j.password);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  async function copyTempPassword() {
    if (!tempPassword) return;
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fine — the password is already visible on screen.
    }
  }

  if (!mounted) return null;

  // Password-reveal screen after a successful create.
  if (tempPassword) {
    return createPortal(
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50"
        onClick={onClose}
      >
        <div
          className="w-full max-w-sm rounded-2xl bg-white border border-slate-200 p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-2 mb-2">
            <KeyRound className="w-5 h-5 text-coral" />
            <h2 className="text-base font-semibold text-navy">
              User created
            </h2>
          </div>
          <p className="text-xs text-slate-600 mb-4">
            Share this with <span className="font-medium">{email}</span>.
            They&apos;ll be forced to pick a new password on first login.
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
            onClick={onClose}
            className="mt-5 w-full h-9 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>,
      document.body,
    );
  }

  // Primary create form.
  return (
    <>
      {createPortal(
        <div
          className="fixed inset-0 z-[55] flex items-center justify-center p-4 bg-slate-900/50"
          onClick={onClose}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-coral" />
                <h2 className="text-base font-semibold text-navy">
                  New user
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={submit} className="p-4 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="new-user-email"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  Email
                </label>
                <input
                  ref={emailRef}
                  id="new-user-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                  autoComplete="off"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 bg-white text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:border-coral focus:ring-2 focus:ring-coral/20"
                />
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Role
                </span>
                <div className="flex gap-2">
                  {(
                    [
                      { key: "user", label: "Homeowner" },
                      { key: "installer", label: "Installer" },
                      { key: "admin", label: "Admin" },
                    ] as { key: Role; label: string }[]
                  ).map((r) => {
                    const active = role === r.key;
                    return (
                      <button
                        key={r.key}
                        type="button"
                        onClick={() => setRole(r.key)}
                        className={`flex-1 h-9 rounded-xl text-xs font-semibold transition-colors ${
                          active
                            ? "bg-coral text-white"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {r.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Installer binding
                </span>
                {installer ? (
                  <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-amber-200 bg-amber-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <Building2 className="w-4 h-4 text-amber-700 shrink-0" />
                      <span className="text-sm font-medium text-navy truncate">
                        {installer.company_name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setInstaller(null)}
                      className="text-[11px] font-semibold text-slate-500 hover:text-rose-700"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-coral/40 hover:text-coral transition-colors"
                  >
                    <Building2 className="w-4 h-4" />
                    Pick installer (optional)
                  </button>
                )}
                <p className="text-[11px] text-slate-400">
                  Picking an installer gives this user portal access alongside
                  anyone already bound to the same installer.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl bg-coral hover:bg-coral-dark text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create user
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {pickerOpen && (
        <InstallerPicker
          heading="Pick installer"
          subheading="The new user will be bound to this installer on creation."
          pickLabel="Select →"
          onClose={() => setPickerOpen(false)}
          onPick={onInstallerPicked}
        />
      )}
    </>
  );
}
