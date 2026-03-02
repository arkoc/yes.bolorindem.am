"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderOpen,
  Users,
  ClipboardList,
  Star,
  ArrowLeft,
  Menu,
  X,
} from "lucide-react";
import L from "@/lib/labels";

const navItems = [
  { href: "/admin", icon: LayoutDashboard, label: L.admin.nav.dashboard, exact: true },
  { href: "/admin/projects", icon: FolderOpen, label: L.admin.nav.projects },
  { href: "/admin/users", icon: Users, label: L.admin.nav.users },
  { href: "/admin/completions", icon: ClipboardList, label: L.admin.nav.completions },
  { href: "/admin/points", icon: Star, label: L.admin.nav.pointGrants },
];

export function AdminNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const navContent = (
    <>
      <div className="flex h-16 items-center px-6 border-b gap-3 shrink-0">
        <div className="flex flex-col leading-tight flex-1">
          <span className="text-lg font-bold text-primary tracking-tight">{L.brand.name}</span>
          <span className="text-[10px] text-muted-foreground">{L.brand.adminSubtitle}</span>
        </div>
        <button
          className="md:hidden p-1 rounded hover:bg-accent"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map(({ href, icon: Icon, label, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t shrink-0">
        <Link
          href="/dashboard"
          onClick={() => setOpen(false)}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
          {L.admin.nav.backToApp}
        </Link>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 border-b bg-background flex items-center px-4 gap-3">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 rounded-md hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-primary tracking-tight">{L.brand.adminMobileTitle}</span>
      </div>

      {/* Mobile overlay backdrop */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full w-64 border-r bg-background flex flex-col z-50 transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {navContent}
      </aside>
    </>
  );
}
