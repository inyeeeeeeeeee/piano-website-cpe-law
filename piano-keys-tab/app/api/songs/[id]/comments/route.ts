import { NextResponse } from "next/server";
import { withApi, ApiError } from "@/lib/api";
import { commentSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { createNotification } from "@/lib/services";

async function loadSong(idOrSlug: string) {
  return db.song.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    select: { id: true, slug: true, title: true, status: true, createdById: true },
  });
}

/**
 * GET /api/songs/:id/comments — paginated.
 * Non-admins only ever see APPROVED comments; moderators get `?status=…`.
 */
export const GET = withApi(async ({ req, params, user }) => {
  const song = await loadSong(params.id);
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

  const isAdmin = user?.role === "ADMIN";
  const visible =
    song.status === "PUBLISHED" || isAdmin || song.createdById === user?.id;
  if (!visible) throw new ApiError("Song not found", 404, "NOT_FOUND");

  const page = Math.max(1, Number.parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10) || 1);
  const statusParam = req.nextUrl.searchParams.get("status");
  const pageSize = 20;

  const where = {
    songId: song.id,
    ...(isAdmin && statusParam ? { status: statusParam } : { status: "APPROVED" }),
  };

  const [total, comments] = await Promise.all([
    db.comment.count({ where }),
    db.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
      },
    }),
  ]);

  // Attach the commenter's rating of this song, when they left one.
  const userIds = comments.map((c) => c.user.id);
  const ratings = userIds.length
    ? await db.rating.findMany({
        where: { songId: song.id, userId: { in: userIds } },
        select: { userId: true, value: true },
      })
    : [];
  const ratingByUser = new Map(ratings.map((r) => [r.userId, r.value]));

  return {
    items: comments.map((c) => ({
      ...c,
      rating: ratingByUser.get(c.user.id) ?? null,
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
});

/** POST /api/songs/:id/comments — authenticated, rate-limited. */
export const POST = withApi(
  async ({ params, body, user }) => {
    const song = await loadSong(params.id);
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

    const allowed =
      song.status === "PUBLISHED" || song.createdById === user!.id || user!.role === "ADMIN";
    if (!allowed) throw new ApiError("Song not found", 404, "NOT_FOUND");

    const comment = await db.comment.create({
      data: { userId: user!.id, songId: song.id, content: body.content },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    });

    if (song.createdById && song.createdById !== user!.id) {
      await createNotification(song.createdById, {
        type: "COMMENT",
        title: `New comment on "${song.title}"`,
        body: `${user!.username} commented on your arrangement.`,
        link: `/songs/${song.slug}`,
      });
    }

    return NextResponse.json({ comment }, { status: 201 });
  },
  { schema: commentSchema, auth: "user", rate: "comment" }
);
