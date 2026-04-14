"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/logo";

export function SiteHeader({
  email,
  role,
}: {
  email?: string;
  role?: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={email ? "/dashboard" : "/"} className="flex items-center">
          <Logo size="sm" variant="light" />
        </Link>
        {!email && (
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/enterprise" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Enterprise
            </Link>
            <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Blog
            </Link>
          </nav>
        )}
        <nav className="flex items-center gap-3">
          {email ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className="flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors outline-none text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    />
                  }
                >
                  <Avatar className="size-7 bg-slate-100 border border-slate-200">
                    <AvatarFallback className="text-xs text-coral bg-slate-100">
                      {email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200 text-slate-900">
                  <div className="px-2 py-1.5 text-xs text-slate-500">
                    {email}
                  </div>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem render={<Link href="/dashboard" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/dashboard/api" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    API
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/dashboard/billing" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    Billing
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <>
                      <DropdownMenuSeparator className="bg-slate-200" />
                      <DropdownMenuItem render={<Link href="/log" />} className="text-coral hover:text-coral focus:text-coral focus:bg-slate-100 font-medium">
                        Admin Log
                      </DropdownMenuItem>
                      <DropdownMenuItem render={<Link href="/dashboard/admin/blog" />} className="text-coral hover:text-coral focus:text-coral focus:bg-slate-100 font-medium">
                        Blog Manager
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button
                className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg shadow-sm hover:shadow-md transition-all"
                render={<Link href="/verify" />}
              >
                Make a check
              </Button>
              <Button
                variant="ghost"
                className="h-10 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                render={<Link href="/auth/login" />}
              >
                Sign in
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
