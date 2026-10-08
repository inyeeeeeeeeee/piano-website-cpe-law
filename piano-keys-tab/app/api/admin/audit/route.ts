import { z } from "zod";
import { withApi } from "@/lib/api";
import { db } from "@/lib/db";

const query = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
});

/**
 * GET /api/audit — the admin audit trail (§49), newest first.
 */
export const GET = withApi(
  async ({ req }) => {
    const params = query.parse(
      Object.fromEntries(req.nextUrl.searchParams.entries())
    );
    const pageSize = 25;

    const [total, items] = await Promise.all([
      db.auditLog.count(),
      db.auditLog.findMany({
        orderBy: { createdAt: "desc" },
        skip: (params.page - 1) * pageSize,
        take: pageSize,
        include: { admin: { select: { id: true, username: true } } },
      }),
    ]);

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
