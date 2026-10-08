import { withApi } from "@/lib/api";
import { settingsSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { getOrCreateSettings } from "@/lib/services";

/**
 * GET /api/user/settings — practice-mode preferences for the current user.
 * (Also readable from the server component that renders /settings.)
 */
export const GET = withApi(async ({ user }) => {
  const settings = await getOrCreateSettings(user!.id);
  return { settings };
}, { auth: "user" });

/** PUT /api/user/settings — persist preferences. */
export const PUT = withApi(
  async ({ body, user }) => {
    const settings = await db.userSettings.upsert({
      where: { userId: user!.id },
      create: { userId: user!.id, ...body },
      update: body,
    });
    return { settings };
  },
  { schema: settingsSchema, auth: "user", rate: "mutation" }
);
