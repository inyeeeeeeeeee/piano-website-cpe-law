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
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

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

  if (!user || !user.isActive) return null;
  // SQLite has no enums: `role` comes back as a plain string.
  return { ...user, role: user.role === "ADMIN" ? "ADMIN" : "USER" };
}

/** Redirects anonymous visitors to /login. Use in protected pages. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Redirects anonymous visitors to /login and non-admins to /403. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/403");
  return user;
}
