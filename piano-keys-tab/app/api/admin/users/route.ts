import { z } from "zod";
import { withApi } from "@/lib/api";
import { db } from "@/lib/db";
import { searchable } from "@/lib/utils";

const querySchema = z.object({
  q: z.string().trim().max(120).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  sort: z.enum(["recent", "alpha", "songs"]).catch("recent").default("recent"),
});

/** GET /api/admin/users — paginated user management table. */
export const GET = withApi(
  async ({ req }) => {
    const params = querySchema.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    const and: Record<string, unknown>[] = [];
    if (params.q) {
      const q = searchable(params.q);
      and.push({
        OR: [
          { username: { contains: q } },
          { email: { contains: q } },
        ],
      });
    }
    if (params.role) and.push({ role: params.role });
    if (params.status) and.push({ isActive: params.status === "active" });

    const where = and.length > 0 ? { AND: and } : {};
    const orderBy =
      params.sort === "alpha"
        ? { username: "asc" as const }
        : params.sort === "songs"
          ? { songs: { _count: "desc" as const } }
          : { createdAt: "desc" as const };

    const pageSize = 20;
    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy,
        skip: (params.page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              songs: true,
              comments: true,
              ratings: true,
              songbooks: true,
            },
          },
        },
      }),
    ]);

    return {
      items: users,
      total,
      page: params.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  { auth: "admin" }
);
