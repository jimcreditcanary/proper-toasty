import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";

// Server-side role gate. Mirrors the admin layout — redundant with
// the middleware but cheap defense-in-depth.
//
// Path-based exception: /installer/acknowledge is the magic-link
// landing page from the booking notification email. That page has its
// own HMAC-token verification and must remain reachable without an
// authenticated session, so we don't gate it here. We simply don't
// nest it inside this layout — the file lives at
// `app/installer/acknowledge/page.tsx` and Next routing tree only
// applies layouts to pages that import them.
//
// (Specifically: this layout will gate any page added under
// app/installer/<feature>/page.tsx going forward, which is what we
// want for I1+.)

export default async function InstallerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/installer");

  const { data: profile } = await supabase
    .from("users")
    .select("role, blocked, email")
    .eq("id", user.id)
    .maybeSingle<{ role: string | null; blocked: boolean | null; email: string | null }>();

  if (profile?.blocked) redirect("/auth/login?error=blocked");
  // Admins can access /installer too — handy for support / debugging.
  if (profile?.role !== "installer" && profile?.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900">
      <SiteHeader email={profile.email ?? user.email} role={profile.role ?? undefined} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
