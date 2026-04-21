import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  // The public.users wrapper (credits, role, api_key) gets reintroduced in
  // Phase 3 — for now there's no role-based UI to gate.
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader email={user.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
