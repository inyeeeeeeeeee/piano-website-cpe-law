import { withApi, ApiError } from "@/lib/api";
import { adminUserUpdateSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { createNotification, recomputeSongRating, writeAudit } from "@/lib/services";

/**
 * PATCH /api/admin/users/:id — change role / enable-disable an account.
 * Admins can never change their *own* role or disable themselves (lock-out
 * protection); role values are validated server-side against USER | ADMIN.
 */
export const PATCH = withApi(
  async ({ params, body, user }) => {
    const actor = user!;
    if (params.id === actor.id) {
      if (body.role !== undefined && body.role !== actor.role) {
        throw new ApiError("You cannot change your own role", 403, "SELF_ROLE");
      }
      if (body.isActive === false) {
        throw new ApiError("You cannot disable your own account", 403, "SELF_DISABLE");
      }
    }

    const target = await db.user.findUnique({
      where: { id: params.id },
      select: { id: true, username: true, role: true, isActive: true },
    });
    if (!target) throw new ApiError("User not found", 404, "NOT_FOUND");

    const updated = await db.user.update({
      where: { id: target.id },
      data: {
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    await writeAudit(actor.id, "ADMIN_UPDATED_USER", "User", target.id, {
      username: target.username,
      role: { from: target.role, to: updated.role },
      isActive: { from: target.isActive, to: updated.isActive },
    });

    if (body.isActive === false && target.isActive) {
      await createNotification(target.id, {
        type: "SYSTEM",
        title: "Your account has been disabled",
        body: "Contact support if you believe this is a mistake.",
        link: "/",
      });
    }

    return { user: updated };
  },
  { schema: adminUserUpdateSchema, auth: "admin", rate: "mutation" }
);

/**
 * DELETE /api/admin/users/:id — remove an account.
 * Database cascades remove their songbooks, ratings, comments and saved songs;
 * songs they authored survive (createdById → NULL) and their cached ratings
 * are recomputed afterwards.
 */
export const DELETE = withApi(async ({ params, user }) => {
  const actor = user!;
  if (params.id === actor.id) {
    throw new ApiError("You cannot delete your own account", 403, "SELF_DELETE");
  }

  const target = await db.user.findUnique({
    where: { id: params.id },
    select: { id: true, username: true, role: true },
  });
  if (!target) throw new ApiError("User not found", 404, "NOT_FOUND");

  const ratings = await db.rating.findMany({
    where: { userId: target.id },
    select: { songId: true },
  });
  const songIds = Array.from(new Set(ratings.map((r) => r.songId)));

  await db.user.delete({ where: { id: target.id } });

  // Rating aggregates were stored per song — refresh those affected by the
  // cascade.
  await Promise.all(songIds.map((id) => recomputeSongRating(id)));

  await writeAudit(actor.id, "ADMIN_DELETED_USER", "User", target.id, {
    username: target.username,
    role: target.role,
  });

  return { ok: true };
}, { auth: "admin", rate: "mutation" });
