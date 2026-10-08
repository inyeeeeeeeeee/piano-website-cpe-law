import { withApi, ApiError } from "@/lib/api";
import { songbookSchema } from "@/lib/validation";
import { db } from "@/lib/db";

async function loadOwnedSongbook(id: string, userId: string, isAdmin: boolean) {
  const songbook = await db.songbook.findUnique({ where: { id } });
  if (!songbook) throw new ApiError("Songbook not found", 404, "NOT_FOUND");
  if (songbook.userId !== userId && !isAdmin) {
    throw new ApiError("This songbook does not belong to you", 403, "FORBIDDEN");
  }
  return songbook;
}

/** GET /api/songbooks/:id — with ordered songs. */
export const GET = withApi(async ({ params, user }) => {
  const songbook = await loadOwnedSongbook(params.id, user!.id, user!.role === "ADMIN");
  const full = await db.songbook.findUnique({
    where: { id: songbook.id },
    include: {
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              musicalKey: true,
              bpm: true,
              ratingAvg: true,
              ratingCount: true,
              viewCount: true,
              coverImage: true,
              status: true,
              tags: true,
              artist: { select: { name: true, slug: true } },
            },
          },
        },
      },
      _count: { select: { songs: true } },
    },
  });
  return { songbook: full };
});

/** PUT /api/songbooks/:id — rename / describe. */
export const PUT = withApi(
  async ({ params, body, user }) => {
    await loadOwnedSongbook(params.id, user!.id, user!.role === "ADMIN");
    const songbook = await db.songbook.update({
      where: { id: params.id },
      data: body,
    });
    return { songbook };
  },
  { schema: songbookSchema, auth: "user", rate: "mutation" }
);

/** DELETE /api/songbooks/:id — songs themselves are unaffected. */
export const DELETE = withApi(async ({ params, user }) => {
  await loadOwnedSongbook(params.id, user!.id, user!.role === "ADMIN");
  await db.songbook.delete({ where: { id: params.id } });
  return { ok: true };
}, { auth: "user", rate: "mutation" });
