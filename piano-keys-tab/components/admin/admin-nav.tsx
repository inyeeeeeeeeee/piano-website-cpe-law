"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Flag,
  Inbox,
  LayoutDashboard,
  Library,
  MessageSquare,
  Music4,
  ScrollText,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  exact?: boolean;
  badge?: number;
}

const ITEMS: Array<Omit<NavItem, "badge">> = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/submissions", label: "Submissions", icon: Inbox },
  { href: "/admin/songs", label: "Songs", icon: Music4 },
  { href: "/admin/artists", label: "Artists", icon: Library },
  { href: "/admin/comments", label: "Comments", icon: MessageSquare },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, exact: false },
];

/** Section navigation for the admin area (client-side for the active state). */
export function AdminNav({
  pendingSubmissions,
  openReports,
}: {
  pendingSubmissions: number;
  openReports: number;
}) {
  const pathname = usePathname();

  const items: NavItem[] = ITEMS.map((item) => ({
    ...item,
    badge:
      item.href === "/admin/submissions"
        ? pendingSubmissions
        : item.href === "/admin/reports"
          ? openReports
          : undefined,
  }));

  return (
    <nav aria-label="Admin" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="flex gap-1 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <li key={item.href} className="shrink-0">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span>{item.label}</span>
                {item.badge ? (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 hidden items-center gap-2 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground lg:flex">
        <Activity className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
        Every action here is recorded in the audit log.
      </p>
    </nav>
  );
}
