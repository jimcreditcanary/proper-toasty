import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/logo";
import { AdminNav } from "@/components/admin-nav";

export default async function LogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    .select("role, email")
    .eq("id", user.id)
    .single();

  if (!currentUser || currentUser.role !== "admin") {
    redirect("/dashboard");
  }

  const email = (currentUser.email as string) ?? user.email ?? "";

  return (
    <div className="min-h-screen bg-navy">
      {/* Header */}
      <header className="bg-navy border-b border-white/[0.06]">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/dashboard" className="flex items-center shrink-0">
            <Logo size="sm" variant="dark" />
          </Link>
          <AdminNav email={email} />
        </div>
      </header>

      {/* Page content */}
      {children}
    </div>
  );
}
