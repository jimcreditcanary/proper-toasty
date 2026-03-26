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

export function SiteHeader({ email }: { email?: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href={email ? "/dashboard" : "/"} className="font-bold text-lg">
          WhoAmIPaying
        </Link>
        <nav className="flex items-center gap-2">
          {email ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-muted outline-none" />
                }
              >
                <Avatar className="size-7">
                  <AvatarFallback className="text-xs">
                    {email[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline text-muted-foreground">
                  {email}
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-xs text-muted-foreground">
                  {email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem render={<Link href="/dashboard" />}>
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" render={<Link href="/auth/login" />}>
                Sign in
              </Button>
              <Button size="sm" render={<Link href="/auth/signup" />}>
                Get started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
