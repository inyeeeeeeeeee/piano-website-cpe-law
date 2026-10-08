import { withApi, ApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { signIn } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Credentials sign-in through Auth.js. The session cookie is HTTP-only and
 * signed server-side; the response never contains password material.
 */
export const POST = withApi(
  async ({ body }) => {
    try {
      await signIn("credentials", {
        identifier: body.identifier,
        password: body.password,
        redirect: false,
      });
    } catch (error) {
      const name = (error as Error)?.name ?? "";
      if (
        name === "CallbackRouteError" ||
        name === "CredentialsSignin" ||
        name === "AuthError" ||
        name === "EmailSignInError"
      ) {
        throw new ApiError(
          "Invalid email/username or password",
          401,
          "INVALID_CREDENTIALS"
        );
      }
      throw error;
    }
    return { ok: true };
  },
  { schema: loginSchema, rate: "login" }
);
