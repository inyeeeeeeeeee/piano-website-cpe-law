import { withApi, ApiError } from "@/lib/api";
import { profileSchema } from "@/lib/validation";
import { db } from "@/lib/db";

/**
 * PATCH /api/user — update the caller's own profile.
 * Usernames are unique; a change here never affects role (role can only be
 * changed by an admin through /api/admin/users/:id).
 */
export const PATCH = withApi(
  async ({ body, user }) => {
    if (body.username && body.username !== user!.username) {
      const taken = await db.user.findUnique({
        where: { username: body.username },
        select: { id: true },
      });
      if (taken) {
        throw new ApiError("That username is already taken", 409, "USERNAME_TAKEN");
      }
    }

    try {
      const updated = await db.user.update({
        where: { id: user!.id },
        data: {
          ...(body.username ? { username: body.username } : {}),
          ...(body.bio !== undefined ? { bio: body.bio } : {}),
          ...(body.avatar !== undefined ? { avatar: body.avatar } : {}),
        },
        select: { id: true, username: true, email: true, avatar: true, bio: true },
      });
      return { user: updated };
    } catch (error) {
      if ((error as { code?: string })?.code === "P2002") {
        throw new ApiError("That username is already taken", 409, "USERNAME_TAKEN");
      }
      throw error;
    }
  },
  { schema: profileSchema, auth: "user", rate: "mutation" }
);
