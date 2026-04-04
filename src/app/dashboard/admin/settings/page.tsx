import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminSettingsForm } from "@/components/admin-settings-form";

export type AdminSettingRow = {
  key: string;
  value: number;
  updated_at: string | null;
};

export default async function AdminSettingsPage() {
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

  const { data: settingsData } = await admin
    .from("admin_settings")
    .select("key, value, updated_at");

  const settings: AdminSettingRow[] = (settingsData ?? []).map((row) => {
    const raw = row as Record<string, unknown>;
    return {
      key: raw.key as string,
      value: Number(raw.value),
      updated_at: (raw.updated_at as string) ?? null,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl text-white">Settings</h1>
          <p className="text-sm text-brand-muted-light mt-1">
            Manage platform cost parameters
          </p>
        </div>
      </div>

      <div className="mt-6">
        <AdminSettingsForm settings={settings} />
      </div>
    </div>
  );
}
