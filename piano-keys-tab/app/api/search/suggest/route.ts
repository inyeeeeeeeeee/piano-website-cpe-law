import { withApi } from "@/lib/api";
import { db } from "@/lib/db";
import { searchable } from "@/lib/utils";

/**
 * GET /api/search/suggest?q=… — grouped autocomplete for the header search.
 * Returns a maximum of 5 artists and 5 songs.
 */
export const GET = withApi(
  async ({ req }) => {
    const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
    if (q.length < 1) return { artists: [], songs: [] };

    const [artists, songs] = await Promise.all([
      db.artist.findMany({
        where: { searchName: { contains: searchable(q) } },
        take: 5,
        select: { name: true, slug: true, _count: { select: { songs: true } } },
      }),
      db.song.findMany({
        where: {
          status: "PUBLISHED",
          OR: [
            { searchTitle: { contains: searchable(q) } },
            { searchTags: { contains: searchable(q) } },
          ],
        },
        take: 5,
        select: {
          title: true,
          slug: true,
          difficulty: true,
          artist: { select: { name: true, slug: true } },
        },
      }),
    ]);

    return { artists, songs };
  },
  { rate: "search" }
);
