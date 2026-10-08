/**
 * Piano Keys Tab — first-boot admin bootstrap.
 *
 *   npx tsx prisma/bootstrap-admin.ts      (runs automatically in `npm start`)
 *
 * Creates a single ADMIN account on an empty database so a fresh deployment
 * has an administrator without running `npm run db:seed`, which is destructive
 * and ships fictional demo content (see README §Seed data).
 *
 * Reads from the environment:
 *
 *   ADMIN_EMAIL      required — address for the admin account
 *   ADMIN_PASSWORD   required — plain text, hashed with bcrypt cost 12
 *   ADMIN_USERNAME   optional — defaults to the email local part
 *
 * Behaviour is deliberately conservative:
 *
 *   • If ADMIN_EMAIL / ADMIN_PASSWORD are unset it does nothing and exits 0,
 *     so a development machine without those variables is unaffected.
 *   • It only ever creates an account when the users table is completely
 *     empty — it never overwrites, promotes or deletes anyone.
 *   • Because it runs before `next start`, no visitor can register first and
 *     lock the admin out of its own boot slot.
 *
 * If it fails while ADMIN_* are configured, the start script stops and the
 * deployment stays down rather than silently coming up without an admin.
 */

import path from "node:path";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";

// `next dev` loads .env automatically; `tsx prisma/bootstrap-admin.ts` does not.
// Railway injects these directly, and Node does not let a file override an
// existing variable, so the platform always wins.
try {
  process.loadEnvFile();
} catch {
  /* no .env — process.env (e.g. Railway variables) is used instead */
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const withoutScheme = raw.replace(/^file:\/\//, "").replace(/^file:/, "");
  const absolute = path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.join(process.cwd(), withoutScheme);
  return `file:${absolute}`;
}

async function main(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim();
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.log(
      "[bootstrap-admin] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping."
    );
    return;
  }

  const username = process.env.ADMIN_USERNAME?.trim() || email.split("@")[0];

  const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
  const db = new PrismaClient({ adapter });

  try {
    const existing = await db.user.count();
    if (existing > 0) {
      console.log(
        `[bootstrap-admin] ${existing} user(s) already exist — nothing to do.`
      );
      return;
    }

    const user = await db.user.create({
      data: {
        username,
        email,
        passwordHash: await hash(password, 12),
        role: "ADMIN",
        settings: { create: {} },
      },
      select: { username: true, email: true, role: true },
    });

    console.log(
      `[bootstrap-admin] created ${user.role} account ${user.email} (${user.username})`
    );
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  console.error("[bootstrap-admin] failed:", error);
  process.exitCode = 1;
});
