import { cookies as nextCookies } from "next/headers";
import { withApi, ApiError } from "@/lib/api";
import { loginSchema } from "@/lib/validation";
import { signIn } from "@/lib/auth";

/**
 * Auth.js errors expose a stable `type`, but their `name` is whatever the
 * production minifier made of the class (it arrives as `_` on Railway), so the
 * only classification that survives bundling is a walk down the cause chain
 * looking at type/name/message together.
 */
function describeAuthError(error: unknown): string {
  const parts: string[] = [];
  let current: unknown = error;
  for (let i = 0; current && i < 5; i += 1) {
    const e = current as { type?: unknown; name?: unknown; message?: unknown };
    parts.push(`${e.type ?? ""} ${e.name ?? ""} ${e.message ?? ""}`);
    current = (current as { cause?: unknown }).cause;
  }
  return parts.join(" ");
}

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

      if (error) {
        if (error === "CredentialsSignin") {
          throw new ApiError(
            "Invalid email/username or password",
            401,
            "INVALID_CREDENTIALS"
          );
        }
        // MissingSecret / Configuration / AccessDenied — never expose details,
        // but never claim success either.
        console.error(`[auth] sign-in returned error=${error}`);
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

      const detail = describeAuthError(error);
      if (/credentialssignin/i.test(detail)) {
        throw new ApiError(
          "Invalid email/username or password",
          401,
          "INVALID_CREDENTIALS"
        );
      }
      // MissingSecret, adapter faults, anything unrecognised: log the shape of
      // the failure for operators, never the details, and never "success".
      console.error(`[auth] sign-in failed: ${detail.slice(0, 400)}`);
      throw new ApiError(
        "Sign-in is temporarily unavailable",
        500,
        "AUTH_UNAVAILABLE"
      );
    }
  },
  { schema: loginSchema, rate: "login" }
);
