import { z } from "zod";
import { withApi } from "@/lib/api";
import { db } from "@/lib/db";

const query = z.object({
  status: z.enum(["PENDING", "RESOLVED", "DISMISSED"]).catch("PENDING").default("PENDING"),
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

/**
 * GET /api/admin/reports — open content reports with the reported object
 * (comment text / user / song) resolved for the moderation UI.
 */
export const GET = withApi(
  async ({ req }) => {
    const params = query.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const pageSize = 20;

    const where = { status: params.status };
    const [total, reports] = await Promise.all([
      db.report.count({ where }),
      db.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, username: true } },
        },
      }),
    ]);

    // Resolve the reported entity for COMMENT reports (generic keying).
    const commentIds = reports
      .filter((r) => r.entityType === "COMMENT")
      .map((r) => r.entityId);
    const comments = commentIds.length
      ? await db.comment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            status: true,
            user: { select: { username: true } },
            song: { select: { title: true, slug: true } },
          },
        })
      : [];
    const commentById = new Map(comments.map((c) => [c.id, c]));

    return {
      items: reports.map((r) => ({
        ...r,
        target:
          r.entityType === "COMMENT" ? (commentById.get(r.entityId) ?? null) : null,
      })),
      total,
      page: params.page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },
  { auth: "admin" }
);
