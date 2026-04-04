import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminUsersTable } from "@/components/admin-users-table";

export type AdminUserRow = {
  id: string;
  email: string;
  role: string;
  credits: number;
  blocked: boolean;
  created_at: string;
  verification_count: number;
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const admin = createAdminClient();

  // Verify admin role using admin client (bypasses RLS)
  const { data: currentUser } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  // Fetch all users
  const { data: users } = await admin
    .from("users")
    .select("id, email, role, credits, blocked, created_at")
    .order("created_at", { ascending: false });

  // Get verification counts per user
  const { data: verificationCounts } = await admin
    .from("verifications")
    .select("user_id");

  // Build a map of user_id -> count
  const countMap: Record<string, number> = {};
  if (verificationCounts) {
    for (const v of verificationCounts) {
      if (v.user_id) {
        countMap[v.user_id] = (countMap[v.user_id] || 0) + 1;
      }
    }
  }

  const rows: AdminUserRow[] = (users ?? []).map((u) => {
    const raw = u as Record<string, unknown>;
    return {
      id: raw.id as string,
      email: raw.email as string,
      role: (raw.role as string) ?? "user",
      credits: (raw.credits as number) ?? 0,
      blocked: (raw.blocked as boolean) ?? false,
      created_at: raw.created_at as string,
      verification_count: countMap[raw.id as string] ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">Users</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Manage all registered users
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6">
        <AdminUsersTable users={rows} currentUserId={user.id} />
      </div>
    </div>
  );
}
