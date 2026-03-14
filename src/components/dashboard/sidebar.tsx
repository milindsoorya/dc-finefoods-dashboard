"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";
import {
  LayoutDashboard,
  Wheat,
  Cog,
  BarChart3,
  ShieldCheck,
  Package,
  Warehouse,
  Ship,
  Users,
  History,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  userRole: UserRole;
  userName: string;
}

const allNavItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/intake", label: "Raw Intake", icon: Wheat, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/processing", label: "Processing", icon: Cog, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/grading", label: "Grading", icon: BarChart3, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/quality", label: "Quality Check", icon: ShieldCheck, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/packaging", label: "Packaging", icon: Package, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/warehouse", label: "Warehouse", icon: Warehouse, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/shipments", label: "Shipments", icon: Ship, roles: ["worker", "manager", "stakeholder"] },
  { href: "/dashboard/users", label: "Users", icon: Users, roles: ["manager"] },
  { href: "/dashboard/audit", label: "Audit Log", icon: History, roles: ["manager"] },
];

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const supabase = createClient();

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(userRole)
  );

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const roleLabel = {
    worker: "Worker",
    manager: "Manager",
    stakeholder: "Stakeholder",
  }[userRole];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-bold text-primary">DC Fine Foods</h1>
        <p className="text-xs text-muted-foreground">Internal Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
          Pipeline
        </p>
        {navItems.filter(i => !["Users", "Audit Log"].includes(i.label)).map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
              {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
            </Link>
          );
        })}
        {navItems.some(i => ["Users", "Audit Log"].includes(i.label)) && (
          <>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2 mt-4">
              Admin
            </p>
            {navItems.filter(i => ["Users", "Audit Log"].includes(i.label)).map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius)] text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                  {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* User info + Logout */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground">{roleLabel}</p>
          </div>
        </div>
        <Link
          href="/dashboard/settings"
          onClick={() => setMobileOpen(false)}
          className={cn(
            "flex items-center gap-2 text-sm w-full px-2 py-1.5 rounded transition-colors",
            pathname === "/dashboard/settings"
              ? "text-primary font-medium"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-destructive w-full px-2 py-1.5 rounded transition-colors cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-card border border-border rounded-[var(--radius)] p-2 shadow-sm cursor-pointer"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
