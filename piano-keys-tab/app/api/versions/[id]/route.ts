import { withApi, ApiError } from "@/lib/api";
import { updateVersionSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { canManageSong } from "@/lib/permissions";
import { replaceVersionSections } from "@/lib/repo";

async function loadVersion(id: string) {
  return db.songVersion.findUnique({
    where: { id },
    include: { song: { select: { id: true, status: true, createdById: true } } },
  });
}

async function authorize(versionId: string, user: { id: string; role: string }) {
  const version = await loadVersion(versionId);
  if (!version) throw new ApiError("Version not found", 404, "NOT_FOUND");
  const canManage = canManageSong(user as never, version.song);
  if (!canManage) {
    throw new ApiError("You do not have permission to edit this version", 403, "FORBIDDEN");
  }
  return version;
}

/**
 * PUT /api/versions/:id — update a version.
 * When `sections` is supplied every section is rebuilt inside one transaction
 * (delete + recreate), keeping order indexes consistent.
 */
export const PUT = withApi(
  async ({ params, body, user }) => {
    const actor = user!;
    const version = await authorize(params.id, actor);

    if (body.status !== undefined && actor.role !== "ADMIN") {
      throw new ApiError("Only administrators can change review status", 403, "FORBIDDEN");
    }

    const { sections, ...fields } = body;

    await db.$transaction(async (tx) => {
      await tx.songVersion.update({
        where: { id: version.id },
        data: Object.fromEntries(
          Object.entries(fields).filter(([, v]) => v !== undefined)
        ),
      });
      if (sections !== undefined) {
        await replaceVersionSections(tx, version.id, sections);
      }
    });

    return { version: { id: version.id } };
  },
  { schema: updateVersionSchema, auth: "user", rate: "mutation" }
);

/** DELETE /api/versions/:id */
export const DELETE = withApi(async ({ params, user }) => {
  const version = await authorize(params.id, user!);
  await db.songVersion.delete({ where: { id: version.id } });
  return { ok: true };
}, { auth: "user", rate: "mutation" });
