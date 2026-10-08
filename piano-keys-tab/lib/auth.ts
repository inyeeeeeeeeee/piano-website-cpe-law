import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/lib/validation";

/**
 * Auth.js (NextAuth v5) configuration.
 *
 * Design notes
 * • Credentials provider + JWT sessions: the session cookie is signed/encrypted
 *   by Auth.js and is HTTP-only. The JWT carries a *hint* of the role, but
 *   every authorization decision re-reads the user from the database
 *   (lib/session.ts) — client-supplied or stale role data is never trusted.
 * • `lib/db` and `bcryptjs` are imported dynamically inside `authorize` so this
 *   module has a light import graph and can be used from `proxy.ts` (route
 *   protection) without dragging the SQLite driver into it.
 * • Failed logins compare against a dummy hash to keep timing uniform and
 *   avoid revealing whether an account exists.
 */

const DUMMY_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
  trustHost: true,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Credentials({
      name: "Email or username",
      credentials: {
        identifier: { label: "Email or username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse({
          identifier: credentials?.identifier,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        const { identifier, password } = parsed.data;
        const [{ db }, bcrypt] = await Promise.all([
          import("@/lib/db"),
          import("bcryptjs"),
        ]);

        const email = identifier.toLowerCase();
        const user = await db.user.findFirst({
          where: { OR: [{ email }, { username: identifier }] },
          select: {
            id: true,
            username: true,
            email: true,
            passwordHash: true,
            role: true,
            avatar: true,
            isActive: true,
          },
        });

        if (!user) {
          // Constant-ish work regardless of account existence.
          await bcrypt.compare(password, DUMMY_HASH);
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid || !user.isActive) return null;

        return {
          id: user.id,
          name: user.username,
          email: user.email,
          image: user.avatar,
          username: user.username,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = user.username ?? user.name ?? "";
        token.role = user.role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      // The JWT payload is `unknown`-typed here (module augmentation only
      // covers the public `next-auth` types), so narrow explicitly.
      const payload = token as Record<string, unknown>;
      session.user.id =
        typeof payload.id === "string"
          ? payload.id
          : typeof token.sub === "string"
            ? token.sub
            : "";
      session.user.username =
        typeof payload.username === "string" ? payload.username : "";
      session.user.role = payload.role === "ADMIN" ? "ADMIN" : "USER";
      return session;
    },
  },
});
