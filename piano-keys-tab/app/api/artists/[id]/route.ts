import { withApi, ApiError } from "@/lib/api";
import { artistSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { searchable } from "@/lib/utils";
import { writeAudit } from "@/lib/services";

async function findArtist(idOrSlug: string) {
  return db.artist.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      _count: { select: { songs: { where: { status: "PUBLISHED" } } } },
    },
  });
}

/** GET /api/artists/:id (id or slug) with published-song stats. */
export const GET = withApi(async ({ params }) => {
  const artist = await findArtist(params.id);
  if (!artist) throw new ApiError("Artist not found", 404, "NOT_FOUND");
  return { artist };
});

/** PUT /api/artists/:id — admin only. */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const artist = await findArtist(params.id);
    if (!artist) throw new ApiError("Artist not found", 404, "NOT_FOUND");

    const updated = await db.artist.update({
      where: { id: artist.id },
      data: {
        name: body.name,
        searchName: searchable(body.name),
        biography: body.biography,
        image: body.image,
      },
    });
    await writeAudit(user!.id, "ADMIN_EDITED_ARTIST", "Artist", artist.id, {
      name: updated.name,
    });
    return { artist: updated };
  },
  { schema: artistSchema, auth: "admin", rate: "mutation" }
);

/**
 * DELETE /api/artists/:id — admin only.
 * Songs (and everything below them) cascade at the database level; the admin
 * UI asks for an explicit confirmation before calling this.
 */
export const DELETE = withApi(async ({ params, user }) => {
  const artist = await findArtist(params.id);
  if (!artist) throw new ApiError("Artist not found", 404, "NOT_FOUND");

  const songCount = await db.song.count({ where: { artistId: artist.id } });
  await db.artist.delete({ where: { id: artist.id } });

  await writeAudit(user!.id, "ADMIN_DELETED_ARTIST", "Artist", artist.id, {
    name: artist.name,
    cascadeSongs: songCount,
  });

  return { ok: true, deletedSongs: songCount };
}, { auth: "admin", rate: "mutation" });
