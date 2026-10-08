import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { songbookSchema } from "@/lib/validation";
import { db } from "@/lib/db";

const include = {
  songs: {
    orderBy: { order: "asc" as const },
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
          coverImage: true,
          status: true,
          artist: { select: { name: true, slug: true } },
        },
      },
    },
  },
  _count: { select: { songs: true } },
};

/** GET /api/songbooks — the caller's songbooks (admins may pass ?userId=). */
export const GET = withApi(async ({ req, user }) => {
  const userIdParam = req.nextUrl.searchParams.get("userId");
  const targetId =
    user!.role === "ADMIN" && userIdParam ? userIdParam : user!.id;

  const songbooks = await db.songbook.findMany({
    where: { userId: targetId },
    orderBy: { updatedAt: "desc" },
    include,
  });
  return { items: songbooks };
}, { auth: "user" });

/** POST /api/songbooks — create. */
export const POST = withApi(
  async ({ body, user }) => {
    const songbook = await db.songbook.create({
      data: { userId: user!.id, ...body },
      include,
    });
    return NextResponse.json({ songbook }, { status: 201 });
  },
  { schema: songbookSchema, auth: "user", rate: "mutation" }
);
