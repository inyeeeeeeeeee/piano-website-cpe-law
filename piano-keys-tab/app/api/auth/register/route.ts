import bcrypt from "bcryptjs";
import { withApi, ApiError } from "@/lib/api";
import { registerSchema } from "@/lib/validation";
import { db } from "@/lib/db";
import { signIn } from "@/lib/auth";

/**
 * POST /api/auth/register
 * Creates a USER account with a bcrypt-hashed password and signs the user in.
 * Never leaks whether a specific field exists beyond its own uniqueness error.
 */
export const POST = withApi(
  async ({ body }) => {
    const { username, email, password } = body;

    const [byEmail, byUsername] = await Promise.all([
      db.user.findUnique({ where: { email }, select: { id: true } }),
      db.user.findUnique({ where: { username }, select: { id: true } }),
    ]);

    if (byEmail) {
      throw new ApiError("An account with that email already exists", 409, "EMAIL_TAKEN");
    }
    if (byUsername) {
      throw new ApiError("That username is already taken", 409, "USERNAME_TAKEN");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    let userId: string;
    try {
      const user = await db.user.create({
        data: {
          username,
          email,
          passwordHash,
          role: "USER",
          settings: { create: {} },
        },
        select: { id: true },
      });
      userId = user.id;
    } catch (error) {
      // Unique-constraint race (two identical registrations at once).
      if ((error as { code?: string })?.code === "P2002") {
        throw new ApiError(
          "That email or username is already registered",
          409,
          "TAKEN"
        );
      }
      throw error;
    }

    // Sign the new user in immediately (best effort — they can log in manually).
    try {
      await signIn("credentials", { identifier: email, password, redirect: false });
    } catch {
      // Account exists even if the automatic sign-in fails.
    }

    return { ok: true, userId };
  },
  { schema: registerSchema, rate: "register" }
);
