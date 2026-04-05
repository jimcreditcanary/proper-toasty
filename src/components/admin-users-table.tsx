"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Shield,
  ShieldOff,
  Ban,
  CheckCircle,
  Trash2,
  Users,
  ShieldAlert,
  UserX,
} from "lucide-react";
import type { AdminUserRow } from "@/app/dashboard/admin/users/page";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminUsersTable({
  users,
  currentUserId,
}: {
  users: AdminUserRow[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [users, search]);

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const blockedUsers = users.filter((u) => u.blocked).length;

  async function handleAction(
    userId: string,
    action: "toggleRole" | "toggleBlock" | "delete",
    currentRole?: string,
    currentBlocked?: boolean
  ) {
    setLoading(userId);
    try {
      if (action === "delete") {
        const res = await fetch("/api/admin/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to delete user");
          return;
        }
      } else if (action === "toggleRole") {
        const newRole = currentRole === "admin" ? "user" : "admin";
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, role: newRole }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to update role");
          return;
        }
      } else if (action === "toggleBlock") {
        const res = await fetch("/api/admin/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId, blocked: !currentBlocked }),
        });
        if (!res.ok) {
          const data = await res.json();
          alert(data.error || "Failed to update status");
          return;
        }
      }
      setConfirmDelete(null);
      router.refresh();
    } catch {
      alert("An error occurred");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Users, label: "Total users", value: totalUsers },
          { icon: ShieldAlert, label: "Admins", value: totalAdmins },
          { icon: UserX, label: "Blocked", value: blockedUsers },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl bg-white border border-slate-200 p-5"
          >
            <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-2">
              <stat.icon className="size-3.5" />
              {stat.label}
            </div>
            <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="mt-6 rounded-2xl bg-white border border-slate-200 overflow-hidden">
        {/* Search bar */}
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">All users</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {filtered.length} user{filtered.length === 1 ? "" : "s"}
                {search ? " matching search" : ""}
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-coral transition-colors"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="p-6">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="mb-3 size-10 text-slate-400/50" />
              <p className="text-sm font-medium text-slate-900">No users found</p>
              <p className="mt-1 text-xs text-slate-400">
                Try adjusting your search
              </p>
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="mt-3 text-sm text-coral hover:text-coral-light font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Credits
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Verifications
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Joined
                    </th>
                    <th className="text-right py-3 px-2 text-xs font-medium text-slate-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((user) => {
                    const isSelf = user.id === currentUserId;
                    const isLoading = loading === user.id;

                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="py-3 px-2">
                          <span className="font-medium text-slate-900">
                            {user.email}
                          </span>
                          {isSelf && (
                            <span className="ml-2 inline-flex items-center rounded-full bg-coral/5 border border-coral/20 px-2 py-0.5 text-[10px] font-medium text-coral">
                              You
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                              user.role === "admin"
                                ? "bg-coral/5 border-coral/20 text-coral"
                                : "bg-slate-100 border-slate-200 text-slate-500"
                            }`}
                          >
                            {user.role === "admin" && (
                              <Shield className="size-3" />
                            )}
                            {user.role === "admin" ? "Admin" : "User"}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-500">
                          {user.credits}
                        </td>
                        <td className="py-3 px-2 text-right font-mono text-slate-500">
                          {user.verification_count}
                        </td>
                        <td className="py-3 px-2">
                          {user.blocked ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200 px-2 py-0.5 text-[11px] font-medium text-red-700">
                              <Ban className="size-3" />
                              Blocked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                              <CheckCircle className="size-3" />
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-slate-500 whitespace-nowrap">
                          {formatDate(user.created_at)}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Toggle admin */}
                            {!isSelf && (
                              <button
                                onClick={() =>
                                  handleAction(
                                    user.id,
                                    "toggleRole",
                                    user.role
                                  )
                                }
                                disabled={isLoading}
                                title={
                                  user.role === "admin"
                                    ? "Remove admin"
                                    : "Make admin"
                                }
                                className={`h-9 px-3 text-sm rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                                  user.role === "admin"
                                    ? "bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                    : "bg-coral/5 border border-coral/20 text-coral hover:bg-coral/20"
                                }`}
                              >
                                {user.role === "admin" ? (
                                  <>
                                    <ShieldOff className="size-3.5" />
                                    <span className="hidden lg:inline">
                                      Remove Admin
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Shield className="size-3.5" />
                                    <span className="hidden lg:inline">
                                      Make Admin
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Toggle block */}
                            {!isSelf && (
                              <button
                                onClick={() =>
                                  handleAction(
                                    user.id,
                                    "toggleBlock",
                                    undefined,
                                    user.blocked
                                  )
                                }
                                disabled={isLoading}
                                title={
                                  user.blocked ? "Unblock user" : "Block user"
                                }
                                className={`h-9 px-3 text-sm rounded-lg font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 ${
                                  user.blocked
                                    ? "bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                                }`}
                              >
                                {user.blocked ? (
                                  <>
                                    <CheckCircle className="size-3.5" />
                                    <span className="hidden lg:inline">
                                      Unblock
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="size-3.5" />
                                    <span className="hidden lg:inline">
                                      Block
                                    </span>
                                  </>
                                )}
                              </button>
                            )}

                            {/* Delete */}
                            {!isSelf && (
                              <>
                                {confirmDelete === user.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() =>
                                        handleAction(user.id, "delete")
                                      }
                                      disabled={isLoading}
                                      className="h-9 px-3 text-sm rounded-lg font-medium inline-flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setConfirmDelete(null)}
                                      className="h-9 px-3 text-sm rounded-lg font-medium inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDelete(user.id)}
                                    disabled={isLoading}
                                    title="Delete user"
                                    className="h-9 px-3 text-sm rounded-lg font-medium inline-flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                                  >
                                    <Trash2 className="size-3.5" />
                                    <span className="hidden lg:inline">
                                      Delete
                                    </span>
                                  </button>
                                )}
                              </>
                            )}

                            {isSelf && (
                              <span className="text-xs text-slate-400 italic">
                                Current user
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
