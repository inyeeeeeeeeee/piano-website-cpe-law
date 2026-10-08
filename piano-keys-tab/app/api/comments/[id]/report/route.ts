import { NextResponse } from "next/server";
import { withApi, ApiError } from "@/lib/api";
import { reportSchema } from "@/lib/validation";
import { db } from "@/lib/db";

/**
 * POST /api/comments/:id/report — flag a comment for moderation.
 * One open report per reporter per comment (spam prevention).
 */
export const POST = withApi(
  async ({ params, body, user }) => {
    const comment = await db.comment.findUnique({
      where: { id: params.id },
      select: { id: true },
    });
    if (!comment) throw new ApiError("Comment not found", 404, "NOT_FOUND");

    const existing = await db.report.findFirst({
      where: {
        entityType: "COMMENT",
        entityId: comment.id,
        reporterId: user!.id,
        status: "PENDING",
      },
    });
    if (existing) {
      throw new ApiError("You have already reported this comment", 409, "ALREADY_REPORTED");
    }

    if (body.entityType !== "COMMENT") {
      throw new ApiError("This endpoint only reports comments", 400, "INVALID_TYPE");
    }

    await db.report.create({
      data: {
        reporterId: user!.id,
        entityType: body.entityType,
        entityId: params.id,
        reason: body.reason,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  },
  { schema: reportSchema, auth: "user", rate: "comment" }
);
