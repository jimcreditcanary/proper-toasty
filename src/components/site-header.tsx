"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
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
        <Link
          href={
            !email
              ? "/"
              : role === "admin"
                ? "/admin"
                : role === "installer"
                  ? "/installer"
                  : "/dashboard"
          }
          className="flex items-center"
        >
          <Logo size="sm" variant="light" />
        </Link>
        {!email && (
          <nav className="hidden sm:flex items-center gap-6">
            <Link href="/enterprise" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              For installers
            </Link>
            <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Pricing
            </Link>
            <Link href="/blog" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Blog
            </Link>
          </nav>
        )}
        <nav className="flex items-center gap-3">
          {email ? (
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
                <div className="px-2 py-1.5 text-xs text-slate-500">{email}</div>
                <DropdownMenuSeparator className="bg-slate-200" />
                {/* Role-aware home link — admins land in /admin, installers
                    in /installer, everyone else in the legacy /dashboard.
                    Admins also get cross-portal links so they can
                    inspect the installer + homeowner views without
                    signing out. */}
                {role === "admin" ? (
                  <>
                    <DropdownMenuItem render={<Link href="/admin" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      Admin portal
                    </DropdownMenuItem>
                    {/* Cross-portal jump so admins can inspect the
                        installer surface without signing out. The
                        installer layout already permits admins. */}
                    <DropdownMenuItem render={<Link href="/installer" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                      Installer portal
                    </DropdownMenuItem>
                  </>
                ) : role === "installer" ? (
                  <DropdownMenuItem render={<Link href="/installer" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    Installer portal
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem render={<Link href="/dashboard" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                    Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem render={<Link href="/check" />} className="text-slate-500 hover:text-slate-900 focus:text-slate-900 focus:bg-slate-100">
                  New check
                </DropdownMenuItem>
                {role === "admin" && (
                  <>
                    <DropdownMenuSeparator className="bg-slate-200" />
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
          ) : (
            <>
              {/* Desktop: separate buttons. Mobile: hamburger menu —
                  the two buttons + the logo were cramming on narrow
                  phones and the "Start a check" copy was wrapping
                  to two lines inside the button. */}
              <div className="hidden sm:flex items-center gap-3">
                <Button
                  className="h-10 bg-coral hover:bg-coral-dark text-white font-semibold text-sm px-5 rounded-lg shadow-sm hover:shadow-md transition-all"
                  render={<Link href="/check" />}
                >
                  Start a check
                </Button>
                <Button
                  variant="ghost"
                  className="h-10 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                  render={<Link href="/auth/login" />}
                >
                  Sign in
                </Button>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <button
                      aria-label="Open menu"
                      className="sm:hidden inline-flex items-center justify-center h-11 w-11 rounded-lg text-slate-700 hover:bg-slate-100 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-coral"
                    />
                  }
                >
                  <Menu className="w-5 h-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="sm:hidden w-56 bg-white border-slate-200 text-slate-900"
                >
                  <DropdownMenuItem
                    render={<Link href="/check" />}
                    className="text-base text-coral-dark font-semibold focus:bg-coral-pale focus:text-coral-dark"
                  >
                    Start a check
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem
                    render={<Link href="/enterprise" />}
                    className="text-base text-slate-700 focus:bg-slate-100 focus:text-slate-900"
                  >
                    For installers
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="/pricing" />}
                    className="text-base text-slate-700 focus:bg-slate-100 focus:text-slate-900"
                  >
                    Pricing
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    render={<Link href="/blog" />}
                    className="text-base text-slate-700 focus:bg-slate-100 focus:text-slate-900"
                  >
                    Blog
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-200" />
                  <DropdownMenuItem
                    render={<Link href="/auth/login" />}
                    className="text-base text-slate-700 focus:bg-slate-100 focus:text-slate-900"
                  >
                    Sign in
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
