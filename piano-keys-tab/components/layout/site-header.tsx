"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  User as UserIcon,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE, MAIN_NAV } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Dropdown, MenuLabel, MenuSeparator, MenuItem } from "@/components/ui/dropdown";
import { Logo } from "@/components/layout/logo";
import { SearchBar } from "@/components/layout/search-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { NotificationBell } from "@/components/layout/notification-bell";

export interface HeaderUser {
  id: string;
  username: string;
  role: "USER" | "ADMIN";
  avatar: string | null;
}

/**
 * Global site header. The session itself is resolved on the server (root
 * layout) and passed down — the client never decides who is logged in.
 */
export function SiteHeader({
  user,
  unread,
}: {
  user: HeaderUser | null;
  unread: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // Close the drawer whenever navigation happens.
  useEffect(() => setMobileOpen(false), [pathname]);

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      router.replace("/");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        <Logo />

        <nav aria-label="Main" className="ml-4 hidden items-center gap-0.5 lg:flex">
          {MAIN_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary-soft text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <SearchBar className="hidden w-64 md:block xl:w-80" />
          <ThemeToggle />
          {user ? (
            <>
              <NotificationBell initialUnread={unread} />
              <Dropdown
                label="Account menu"
                trigger={(props) => (
                  <button
                    {...props}
                    type="button"
                    aria-label="Account menu"
                    className="inline-flex items-center gap-1 rounded-lg p-1 transition-colors hover:bg-muted"
                  >
                    <Avatar name={user.username} src={user.avatar} size={30} />
                  </button>
                )}
              >
                {(close) => (
                  <div className="w-56">
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Avatar name={user.username} src={user.avatar} size={32} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {user.username}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {user.role === "ADMIN" ? "Administrator" : "Member"}
                        </p>
                      </div>
                    </div>
                    <MenuSeparator />
                    <MenuLabel>My account</MenuLabel>
                    <MenuItem
                      icon={<LayoutDashboard aria-hidden="true" className="h-4 w-4" />}
                      onSelect={() => {
                        close();
                        router.push("/dashboard");
                      }}
                    >
                      Dashboard
                    </MenuItem>
                    <MenuItem
                      icon={<UserIcon aria-hidden="true" className="h-4 w-4" />}
                      onSelect={() => {
                        close();
                        router.push("/profile");
                      }}
                    >
                      Profile
                    </MenuItem>
                    <MenuItem
                      icon={<Settings aria-hidden="true" className="h-4 w-4" />}
                      onSelect={() => {
                        close();
                        router.push("/settings");
                      }}
                    >
                      Settings
                    </MenuItem>
                    {user.role === "ADMIN" ? (
                      <>
                        <MenuSeparator />
                        <MenuItem
                          icon={
                            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
                          }
                          onSelect={() => {
                            close();
                            router.push("/admin");
                          }}
                        >
                          Admin dashboard
                        </MenuItem>
                      </>
                    ) : null}
                    <MenuSeparator />
                    <MenuItem
                      danger
                      disabled={loggingOut}
                      icon={<LogOut aria-hidden="true" className="h-4 w-4" />}
                      onSelect={() => void logout()}
                    >
                      {loggingOut ? "Signing out…" : "Log out"}
                    </MenuItem>
                  </div>
                )}
              </Dropdown>
            </>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className={buttonClasses("ghost", "sm")}>
                Log in
              </Link>
              <Link href="/register" className={buttonClasses("primary", "sm")}>
                Register
              </Link>
            </div>
          )}

          {/* Mobile drawer trigger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-nav"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? (
              <X aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Menu aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div
          id="mobile-nav"
          className="border-t border-border bg-background px-4 pb-6 pt-4 shadow-lg lg:hidden"
        >
          <SearchBar className="mb-4 w-full md:hidden" />
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {MAIN_NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-primary-soft text-primary"
                    : "text-foreground hover:bg-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 border-t border-border pt-4">
            {user ? (
              <div className="flex flex-col gap-1">
                <Link
                  href="/dashboard"
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Dashboard
                </Link>
                <Link
                  href="/songbooks"
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  My songbooks
                </Link>
                <Link
                  href="/submit-song"
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Submit a song
                </Link>
                <Link
                  href="/profile"
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Profile
                </Link>
                <Link
                  href="/settings"
                  className="rounded-md px-3 py-2.5 text-sm font-medium hover:bg-muted"
                >
                  Settings
                </Link>
                {user.role === "ADMIN" ? (
                  <Link
                    href="/admin"
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-muted"
                  >
                    Admin dashboard
                  </Link>
                ) : null}
                <Button
                  variant="outline"
                  className="mt-2 justify-start"
                  onClick={() => void logout()}
                  disabled={loggingOut}
                >
                  <LogOut aria-hidden="true" className="h-4 w-4" />
                  {loggingOut ? "Signing out…" : `Log out (${user.username})`}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link href="/login" className={buttonClasses("outline", "md", "w-full")}>
                  Log in
                </Link>
                <Link href="/register" className={buttonClasses("primary", "md", "w-full")}>
                  Create free account
                </Link>
              </div>
            )}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {APP_NAME} — {APP_TAGLINE}
          </p>
        </div>
      ) : null}
    </header>
  );
}
