import { withApi, ApiError } from "@/lib/api";
import { reorderSchema } from "@/lib/validation";
import { db } from "@/lib/db";

/** PUT /api/songbooks/:id/reorder — persist the drag-and-drop order. */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const songbook = await db.songbook.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });
    if (!songbook) throw new ApiError("Songbook not found", 404, "NOT_FOUND");
    if (songbook.userId !== user!.id && user!.role !== "ADMIN") {
      throw new ApiError("This songbook does not belong to you", 403, "FORBIDDEN");
    }

    const rows = await db.songbookSong.findMany({
      where: { songbookId: params.id },
      select: { id: true, songId: true },
    });
    const bySongId = new Map(rows.map((r) => [r.songId, r.id]));

    // Only ids that actually belong to this songbook are accepted.
    const ordered = body.songIds.filter((id) => bySongId.has(id));
    const ops = ordered.map((songId, index) =>
      db.songbookSong.update({
        where: { id: bySongId.get(songId)! },
        data: { order: index },
      })
    );
    if (ops.length > 0) await db.$transaction(ops);

    return { ok: true, updated: ordered.length };
  },
  { schema: reorderSchema, auth: "user", rate: "mutation" }
);
