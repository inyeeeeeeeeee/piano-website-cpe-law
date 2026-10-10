import { cookies as nextCookies } from "next/headers";
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
      // Auth.js resolves with a redirect URL rather than throwing when it
      // cannot complete the sign-in (bad credentials *or* a server-side
      // configuration fault such as a missing AUTH_SECRET). Reporting success
      // without a session cookie is what makes a broken deployment look like
      // "the login button does nothing", so every error URL is a failure here.
      const outcome = await signIn("credentials", {
        identifier: body.identifier,
        password: body.password,
        redirect: false,
      });

      const error =
        typeof outcome === "string"
          ? new URL(outcome, "http://n/").searchParams.get("error")
          : null;

      if (error === "CredentialsSignin") {
        throw new ApiError(
          "Invalid email/username or password",
          401,
          "INVALID_CREDENTIALS"
        );
      }
      if (error) {
        // MissingSecret / Configuration / AccessDenied — never expose details,
        // but never claim success either.
        console.error(`[auth] sign-in failed: ${error}`);
        throw new ApiError(
          "Sign-in is temporarily unavailable",
          500,
          "AUTH_UNAVAILABLE"
        );
      }

      // Belt and braces: a successful sign-in must leave an HTTP-only session
      // cookie behind. If none was written, the response would otherwise tell
      // the client everything went fine while it stays logged out.
      const cookies = await nextCookies();
      const hasSession = cookies
        .getAll()
        .some((cookie) => cookie.name.endsWith("authjs.session-token"));
      if (!hasSession) {
        console.error("[auth] sign-in reported success but set no session cookie");
        throw new ApiError(
          "Sign-in is temporarily unavailable",
          500,
          "AUTH_UNAVAILABLE"
        );
      }

      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError) throw error;

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
      console.error("[auth] sign-in threw:", error);
      throw new ApiError(
        "Sign-in is temporarily unavailable",
        500,
        "AUTH_UNAVAILABLE"
      );
    }
  },
  { schema: loginSchema, rate: "login" }
);
