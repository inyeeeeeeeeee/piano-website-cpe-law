import { NextResponse } from "next/server";
import { withApi } from "@/lib/api";
import { signOut } from "@/lib/auth";

/** POST /api/auth/logout — clears the HTTP-only session cookie. */
export const POST = withApi(async () => {
  await signOut({ redirect: false });
  return { ok: true };
});

/**
 * GET /api/auth/logout?redirect=/login
 *
 * `lib/session.ts` points stale sessions here: when a signed cookie references
 * a user that no longer exists (database rebuilt, account deleted), the cookie
 * has to be removed *before* the visitor reaches /login — otherwise `proxy.ts`
 * sees a valid cookie and sends /login straight back to /dashboard, while the
 * page guard sends /dashboard back to /login, and the browser gives up with a
 * redirect error.
 *
 * `redirect` only accepts same-site paths (no `//host`), so this cannot be
 * used as an open redirect, and it only ever clears the caller's own cookie.
 * The trade-off for making this a GET (so a server component can link to it)
 * is that a third-party page could force a logout — a nuisance only, never a
 * privilege change.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get("redirect") ?? "/login";
  const target =
    raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")
      ? raw
      : "/login";

  await signOut({ redirect: false });
  return NextResponse.redirect(new URL(target, url.origin), 303);
}
