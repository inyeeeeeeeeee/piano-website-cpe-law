import { withApi, ApiError } from "@/lib/api";
import { updateSongSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { canManageSong } from "@/lib/permissions";
import {
  resolveArtist,
  songDerivedFields,
} from "@/lib/repo";
import { createNotification, writeAudit } from "@/lib/services";

async function findSong(idOrSlug: string) {
  return db.song.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      artist: true,
      createdBy: { select: { id: true, username: true } },
      versions: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { arrangement: true },
          },
        },
      },
      _count: {
        select: {
          comments: { where: { status: "APPROVED" } },
          ratings: true,
          savedBy: true,
        },
      },
    },
  });
}

/** GET /api/songs/:id — accepts either the id or the slug. */
export const GET = withApi(async ({ params, user }) => {
  const song = await findSong(params.id);
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

  const isAdmin = user?.role === "ADMIN";
  const isOwner = !!user && song.createdById === user.id;
  if (song.status !== "PUBLISHED" && !isAdmin && !isOwner) {
    // Do not reveal the existence of unpublished content.
    throw new ApiError("Song not found", 404, "NOT_FOUND");
  }

  return { song };
});

/** PUT /api/songs/:id — update song metadata (contributors & admins). */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const actor = user!;
    const song = await db.song.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
    });
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

    if (!canManageSong(actor, song)) {
      throw new ApiError("You do not have permission to edit this song", 403, "FORBIDDEN");
    }

    const statusChanged = body.status !== undefined && body.status !== song.status;
    const featureChanged =
      body.isFeatured !== undefined && body.isFeatured !== song.isFeatured;
    if ((statusChanged || featureChanged) && actor.role !== "ADMIN") {
      throw new ApiError(
        "Only administrators can publish, archive or feature songs",
        403,
        "FORBIDDEN"
      );
    }

    const artistId =
      body.artistId || body.newArtistName
        ? await resolveArtist({
            artistId: body.artistId,
            newArtistName: body.newArtistName,
          })
        : song.artistId;

    const updated = await db.song.update({
      where: { id: song.id },
      data: {
        ...songDerivedFields(body),
        artistId,
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.isFeatured !== undefined ? { isFeatured: body.isFeatured } : {}),
      },
    });

    if (actor.role === "ADMIN" && (statusChanged || featureChanged)) {
      await writeAudit(actor.id, "ADMIN_UPDATED_SONG", "Song", song.id, {
        from: song.status,
        to: updated.status,
        featured: updated.isFeatured,
      });
    }

    return { song: { id: updated.id, slug: updated.slug, status: updated.status } };
  },
  { schema: updateSongSchema, auth: "user", rate: "mutation" }
);

/** DELETE /api/songs/:id — admins always; contributors for their own drafts. */
export const DELETE = withApi(async ({ params, user }) => {
  const actor = user!;
  const song = await db.song.findFirst({
    where: { OR: [{ id: params.id }, { slug: params.id }] },
  });
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

  if (!canManageSong(actor, song)) {
    throw new ApiError("You do not have permission to delete this song", 403, "FORBIDDEN");
  }

  // Foreign keys cascade (verified): versions → sections → arrangements,
  // ratings, comments, saved songs, songbook links and views are removed too.
  await db.song.delete({ where: { id: song.id } });

  if (
    actor.role === "ADMIN" &&
    song.createdById &&
    song.createdById !== actor.id
  ) {
    await createNotification(song.createdById, {
      type: "SUBMISSION",
      title: `"${song.title}" was removed`,
      body: "An administrator removed your submission from the catalogue.",
      link: "/dashboard",
    });
  }

  if (actor.role === "ADMIN") {
    await writeAudit(actor.id, "ADMIN_DELETED_SONG", "Song", song.id, {
      title: song.title,
      slug: song.slug,
    });
  }

  return { ok: true };
}, { auth: "user", rate: "mutation" });
