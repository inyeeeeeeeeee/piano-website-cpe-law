import type { Prisma } from "@/generated/prisma/client";
import { searchable, slugify, randomSuffix } from "@/lib/utils";
import type { SearchParams } from "@/lib/validation";
import { db } from "@/lib/db";

/**
 * Song search: builds a Prisma `where` + `orderBy` from validated query
 * params. Matching is case-insensitive thanks to the denormalised lowercase
 * columns (searchTitle / searchTags / artist.searchName).
 */

export interface BuildSearchOptions {
  /** Include non-published songs (admin tables). */
  includeUnpublished?: boolean;
  /** Restrict to a single artist slug (artist detail page). */
  artistSlug?: string;
}

export function buildSongWhere(
  params: SearchParams,
  options: BuildSearchOptions = {}
): Prisma.SongWhereInput {
  const and: Prisma.SongWhereInput[] = [];

  if (!options.includeUnpublished) {
    and.push({ status: "PUBLISHED" });
  }

  if (params.q) {
    const q = searchable(params.q);
    and.push({
      OR: [
        { searchTitle: { contains: q } },
        { searchTags: { contains: q } },
        { album: { contains: params.q } },
        { attribution: { contains: params.q } },
        { artist: { searchName: { contains: q } } },
      ],
    });
  }

  if (params.difficulty) and.push({ difficulty: params.difficulty });
  if (params.key) and.push({ musicalKey: params.key });
  if (params.artist) and.push({ artist: { slug: params.artist } });
  if (params.tag) and.push({ searchTags: { contains: searchable(params.tag) } });
  if (params.minRating) and.push({ ratingAvg: { gte: params.minRating } });

  const bpm: Prisma.IntFilter = {};
  if (params.bpmMin !== undefined) bpm.gte = params.bpmMin;
  if (params.bpmMax !== undefined) bpm.lte = params.bpmMax;
  if (Object.keys(bpm).length > 0) and.push({ bpm });

  if (options.artistSlug) and.push({ artist: { slug: options.artistSlug } });

  return and.length > 0 ? { AND: and } : {};
}

export function buildSongOrderBy(
  sort: SearchParams["sort"]
): Prisma.SongOrderByWithRelationInput[] {
  switch (sort) {
    case "rating":
      return [
        { ratingAvg: "desc" },
        { ratingCount: "desc" },
        { viewCount: "desc" },
      ];
    case "recent":
      return [{ createdAt: "desc" }];
    case "alpha":
      return [{ title: "asc" }];
    case "difficulty":
      return [{ difficultyRank: "asc" }, { title: "asc" }];
    case "bpm":
      return [{ bpm: "asc" }, { title: "asc" }];
    case "popular":
    default:
      return [{ viewCount: "desc" }, { createdAt: "desc" }];
  }
}

/**
 * Returns a unique slug for an entity in `table` ("song" | "artist" |
 * "songbook"), appending a short random suffix when needed.
 */
export async function ensureUniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let attempts = 0;
  while (await exists(candidate)) {
    attempts += 1;
    candidate =
      attempts <= 3
        ? `${root}-${attempts}`
        : `${root}-${randomSuffix(4)}`;
    if (attempts > 20) {
      candidate = `${root}-${randomSuffix(8)}`;
      break;
    }
  }
  return candidate;
}

export async function uniqueSongSlug(title: string, excludeId?: string) {
  return ensureUniqueSlug(title, async (slug) => {
    const found = await db.song.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!found && found.id !== excludeId;
  });
}

export async function uniqueArtistSlug(name: string, excludeId?: string) {
  return ensureUniqueSlug(name, async (slug) => {
    const found = await db.artist.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!found && found.id !== excludeId;
  });
}
