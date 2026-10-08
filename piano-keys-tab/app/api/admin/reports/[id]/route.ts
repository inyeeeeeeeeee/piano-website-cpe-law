import { z } from "zod";
import { withApi, ApiError } from "@/lib/api";
import { db } from "@/lib/db";
import { writeAudit } from "@/lib/services";

const schema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED", "PENDING"]),
});

/**
 * PATCH /api/admin/reports/:id — resolve or dismiss a content report.
 * Resolving a COMMENT report also hides the offending comment.
 */
export const PATCH = withApi(
  async ({ params, body, user }) => {
    const report = await db.report.findUnique({ where: { id: params.id } });
    if (!report) throw new ApiError("Report not found", 404, "NOT_FOUND");

    const updated = await db.$transaction(async (tx) => {
      const r = await tx.report.update({
        where: { id: report.id },
        data: { status: body.status },
      });
      if (
        report.entityType === "COMMENT" &&
        body.status === "RESOLVED" &&
        report.status !== "RESOLVED"
      ) {
        await tx.comment.updateMany({
          where: { id: report.entityId },
          data: { status: "HIDDEN" },
        });
      }
      return r;
    });

    await writeAudit(user!.id, "ADMIN_RESOLVED_REPORT", report.entityType, report.entityId, {
      reportId: report.id,
      status: body.status,
    });

    return { report: updated };
  },
  { schema, auth: "admin", rate: "mutation" }
);
