import { z } from "zod";
import { withApi, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/services";

const schema = z
  .object({
    status: z
      .enum(["DRAFT", "PENDING", "PUBLISHED", "REJECTED", "ARCHIVED"])
      .optional(),
    isFeatured: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.isFeatured !== undefined, {
    message: "Nothing to update",
  });

/**
 * PATCH /api/admin/songs/:id — partial catalogue edits from the admin table
 * (publish / archive / feature) without resending the whole song payload.
 *
 * Status changes are mirrored onto every version of the song so a published
 * song never contains a non-published version, and every change is audited.
 */
export const PATCH = withApi(
  async ({ params, body, user }) => {
    const song = await db.song.findUnique({
      where: { id: params.id },
      select: { id: true, title: true, status: true, isFeatured: true },
    });
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

    const statusChanged = body.status !== undefined && body.status !== song.status;
    const featureChanged =
      body.isFeatured !== undefined && body.isFeatured !== song.isFeatured;

    await db.$transaction(async (tx) => {
      await tx.song.update({
        where: { id: song.id },
        data: {
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
        },
      });
      if (statusChanged && body.status) {
        await tx.songVersion.updateMany({
          where: { songId: song.id },
          data: { status: body.status },
        });
      }
    });

    await writeAudit(user!.id, "ADMIN_UPDATED_SONG", "Song", song.id, {
      title: song.title,
      ...(statusChanged ? { from: song.status, to: body.status } : {}),
      ...(featureChanged ? { featured: { from: song.isFeatured, to: body.isFeatured } } : {}),
    });

    return { ok: true };
  },
  { schema, auth: "admin", rate: "mutation" }
);
