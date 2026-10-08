import { z } from "zod";
import { withApi } from "@/lib/api";
import { db } from "@/lib/db";

const listQuery = z.object({
  status: z.enum(["PENDING", "APPROVED", "HIDDEN", "REJECTED"]).optional(),
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).catch(1).default(1),
  reports: z.enum(["true"]).optional(),
});

/**
 * GET /api/admin/comments — moderation queue.
 * Open report counts are attached per comment (reports are stored in a
 * generic table keyed by entityType/entityId, so they are grouped in a
 * second query instead of a relation count).
 */
export const GET = withApi(
  async ({ req }) => {
    const params = listQuery.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );

    const and: Record<string, unknown>[] = [];
    if (params.status) and.push({ status: params.status });
    if (params.q) {
      const q = params.q.toLowerCase();
      and.push({
        OR: [
          { content: { contains: params.q } },
          { user: { username: { contains: q } } },
          { song: { title: { contains: params.q } } },
        ],
      });
    }
    const where = and.length > 0 ? { AND: and } : {};

    const pageSize = 20;
    const [total, comments] = await Promise.all([
      db.comment.count({ where }),
      db.comment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          song: { select: { id: true, title: true, slug: true } },
        },
      }),
    ]);

    const ids = comments.map((c) => c.id);
    const grouped = await db.report.groupBy({
      by: ["entityId"],
      where: { entityType: "COMMENT", entityId: { in: ids }, status: "PENDING" },
      _count: { _all: true },
    });
    const reportCount = new Map(
      grouped.map((g) => [g.entityId, g._count._all])
    );

    let items = comments.map((c) => ({
      ...c,
      reportCount: reportCount.get(c.id) ?? 0,
    }));
    if (params.reports === "true") {
      items = items.filter((c) => c.reportCount > 0);
    }

    return {
      items,
      total,
      page: params.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  { auth: "admin" }
);
