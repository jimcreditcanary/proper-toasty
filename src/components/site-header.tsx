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
  variant = "dark",
}: {
  email?: string;
  role?: string;
  variant?: "dark" | "light";
}) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const isLight = variant === "light";

  return (
    <header
      className={
        isLight
          ? "bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50"
          : "bg-navy border-b border-white/[0.06]"
      }
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={email ? "/dashboard" : "/"} className="flex items-center">
          <Logo size="sm" variant={isLight ? "light" : "dark"} />
        </Link>
        <nav className="flex items-center gap-3">
          {email ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 text-sm transition-colors outline-none ${
                        isLight
                          ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          : "text-brand-muted-light hover:text-white hover:bg-white/[0.07]"
                      }`}
                    />
                  }
                >
                  <Avatar className={`size-7 ${isLight ? "bg-slate-100 border border-slate-200" : "bg-navy-card border border-white/10"}`}>
                    <AvatarFallback className={`text-xs ${isLight ? "text-coral bg-slate-100" : "text-coral bg-navy-card"}`}>
                      {email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{email}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-navy-card border-white/10 text-white">
                  <div className="px-2 py-1.5 text-xs text-brand-muted-light">
                    {email}
                  </div>
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem render={<Link href="/dashboard" />} className="text-brand-muted-light hover:text-white focus:text-white focus:bg-white/[0.07]">
                    Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link href="/dashboard/api" />} className="text-brand-muted-light hover:text-white focus:text-white focus:bg-white/[0.07]">
                    API
                  </DropdownMenuItem>
                  {role === "admin" && (
                    <>
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem render={<Link href="/log" />} className="text-coral hover:text-coral focus:text-coral focus:bg-white/[0.07] font-medium">
                        Admin Log
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator className="bg-white/[0.06]" />
                  <DropdownMenuItem onClick={handleSignOut} className="text-brand-muted-light hover:text-white focus:text-white focus:bg-white/[0.07]">
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              {isLight ? (
                <>
                  <Link
                    href="#how-it-works"
                    className="hidden sm:inline-flex text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    How it works
                  </Link>
                  <Link
                    href="#pricing"
                    className="hidden sm:inline-flex text-sm text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    Pricing
                  </Link>
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
              ) : (
                <>
                  <Button
                    className="h-11 bg-coral hover:bg-coral-dark text-white font-bold text-[15px] px-6 rounded-xl shadow-none hover:shadow-[0_4px_16px_rgba(255,92,53,0.4)] transition-all"
                    render={<Link href="/verify" />}
                  >
                    Make a check
                  </Button>
                  <Button
                    variant="ghost"
                    className="h-11 text-[15px] text-brand-muted-light hover:text-white hover:bg-white/[0.07] rounded-xl"
                    render={<Link href="/auth/login" />}
                  >
                    Sign in
                  </Button>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
