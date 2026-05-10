import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteHeader } from "@/components/site-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Pull role so SiteHeader's account dropdown renders the right
  // menu (admins see Admin portal + Installer portal + Blog Manager;
  // installers see Installer portal; everyone else sees Dashboard).
  // Previously we passed only email, which collapsed the dropdown to
  // the homeowner branch even when an admin was on a /dashboard/*
  // page — so an admin on the blog manager saw "Dashboard" pointing
  // back to /dashboard, which was confusing + pointless. Service
  // role read because RLS would block a non-admin from reading their
  // own role row in some configs.
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null }>();

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader email={user.email} role={profile?.role ?? undefined} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
