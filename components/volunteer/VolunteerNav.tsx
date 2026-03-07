"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Trophy,
  Vote,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import L from "@/lib/labels";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: L.volunteer.nav.dashboard },
  { href: "/projects", icon: FolderOpen, label: L.volunteer.nav.projects },
  { href: "/voting", icon: Vote, label: L.volunteer.nav.voting },
  { href: "/leaderboard", icon: Trophy, label: L.volunteer.nav.leaderboard },
  { href: "/profile", icon: User, label: L.volunteer.nav.profile },
];

interface VolunteerNavProps {
  role: string;
  userId: string;
}

export function VolunteerNav({ role }: VolunteerNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    toast.success(L.volunteer.nav.signedOut);
    router.push("/login");
  }

  const isAdmin = role === "admin" || role === "leader";

  return (
    <>
      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg transition-colors min-w-[56px] min-h-[44px] justify-center",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className={cn("h-5 w-5", active && "fill-primary/10")} />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop sidebar */}
      <aside className="hidden md:fixed md:inset-y-0 md:left-0 md:flex md:w-64 md:flex-col border-r bg-background">
        <div className="flex h-16 items-center px-6 border-b">
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold text-primary tracking-tight">{L.brand.name}</span>
            <span className="text-[10px] text-muted-foreground">{L.brand.subtitle}</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            );
          })}

          {isAdmin && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {L.volunteer.nav.adminSection}
                </p>
              </div>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  pathname.startsWith("/admin")
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Settings className="h-5 w-5" />
                {L.volunteer.nav.adminPanel}
              </Link>
            </>
          )}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <LogOut className="h-5 w-5" />
            {L.volunteer.nav.signOut}
          </button>
        </div>
      </aside>
    </>
  );
}
