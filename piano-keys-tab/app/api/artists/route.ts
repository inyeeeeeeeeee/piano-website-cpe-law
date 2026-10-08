import { NextResponse } from "next/server";
import { z } from "zod";
import { withApi, ApiError } from "@/lib/api";
import { artistSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { searchable } from "@/lib/utils";
import { uniqueArtistSlug } from "@/lib/search";
import { writeAudit } from "@/lib/services";

const listQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  sort: z.enum(["alpha", "popular", "recent"]).catch("alpha").default("alpha"),
});

/** GET /api/artists — searchable, paginated artist index. */
export const GET = withApi(
  async ({ req }) => {
    const params = listQuerySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    const where = params.q
      ? { searchName: { contains: searchable(params.q) } }
      : {};

    const orderBy =
      params.sort === "recent"
        ? ({ createdAt: "desc" } as const)
        : params.sort === "popular"
          ? ({ songs: { _count: "desc" } } as const)
          : ({ name: "asc" } as const);

    const pageSize = 24;
    const [total, artists] = await Promise.all([
      db.artist.count({ where }),
      db.artist.findMany({
        where,
        orderBy,
        skip: (params.page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          biography: true,
          createdAt: true,
          _count: {
            select: { songs: { where: { status: "PUBLISHED" } } },
          },
        },
      }),
    ]);

    return {
      items: artists,
      total,
      page: params.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  { rate: "search" }
);

/** POST /api/artists — admin-only artist creation. */
export const POST = withApi(
  async ({ body, user }) => {
    const searchName = searchable(body.name);
    const existing = await db.artist.findFirst({ where: { searchName } });
    if (existing) {
      throw new ApiError("An artist with that name already exists", 409, "ARTIST_EXISTS");
    }

    const slug = await uniqueArtistSlug(body.name);
    const artist = await db.artist.create({
      data: { name: body.name, searchName, slug, biography: body.biography, image: body.image },
    });
    await writeAudit(user!.id, "ADMIN_CREATED_ARTIST", "Artist", artist.id, {
      name: artist.name,
    });

    return NextResponse.json({ artist }, { status: 201 });
  },
  { schema: artistSchema, auth: "admin", rate: "mutation" }
);
