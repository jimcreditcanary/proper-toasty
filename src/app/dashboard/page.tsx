import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("credits")
    .eq("id", user.id)
    .single();

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">
        Welcome, {user.email}. You have{" "}
        <strong>{profile?.credits ?? 0}</strong> credits remaining.
      </p>
      {/* UI will be built here: upload form, scan history table, etc. */}
    </div>
  );
}
