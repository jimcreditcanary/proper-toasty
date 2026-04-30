import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";

// Server-side role gate. Middleware already does this, but a layout-
// level check is cheap defense-in-depth — protects against
// middleware-matcher misconfiguration and the rare edge case of an
// auth race during deploy.

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/admin");

  const { data: profile } = await supabase
    .from("users")
    .select("role, blocked, email")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; blocked: boolean | null; email: string | null }>();

  if (profile?.blocked) redirect("/auth/login?error=blocked");
  if (profile?.role !== "admin") {
    // Send installers to their own portal, plain users to /dashboard.
    redirect(profile?.role === "installer" ? "/installer" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader email={profile.email ?? user.email} role="admin" />
      <main className="flex-1">{children}</main>
    </div>
  );
}
