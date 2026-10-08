import { NextResponse } from "next/server";
import { withApi, ApiError } from "@/lib/api";
import { versionSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { canManageSong } from "@/lib/permissions";
import { createVersionWithSections } from "@/lib/repo";

async function loadSong(idOrSlug: string) {
  return db.song.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
  });
}

/** GET /api/songs/:id/versions — every version with sections + arrangements. */
export const GET = withApi(async ({ params, user }) => {
  const song = await loadSong(params.id);
  if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

  const visible =
    song.status === "PUBLISHED" ||
    user?.role === "ADMIN" ||
    song.createdById === user?.id;
  if (!visible) throw new ApiError("Song not found", 404, "NOT_FOUND");

  const versions = await db.songVersion.findMany({
    where: { songId: song.id },
    orderBy: { order: "asc" },
    include: {
      sections: {
        orderBy: { order: "asc" },
        include: { arrangement: true },
      },
      createdBy: { select: { id: true, username: true } },
    },
  });

  return { versions };
});

/**
 * POST /api/songs/:id/versions — add a new arrangement version.
 * Admins choose the status; contributors' versions always enter review.
 */
export const POST = withApi(
  async ({ params, body, user }) => {
    const actor = user!;
    const song = await loadSong(params.id);
    if (!song) throw new ApiError("Song not found", 404, "NOT_FOUND");

    if (!canManageSong(actor, song)) {
      throw new ApiError("You do not have permission to edit this song", 403, "FORBIDDEN");
    }

    const isAdminActor = actor.role === "ADMIN";
    const status = isAdminActor ? (body.status ?? song.status) : "PENDING";

    const versionId = await db.$transaction(async (tx) =>
      createVersionWithSections(
        tx,
        song.id,
        { ...body, status },
        actor.id,
        status
      )
    );

    return NextResponse.json({ version: { id: versionId, status } }, { status: 201 });
  },
  { schema: versionSchema, auth: "user", rate: "mutation" }
);
