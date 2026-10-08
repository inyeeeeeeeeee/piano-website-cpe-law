import bcrypt from "bcryptjs";
import { withApi, ApiError } from "@/lib/api";
import { changePasswordSchema } from "@/lib/validation";
import { db } from "@/lib/db";

/** PATCH /api/user/password — change the caller's own password. */
export const PATCH = withApi(
  async ({ body, user }) => {
    const record = await db.user.findUnique({
      where: { id: user!.id },
      select: { passwordHash: true },
    });
    if (!record) throw new ApiError("Account not found", 404, "NOT_FOUND");

    const valid = await bcrypt.compare(body.currentPassword, record.passwordHash);
    if (!valid) {
      throw new ApiError("Your current password is incorrect", 400, "INVALID_PASSWORD");
    }
    if (body.currentPassword === body.newPassword) {
      throw new ApiError("The new password must be different", 400, "SAME_PASSWORD");
    }

    const passwordHash = await bcrypt.hash(body.newPassword, 12);
    await db.user.update({ where: { id: user!.id }, data: { passwordHash } });

    return { ok: true };
  },
  { schema: changePasswordSchema, auth: "user", rate: "mutation" }
);
