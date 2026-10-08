import { NextResponse } from "next/server";
import { withApi, ApiError } from "@/lib/api";
import { createSongSchema, searchParamsSchema } from "@/lib/validation";
import { buildSongOrderBy, buildSongWhere } from "@/lib/search";
import {
  createVersionWithSections,
  resolveArtist,
  songDerivedFields,
  uniqueSongSlug,
} from "@/lib/repo";
import { db } from "@/lib/db";
import { notificationForNewSubmission } from "@/lib/notifications";
import { PAGE_SIZE } from "@/lib/constants";
import { writeAudit } from "@/lib/services";

/**
 * GET /api/songs — paginated, filterable, sortable catalogue search.
 * Anonymous/public callers only ever see PUBLISHED songs.
 */
export const GET = withApi(
  async ({ req, user }) => {
    const raw = Object.fromEntries(req.nextUrl.searchParams.entries());
    const params = searchParamsSchema.parse(raw);

    const wantsAll = raw.scope === "all";
    const includeUnpublished = wantsAll && user?.role === "ADMIN";

    const where = buildSongWhere(params, { includeUnpublished });
    const orderBy = buildSongOrderBy(params.sort);
    const pageSize = PAGE_SIZE;
    const page = params.page;

    const [total, songs] = await Promise.all([
      db.song.count({ where }),
      db.song.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          musicalKey: true,
          bpm: true,
          duration: true,
          coverImage: true,
          ratingAvg: true,
          ratingCount: true,
          viewCount: true,
          status: true,
          isFeatured: true,
          tags: true,
          createdAt: true,
          artist: { select: { id: true, name: true, slug: true } },
        },
      }),
    ]);

    // Personalisation: which of these are saved by the current user.
    let savedIds: string[] = [];
    if (user) {
      const saved = await db.savedSong.findMany({
        where: { userId: user.id, songId: { in: songs.map((s) => s.id) } },
        select: { songId: true },
      });
      savedIds = saved.map((s) => s.songId);
    }

    return {
      items: songs.map((s) => ({ ...s, saved: savedIds.includes(s.id) })),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  { rate: "search" }
);

/**
 * POST /api/songs — create a song.
 *  • Admins create catalogue entries (default status: PUBLISHED).
 *  • Regular users submit arrangements — always stored as PENDING for review,
 *    regardless of any status value sent by the client.
 */
export const POST = withApi(
  async ({ body, user }) => {
    const actor = user!;
    const isAdminActor = actor.role === "ADMIN";

    if (!isAdminActor && !body.acknowledge) {
      throw new ApiError(
        "Please confirm you have the right to share this arrangement",
        400,
        "ACKNOWLEDGE_REQUIRED"
      );
    }

    const artistId = await resolveArtist({
      artistId: body.artistId,
      newArtistName: body.newArtistName,
    });

    const status = isAdminActor ? (body.status ?? "PUBLISHED") : "PENDING";
    const isFeatured = isAdminActor ? (body.isFeatured ?? false) : false;
    const slug = await uniqueSongSlug(body.title);

    const song = await db.$transaction(async (tx) => {
      const created = await tx.song.create({
        data: {
          ...songDerivedFields(body),
          slug,
          artistId,
          status,
          isFeatured,
          createdById: actor.id,
        },
      });

      if (body.version) {
        await createVersionWithSections(
          tx,
          created.id,
          {
            ...body.version,
            status: isAdminActor ? (body.version.status ?? status) : "PENDING",
          },
          actor.id,
          status
        );
      }

      return created;
    });

    if (!isAdminActor) {
      await notificationForNewSubmission(actor.id, song.title);
    } else {
      await writeAudit(actor.id, "ADMIN_CREATED_SONG", "Song", song.id, {
        title: song.title,
        status,
      });
    }

    return NextResponse.json(
      { song: { id: song.id, slug: song.slug, status: song.status } },
      { status: 201 }
    );
  },
  { schema: createSongSchema, auth: "user", rate: "submit" }
);
