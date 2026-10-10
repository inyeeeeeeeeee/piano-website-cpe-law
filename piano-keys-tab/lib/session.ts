import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/constants";

export interface SessionUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar: string | null;
  isActive: boolean;
}

/**
 * Returns the *database-fresh* user behind the current session, or null.
 *
 * The session cookie only proves identity; role, activity status and profile
 * data are always re-read from SQLite so a revoked/disabled/demoted account
 * loses access immediately — never trusting what is stored client-side.
 */
async function resolveUser(): Promise<{ user: SessionUser | null; stale: boolean }> {
  const session = await auth();
  const id = session?.user?.id;
  // No cookie (or an unsigned session) — a normal anonymous visitor.
  if (!id) return { user: null, stale: false };

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      avatar: true,
      isActive: true,
    },
  });

  // Cookie is valid but its user is gone or disabled (e.g. the database was
  // rebuilt under the deployment). Flag it as *stale* so the guards can clear
  // the cookie instead of redirecting into a proxy/guard ping-pong.
  if (!user || !user.isActive) return { user: null, stale: true };

  // SQLite has no enums: `role` comes back as a plain string.
  return {
    user: { ...user, role: user.role === "ADMIN" ? "ADMIN" : "USER" },
    stale: false,
  };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  return (await resolveUser()).user;
}

/**
 * Signed cookie whose user no longer exists: send the browser through the
 * logout route so the cookie is actually removed before it lands on /login.
 * Without this, `proxy.ts` (cookie ⇒ "signed in") and this guard (no user ⇒
 * /login) would bounce forever and the browser stops with a redirect error.
 */
const STALE_SESSION_TARGET = "/api/auth/logout?redirect=/login";

/** Redirects anonymous visitors to /login. Use in protected pages. */
export async function requireUser(): Promise<SessionUser> {
  const { user, stale } = await resolveUser();
  if (!user) redirect(stale ? STALE_SESSION_TARGET : "/login");
  return user;
}

/** Redirects anonymous visitors to /login and non-admins to /403. */
export async function requireAdmin(): Promise<SessionUser> {
  const { user, stale } = await resolveUser();
  if (!user) redirect(stale ? STALE_SESSION_TARGET : "/login");
  if (user.role !== "ADMIN") redirect("/403");
  return user;
}
