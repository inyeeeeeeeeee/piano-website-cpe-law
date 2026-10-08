import type { SessionUser } from "@/lib/session";

/** Role helpers — server-side only, never exposed to the client unverified. */

export function isAdmin(user: Pick<SessionUser, "role"> | null | undefined): boolean {
  return user?.role === "ADMIN";
}

/**
 * Who may edit/delete a song (and therefore its versions & sections):
 *  • admins, always
 *  • the original contributor, but only while the song is not published
 *    (published catalogue edits stay with the editorial team).
 */
export function canManageSong(
  user: SessionUser | null,
  song: { createdById: string | null; status: string }
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return song.createdById === user.id && song.status !== "PUBLISHED";
}

/** Contributors may edit their own submission while it is under review. */
export function canEditOwnSubmission(
  user: SessionUser | null,
  song: { createdById: string | null }
): boolean {
  if (!user) return false;
  return isAdmin(user) || song.createdById === user.id;
}

export function canManageComment(
  user: SessionUser | null,
  comment: { userId: string }
): boolean {
  if (!user) return false;
  return isAdmin(user) || comment.userId === user.id;
}

export function canModerate(user: SessionUser | null): boolean {
  return isAdmin(user);
}
