"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

const tabs = [
  { label: "Searches", href: "/log" },
  { label: "Users", href: "/log/users" },
  { label: "Performance", href: "/log/performance" },
  { label: "Settings", href: "/log/settings" },
] as const;

export function AdminNav({ email }: { email: string }) {
  const pathname = usePathname();

  return (
    <div className="flex items-center justify-between w-full">
      <nav className="flex items-center gap-1">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-brand-muted-light hover:text-white transition-colors mr-2"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
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

      <span className="text-sm text-brand-muted-light hidden sm:inline">
        {email}
      </span>
    </div>
  );
}
