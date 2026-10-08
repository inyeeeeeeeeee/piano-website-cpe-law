import { withApi, ApiError } from "@/lib/api";
import { saveBodySchema } from "@/lib/validation";
import { db } from "@/lib/db";

async function loadSong(idOrSlug: string) {
  return db.song.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, status: true, createdById: true },
  });
}

/**
 * POST /api/songs/:id/save — save a song (heart it).
 * Optionally also places it into a specific songbook owned by the caller.
 */
export const POST = withApi(
  async ({ params, body, user }) => {
    const song = await loadSong(params.id);
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");
    if (song.status !== "PUBLISHED" && user!.role !== "ADMIN" && song.createdById !== user!.id) {
      throw new ApiError("Song not found", 404, "NOT_FOUND");
    }

    await db.savedSong.upsert({
      where: { userId_songId: { userId: user!.id, songId: song.id } },
      create: { userId: user!.id, songId: song.id },
      update: {},
    });

    if (body?.songbookId) {
      const songbook = await db.songbook.findUnique({
        where: { id: body.songbookId },
        select: { id: true, userId: true },
      });
      if (!songbook || (songbook.userId !== user!.id && user!.role !== "ADMIN")) {
        throw new ApiError("Songbook not found", 404, "SONGBOOK_NOT_FOUND");
      }
      const count = await db.songbookSong.count({
        where: { songbookId: songbook.id },
      });
      await db.songbookSong.upsert({
        where: {
          songbookId_songId: { songbookId: songbook.id, songId: song.id },
        },
        create: { songbookId: songbook.id, songId: song.id, order: count },
        update: {},
      });
    }

    return { saved: true };
  },
  { schema: saveBodySchema, auth: "user", rate: "mutation" }
);

/** DELETE /api/songs/:id/save — remove from saved songs. */
export const DELETE = withApi(async ({ params, user }) => {
  const song = await loadSong(params.id);
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

  await db.savedSong.deleteMany({
    where: { userId: user!.id, songId: song.id },
  });
  return { saved: false };
}, { auth: "user", rate: "mutation" });
