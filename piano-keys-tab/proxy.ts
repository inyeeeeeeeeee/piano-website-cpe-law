import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * Route protection (Next.js 16 "proxy" — formerly middleware).
 *
 * This runs before rendering and performs a *fast* check based on the signed
 * session cookie. It is deliberately shallow: every protected page and every
 * API route re-verifies the user against the database (lib/session.ts), so
 * nothing here can be bypassed by manipulating the client. The proxy simply
 * gives visitors an early redirect instead of a flash of protected content.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/songbooks",
  "/submit-song",
];
const ADMIN_PREFIXES = ["/admin"];
const GUEST_ONLY_PATHS = ["/login", "/register"];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export const proxy = auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
  const loggedIn = !!session?.user;

  const redirectWithCallback = (to: string) => {
    const url = new URL(to, req.url);
    if (to === "/login") {
      url.searchParams.set("callbackUrl", `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  };

  // Admin area: signed-in users with the ADMIN role only.
  if (matches(pathname, ADMIN_PREFIXES)) {
    if (!loggedIn) return redirectWithCallback("/login");
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/403", req.url));
    }
    return NextResponse.next();
  }

  // Member area: any signed-in user.
  if (matches(pathname, PROTECTED_PREFIXES) && !loggedIn) {
    return redirectWithCallback("/login");
  }

  // Guest-only pages: send signed-in users to their dashboard.
  if (GUEST_ONLY_PATHS.includes(pathname) && loggedIn) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/songbooks/:path*",
    "/submit-song/:path*",
    "/admin/:path*",
    "/login",
    "/register",
  ],
};
