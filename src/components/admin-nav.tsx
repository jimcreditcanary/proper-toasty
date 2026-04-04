"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

const tabs = [
  { label: "Searches", href: "/log" },
  { label: "Users", href: "/log/users" },
  { label: "Performance", href: "/log/performance" },
  { label: "Settings", href: "/log/settings" },
] as const;

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center justify-between w-full">
      <nav className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/log"
              ? pathname === "/log"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                isActive
                  ? "text-white border-b-2 border-coral"
                  : "text-brand-muted-light hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3">
        <span className="text-sm text-brand-muted-light hidden sm:inline">
          {email}
        </span>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-1.5 text-sm text-brand-muted-light hover:text-white transition-colors"
        >
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </div>
  );
}
