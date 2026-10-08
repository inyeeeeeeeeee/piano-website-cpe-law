import { NextRequest, NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { getCurrentUser, type SessionUser } from "@/lib/session";
import {
  clientIp,
  rateLimit,
  RATE_LIMITS,
  type RateLimitSpec,
} from "@/lib/rate-limit";

/**
 * Uniform wrapper for every mutating/data API route:
 *   1. Same-origin check (CSRF defence #1 — cookies are SameSite=Lax as well)
 *   2. Rate limiting per IP (and per user when authenticated)
 *   3. Authentication / role authorisation (server-side, always)
 *   4. Zod body validation
 *   5. Consistent JSON error envelopes
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number = 400,
    public code?: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiAuth = "none" | "user" | "admin";

export interface ApiContext<P = Record<string, string>, T = unknown> {
  req: NextRequest;
  params: P;
  body: T;
  user: SessionUser | null;
  ip: string;
}

interface WithApiOptions<T> {
  /** Validates and parses the JSON body. */
  schema?: ZodType<T>;
  /** Access level required. Defaults to "none" (handler may still use user). */
  auth?: ApiAuth;
  /** Rate-limit preset name or explicit spec. */
  rate?: keyof typeof RATE_LIMITS | RateLimitSpec;
  /** Skip the same-origin check (e.g. for GET requests — it only runs on mutations anyway). */
  skipOriginCheck?: boolean;
}

function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // non-CORS, non-preflight request
  try {
    const host = req.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

function zodDetails(error: ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

export function errorResponse(
  status: number,
  message: string,
  extra?: Record<string, unknown>
): NextResponse {
  return NextResponse.json({ error: message, ...extra }, { status });
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return errorResponse(error.status, error.message, { code: error.code });
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation failed",
        code: "VALIDATION",
        fields: zodDetails(error),
      },
      { status: 400 }
    );
  }
  // Auth.js errors (wrong credentials etc.) — never leak details.
  const name = (error as { name?: string })?.name;
  if (name === "CredentialsSignin" || name === "AuthError") {
    return errorResponse(401, "Invalid email/username or password", {
      code: "INVALID_CREDENTIALS",
    });
  }
  console.error("[api] unhandled error:", error);
  return errorResponse(500, "Something went wrong. Please try again.", {
    code: "INTERNAL",
  });
}

type Handler<P, T> = (ctx: ApiContext<P, T>) => Promise<unknown> | unknown;

/**
 * Wraps a route-handler implementation.
 *
 * Usage:
 *   export const POST = withApi(async ({ body, user }) => { … }, {
 *     auth: "user", rate: "comment", schema: commentSchema,
 *   });
 *
 * IMPORTANT — do not pass explicit type arguments (`withApi<Params>(…)`).
 * Supplying any type argument makes TypeScript skip inference for the rest of
 * the list, so `body` silently falls back to `unknown` and every Zod schema
 * stops protecting the handler. Route params are typed through the
 * `Record<string, string>` default instead (e.g. `params.id` is a string).
 */
export function withApi<P = Record<string, string>, T = unknown>(
  // NoInfer: `T` must come from `options.schema`, never from the handler's
  // (usually un-annotated) destructured context — otherwise `body` collapses
  // to `unknown` and every route loses type safety.
  handler: Handler<P, NoInfer<T>>,
  options: WithApiOptions<T> = {}
) {
  const { schema, auth = "none", rate, skipOriginCheck } = options;

  return async (
    req: NextRequest,
    routeCtx?: { params?: Promise<P> | P }
  ): Promise<NextResponse> => {
    try {
      // 1. CSRF: state-changing requests must come from our own origin.
      if (!skipOriginCheck && !sameOrigin(req)) {
        return errorResponse(403, "Cross-origin request blocked", {
          code: "CSRF",
        });
      }

      const ip = clientIp(req.headers);

      // 2. Rate limiting.
      if (rate) {
        const spec = typeof rate === "string" ? RATE_LIMITS[rate] : rate;
        const result = rateLimit(`${req.nextUrl.pathname}:${ip}`, spec);
        if (!result.ok) {
          return new NextResponse(
            JSON.stringify({
              error: "Too many requests. Please slow down.",
              code: "RATE_LIMITED",
            }),
            {
              status: 429,
              headers: {
                "Content-Type": "application/json",
                "Retry-After": String(result.retryAfterSeconds),
              },
            }
          );
        }
      }

      // 3. Authorisation (server-side, DB-verified).
      const user = await getCurrentUser();
      if (auth === "user" && !user) {
        return errorResponse(401, "You need to sign in to do that", {
          code: "UNAUTHENTICATED",
        });
      }
      if (auth === "admin" && user?.role !== "ADMIN") {
        return errorResponse(403, "You do not have permission to do that", {
          code: "FORBIDDEN",
        });
      }

      // The handler is typed with NoInfer<T>, so re-assert the parsed body.
      let body: T | undefined = undefined;
      if (schema) {
        let raw: unknown;
        try {
          // An empty body is treated as `{}` so optional payloads work without
          // forcing every client to send "{}".
          const text = await req.text();
          raw = text.trim() ? JSON.parse(text) : {};
        } catch {
          return errorResponse(400, "Request body must be valid JSON", {
            code: "BAD_JSON",
          });
        }
        body = schema.parse(raw) as T;
      }

      const params = routeCtx?.params
        ? await routeCtx.params
        : ({} as unknown as P);

      const result = await handler({
        req,
        params,
        // `body` is `T` whenever a schema was provided; without one the
        // handler simply never reads it.
        body: body as T,
        user,
        ip,
      });
      if (result instanceof NextResponse) return result;
      if (result === undefined) {
        return NextResponse.json({ ok: true }, { status: 200 });
      }
      return NextResponse.json(result as Record<string, unknown>);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
