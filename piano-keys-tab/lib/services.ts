import "server-only";
import { db } from "@/lib/db";
import { DIFFICULTY_META, isDifficulty } from "@/lib/constants";

/**
 * Small, reusable domain operations shared by API routes and pages.
 * All writes go through Prisma (parameterised queries — no raw SQL string
 * concatenation anywhere in the app).
 */

/** 1..5 intensity for sorting/filtering. */
export function difficultyRank(difficulty: string): number {
  return isDifficulty(difficulty)
    ? DIFFICULTY_META[difficulty].intensity
    : 3;
}

/** Recalculate and cache the denormalised rating columns of a song. */
export async function recomputeSongRating(songId: string): Promise<void> {
  const agg = await db.rating.aggregate({
    where: { songId },
    _avg: { value: true },
    _count: { value: true },
  });
  await db.song.update({
    where: { id: songId },
    data: {
      ratingAvg: Math.round((agg._avg.value ?? 0) * 10) / 10,
      ratingCount: agg._count.value,
    },
  });
}

/** Bump the public view counter and store the view for "recently viewed". */
export async function recordSongView(
  songId: string,
  userId?: string | null
): Promise<void> {
  await db.$transaction([
    db.song.update({
      where: { id: songId },
      data: { viewCount: { increment: 1 } },
    }),
    db.songView.create({ data: { songId, userId: userId ?? null } }),
  ]);
}

export interface NotificationInput {
  type: "INFO" | "SUBMISSION" | "COMMENT" | "RATING" | "SYSTEM";
  title: string;
  body?: string;
  link?: string;
}

export async function createNotification(
  userId: string,
  input: NotificationInput
): Promise<void> {
  await db.notification.create({
    data: { userId, ...input },
  });
}

/** Append an admin action to the audit trail (§49). */
export async function writeAudit(
  adminId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await db.auditLog.create({
    data: {
      adminId,
      action,
      entityType,
      entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
    },
  });
}

/** Notify the contributor about a submission decision. */
export async function notifySubmissionDecision(
  song: { id: string; title: string; slug: string; createdById: string | null },
  decision: "PUBLISHED" | "REJECTED" | "PENDING" | "ARCHIVED",
  note?: string
): Promise<void> {
  if (!song.createdById) return;
  const map = {
    PUBLISHED: {
      title: `"${song.title}" was approved`,
      body: "Your arrangement is now live in the catalogue.",
      link: `/songs/${song.slug}`,
    },
    REJECTED: {
      title: `"${song.title}" was not approved`,
      body: note || "An editor left notes on your submission.",
      link: "/dashboard",
    },
    PENDING: {
      title: `Changes requested for "${song.title}"`,
      body: note || "An editor requested changes to your submission.",
      link: "/dashboard",
    },
    ARCHIVED: {
      title: `"${song.title}" was archived`,
      body: note || "An administrator archived your submission.",
      link: "/dashboard",
    },
  } as const;
  await createNotification(song.createdById, {
    type: "SUBMISSION",
    ...map[decision],
  });
}

/**
 * Load (or lazily create) a user's display settings. Used to hydrate the
 * practice-mode preferences.
 */
export async function getOrCreateSettings(userId: string) {
  const existing = await db.userSettings.findUnique({ where: { userId } });
  if (existing) return existing;
  return db.userSettings.create({ data: { userId } });
}

/** Unread notification count for the header badge. */
export async function unreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, isRead: false } });
}
