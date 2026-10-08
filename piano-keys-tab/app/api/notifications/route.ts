import { z } from "zod";
import { withApi } from "@/lib/api";
import { db } from "@/lib/db";

/** GET /api/notifications — latest 20 notifications + unread badge count. */
export const GET = withApi(async ({ user }) => {
  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user!.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.notification.count({ where: { userId: user!.id, isRead: false } }),
  ]);
  return { items, unread };
}, { auth: "user" });

const readSchema = z.object({
  /** Specific ids to mark as read; omit to mark everything as read. */
  ids: z.array(z.string()).max(100).optional(),
});

/** POST /api/notifications/read */
export const POST = withApi(
  async ({ body, user }) => {
    const result = await db.notification.updateMany({
      where: { userId: user!.id, ...(body.ids ? { id: { in: body.ids } } : {}) },
      data: { isRead: true },
    });
    return { updated: result.count };
  },
  { schema: readSchema, auth: "user", rate: "mutation" }
);
