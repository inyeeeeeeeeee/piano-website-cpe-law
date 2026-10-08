import { withApi, ApiError } from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { canManageComment } from "@/lib/permissions";

async function loadComment(id: string) {
  return db.comment.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      song: { select: { id: true, slug: true, title: true } },
    },
  });
}

/** PUT /api/comments/:id — authors edit their own comment, admins may edit any. */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const comment = await loadComment(params.id);
    if (!comment) throw new ApiError("Comment not found", 404, "NOT_FOUND");

    if (!canManageComment(user, comment)) {
      throw new ApiError("You can only edit your own comments", 403, "FORBIDDEN");
    }

    const updated = await db.comment.update({
      where: { id: comment.id },
      data: { content: body.content },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    return { comment: updated };
  },
  { schema: commentSchema, auth: "user", rate: "comment" }
);

/** DELETE /api/comments/:id */
export const DELETE = withApi(async ({ params, user }) => {
  const comment = await loadComment(params.id);
  if (!comment) throw new ApiError("Comment not found", 404, "NOT_FOUND");

  if (!canManageComment(user, comment)) {
    throw new ApiError("You can only delete your own comments", 403, "FORBIDDEN");
  }

  await db.comment.delete({ where: { id: comment.id } });
  return { ok: true };
}, { auth: "user", rate: "mutation" });
