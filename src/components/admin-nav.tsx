"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

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
          className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mr-2"
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
                  ? "text-slate-900 border-b-2 border-coral"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-2">
        <Avatar className="size-7 bg-slate-50 border border-slate-200">
          <AvatarFallback className="text-xs text-coral bg-slate-50">
            {email?.charAt(0).toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm text-slate-500 hidden sm:inline">
          {email}
        </span>
      </div>
    </div>
  );
}
