import { NextResponse } from "next/server";
import { withApi, ApiError } from "@/lib/api";
import { songbookSongSchema } from "@/lib/validation";
import { db } from "@/lib/db";

async function loadOwnedSongbook(id: string, userId: string, isAdmin: boolean) {
  const songbook = await db.songbook.findUnique({ where: { id } });
  if (!songbook) throw new ApiError("Songbook not found", 404, "NOT_FOUND");
  if (songbook.userId !== userId && !isAdmin) {
    throw new ApiError("This songbook does not belong to you", 403, "FORBIDDEN");
  }
  return songbook;
}

/** POST /api/songbooks/:id/songs — add a song (appends to the end). */
export const POST = withApi(
  async ({ params, body, user }) => {
    await loadOwnedSongbook(params.id, user!.id, user!.role === "ADMIN");

    const song = await db.song.findUnique({
      where: { id: body.songId },
      select: { id: true, status: true },
    });
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

    const existing = await db.songbookSong.findUnique({
      where: { songbookId_songId: { songbookId: params.id, songId: song.id } },
    });
    if (existing) {
      throw new ApiError("That song is already in this songbook", 409, "ALREADY_ADDED");
    }

    const count = await db.songbookSong.count({ where: { songbookId: params.id } });
    await db.songbookSong.create({
      data: { songbookId: params.id, songId: song.id, order: count },
    });

    return NextResponse.json({ ok: true, order: count }, { status: 201 });
  },
  { schema: songbookSongSchema, auth: "user", rate: "mutation" }
);
