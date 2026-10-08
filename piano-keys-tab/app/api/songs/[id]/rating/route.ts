import { withApi, ApiError } from "@/lib/api";
import { ratingSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { recomputeSongRating } from "@/lib/services";

async function loadPublishedSong(idOrSlug: string) {
  const song = await db.song.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, status: true, createdById: true },
  });
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");
  return song;
}

async function assertRateable(song: { status: string; createdById: string | null }, userId: string, role: string) {
  const allowed =
    song.status === "PUBLISHED" || song.createdById === userId || role === "ADMIN";
  if (!allowed) throw new ApiError("Song not found", 404, "NOT_FOUND");
}

/** POST /api/songs/:id/rating — create a rating (one per user & song). */
export const POST = withApi(
  async ({ params, body, user }) => {
    const song = await loadPublishedSong(params.id);
    await assertRateable(song, user!.id, user!.role);

    const existing = await db.rating.findUnique({
      where: { userId_songId: { userId: user!.id, songId: song.id } },
    });
    if (existing) {
      throw new ApiError("You have already rated this song — update it instead", 409, "ALREADY_RATED");
    }

    await db.rating.create({
      data: { userId: user!.id, songId: song.id, value: body.value },
    });
    await recomputeSongRating(song.id);

    return { ok: true, value: body.value };
  },
  { schema: ratingSchema, auth: "user", rate: "rating" }
);

/** PUT /api/songs/:id/rating — update an existing rating. */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const song = await loadPublishedSong(params.id);
    await assertRateable(song, user!.id, user!.role);

    const existing = await db.rating.findUnique({
      where: { userId_songId: { userId: user!.id, songId: song.id } },
    });
    if (!existing) {
      throw new ApiError("You have not rated this song yet", 404, "NO_RATING");
    }

    await db.rating.update({
      where: { id: existing.id },
      data: { value: body.value },
    });
    await recomputeSongRating(song.id);

    return { ok: true, value: body.value };
  },
  { schema: ratingSchema, auth: "user", rate: "rating" }
);

/** DELETE /api/songs/:id/rating */
export const DELETE = withApi(async ({ params, user }) => {
  const song = await loadPublishedSong(params.id);
  await db.rating.deleteMany({
    where: { userId: user!.id, songId: song.id },
  });
  await recomputeSongRating(song.id);
  return { ok: true };
}, { auth: "user", rate: "rating" });
