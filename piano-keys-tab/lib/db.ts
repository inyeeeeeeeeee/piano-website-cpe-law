import path from "node:path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

/**
 * Database access for the whole application.
 *
 * • SQLite file is resolved to an absolute path so behaviour is identical in
 *   `next dev`, `next build`, `next start`, scripts and tests.
 * • The client is cached on `globalThis` in development so hot-reload does not
 *   open a new connection on every edit.
 * • WAL journaling + foreign keys are enabled once per process (the adapter
 *   already enables `foreign_keys`; WAL simply reduces writer/reader blocking).
 */

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const withoutScheme = raw.replace(/^file:\/\//, "").replace(/^file:/, "");
  const absolute = path.isAbsolute(withoutScheme)
    ? withoutScheme
    // The DB path comes from env at runtime; there is nothing for Turbopack
    // to bundle-trace here (flag keeps it from hoisting the whole project).
    : path.join(/*turbopackIgnore: true*/ process.cwd(), withoutScheme);
  return `file:${absolute}`;
}

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });

function createClient(): PrismaClient {
  const client = new PrismaClient({ adapter });
  // Best effort one-time pragma setup (WAL survives in the DB file).
  void client
    .$queryRawUnsafe("PRAGMA journal_mode = WAL;")
    .catch(() => undefined);
  return client;

}

const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient = globalForDb.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = db;
}

export type { PrismaClient };
