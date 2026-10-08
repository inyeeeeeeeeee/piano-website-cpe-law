import { defineConfig } from "prisma/config";
import { loadEnvFile } from "node:process";

// Prisma 7 no longer loads .env implicitly — load it explicitly.
try {
  loadEnvFile();
} catch {
  // .env may not exist yet; fall back to process.env / defaults below.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
