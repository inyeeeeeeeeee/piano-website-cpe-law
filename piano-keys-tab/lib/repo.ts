import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { uniqueArtistSlug, uniqueSongSlug } from "@/lib/search";
import { difficultyRank } from "@/lib/services";
import { normalizeTags, searchable } from "@/lib/utils";
import { notificationForNewSubmission } from "@/lib/notifications";

type Tx = Prisma.TransactionClient;

export interface ArtistRefInput {
  artistId?: string;
  newArtistName?: string;
}

/**
 * Resolve (or lazily create) the artist for a song payload.
 * Creating an artist whose name already exists re-uses the existing record so
 * the artist list never fragments into near-duplicates.
 */
export async function resolveArtist(input: ArtistRefInput): Promise<string> {
  if (input.newArtistName) {
    const name = input.newArtistName.trim();
    const searchName = searchable(name);
    const existing = await db.artist.findFirst({ where: { searchName } });
    if (existing) return existing.id;

    const slug = await uniqueArtistSlug(name);
    const artist = await db.artist.create({
      data: { name, searchName, slug },
    });
    return artist.id;
  }

  if (input.artistId) {
    const artist = await db.artist.findUnique({
      where: { id: input.artistId },
      select: { id: true },
    });
    if (!artist) {
      throw new ApiError("That artist does not exist", 404, "ARTIST_NOT_FOUND");
    }
    return artist.id;
  }

  throw new ApiError(
    "Choose an existing artist or create a new one",
    400,
    "ARTIST_REQUIRED"
  );
}

/** Generate a unique song slug for the given title. */
export { uniqueSongSlug };

export interface SectionPayload {
  name: string;
  content?: string;
  events?: unknown[];
}

export interface VersionPayload {
  name: string;
  description?: string;
  difficulty: string;
  musicalKey: string;
  bpm: number;
  status?: string;
  order?: number;
  sections?: SectionPayload[];
}

/**
 * Persist a song version together with its sections and arrangements inside
 * an existing transaction.
 */
export async function createVersionWithSections(
  tx: Tx,
  songId: string,
  data: VersionPayload,
  createdById: string | null,
  fallbackStatus: string
): Promise<string> {
  const version = await tx.songVersion.create({
    data: {
      songId,
      name: data.name,
      description: data.description,
      difficulty: data.difficulty,
      musicalKey: data.musicalKey,
      bpm: data.bpm,
      status: data.status ?? fallbackStatus,
      order: data.order ?? 0,
      createdById,
    },
  });

  const sections = data.sections ?? [];
  for (const [index, section] of sections.entries()) {
    const created = await tx.songSection.create({
      data: {
        versionId: version.id,
        name: section.name,
        order: index + 1,
      },
    });
    await tx.arrangement.create({
      data: {
        sectionId: created.id,
        content: section.content ?? "",
        structuredData: JSON.stringify(section.events ?? []),
      },
    });
  }

  return version.id;
}

/** Replace every section (and arrangement) of an existing version. */
export async function replaceVersionSections(
  tx: Tx,
  versionId: string,
  sections: SectionPayload[]
): Promise<void> {
  await tx.songSection.deleteMany({ where: { versionId } });
  for (const [index, section] of sections.entries()) {
    const created = await tx.songSection.create({
      data: { versionId, name: section.name, order: index + 1 },
    });
    await tx.arrangement.create({
      data: {
        sectionId: created.id,
        content: section.content ?? "",
        structuredData: JSON.stringify(section.events ?? []),
      },
    });
  }
}

export interface SongPayload {
  title: string;
  album?: string;
  releaseYear?: number;
  difficulty: string;
  musicalKey: string;
  bpm: number;
  duration?: number;
  description?: string;
  tags?: string;
  coverImage?: string;
  attribution?: string;
  source?: string;
  license?: string;
  copyright?: string;
}

/** Columns shared by create/update that are derived from the raw payload. */
export function songDerivedFields(payload: SongPayload) {
  const tags = normalizeTags(payload.tags ?? "");
  return {
    title: payload.title,
    searchTitle: searchable(payload.title),
    album: payload.album,
    releaseYear: payload.releaseYear,
    difficulty: payload.difficulty,
    difficultyRank: difficultyRank(payload.difficulty),
    musicalKey: payload.musicalKey,
    bpm: payload.bpm,
    duration: payload.duration,
    description: payload.description,
    tags,
    searchTags: tags,
    coverImage: payload.coverImage,
    attribution: payload.attribution,
    source: payload.source,
    license: payload.license,
    copyright: payload.copyright,
  };
}

export { notificationForNewSubmission };
