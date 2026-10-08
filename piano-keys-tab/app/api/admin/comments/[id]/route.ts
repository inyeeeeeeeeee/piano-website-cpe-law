import { withApi, ApiError } from "@/lib/api";
import { commentModerationSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/services";

/** PATCH /api/admin/comments/:id — change a comment's moderation status. */
export const PATCH = withApi(
  async ({ params, body, user }) => {
    const comment = await db.comment.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, content: true },
    });
    if (!comment) throw new ApiError("Comment not found", 404, "NOT_FOUND");

    const updated = await db.comment.update({
      where: { id: comment.id },
      data: { status: body.status },
    });

    await writeAudit(user!.id, "ADMIN_MODERATED_COMMENT", "Comment", comment.id, {
      from: comment.status,
      to: body.status,
    });

    return { comment: updated };
  },
  { schema: commentModerationSchema, auth: "admin", rate: "mutation" }
);

/** DELETE /api/admin/comments/:id — hard-remove a comment. */
export const DELETE = withApi(async ({ params, user }) => {
  const comment = await db.comment.findUnique({
    where: { id: params.id },
    select: { id: true, content: true },
  });
  if (!comment) throw new ApiError("Comment not found", 404, "NOT_FOUND");

  await db.comment.delete({ where: { id: comment.id } });
  await writeAudit(user!.id, "ADMIN_DELETED_COMMENT", "Comment", comment.id, {
    preview: comment.content.slice(0, 80),
  });

  return { ok: true };
}, { auth: "admin", rate: "mutation" });
