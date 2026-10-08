import { withApi, ApiError } from "@/lib/api";
import { moderationSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { notifySubmissionDecision, writeAudit } from "@/lib/services";

/**
 * PATCH /api/admin/submissions/:id — moderate a song submission.
 *  status: PUBLISHED (approve) | REJECTED (reject) |
 *          PENDING (request changes) | ARCHIVED
 * Approving/rejecting updates every version of the song to the same status and
 * notifies the contributor.
 */
export const PATCH = withApi(
  async ({ params, body, user }) => {
    const song = await db.song.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, slug: true, status: true, createdById: true },
    });
    if (!song) throw new ApiError("Submission not found", 404, "NOT_FOUND");

    const updated = await db.$transaction(async (tx) => {
      const s = await tx.song.update({
        where: { id: song.id },
        data: { status: body.status },
      });
      await tx.songVersion.updateMany({
        where: { songId: song.id },
        data: { status: body.status },
      });
      return s;
    });

    await notifySubmissionDecision(song, body.status, body.note);
    await writeAudit(user!.id, "ADMIN_MODERATED_SUBMISSION", "Song", song.id, {
      title: song.title,
      from: song.status,
      to: body.status,
      note: body.note,
    });

    return { song: { id: updated.id, status: updated.status } };
  },
  { schema: moderationSchema, auth: "admin", rate: "mutation" }
);
