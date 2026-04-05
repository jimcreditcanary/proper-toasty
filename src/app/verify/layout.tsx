import { SiteHeader } from "@/components/site-header";
import { createClient } from "@/lib/supabase/server";

export default async function VerifyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="dark flex min-h-screen flex-col bg-navy text-white">
      <SiteHeader email={user?.email} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
