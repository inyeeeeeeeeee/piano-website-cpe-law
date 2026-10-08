import { withApi, ApiError } from "@/lib/api";
import { db } from "@/lib/db";

/** DELETE /api/songbooks/:id/songs/:songId — remove a song from the book. */
export const DELETE = withApi(async ({ params, user }) => {
  const songbook = await db.songbook.findUnique({
    where: { id: params.id },
    select: { id: true, userId: true },
  });
  if (!songbook) throw new ApiError("Songbook not found", 404, "NOT_FOUND");
  if (songbook.userId !== user!.id && user!.role !== "ADMIN") {
    throw new ApiError("This songbook does not belong to you", 403, "FORBIDDEN");
  }

  await db.songbookSong.deleteMany({
    where: { songbookId: params.id, songId: params.songId },
  });

  // Re-pack remaining orders so the list stays contiguous.
  const remaining = await db.songbookSong.findMany({
    where: { songbookId: params.id },
    orderBy: { order: "asc" },
    select: { id: true },
  });
  await db.$transaction(
    remaining.map((row, index) =>
      db.songbookSong.update({ where: { id: row.id }, data: { order: index } })
    )
  );

  return { ok: true };
}, { auth: "user", rate: "mutation" });
