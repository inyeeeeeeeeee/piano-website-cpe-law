-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_songs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "searchTitle" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "artistId" TEXT NOT NULL,
    "album" TEXT,
    "releaseYear" INTEGER,
    "difficulty" TEXT NOT NULL DEFAULT 'INTERMEDIATE',
    "difficultyRank" INTEGER NOT NULL DEFAULT 3,
    "musicalKey" TEXT NOT NULL DEFAULT 'C',
    "bpm" INTEGER NOT NULL DEFAULT 100,
    "duration" INTEGER,
    "description" TEXT,
    "coverImage" TEXT,
    "tags" TEXT NOT NULL DEFAULT '',
    "searchTags" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAvg" REAL NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "attribution" TEXT,
    "source" TEXT,
    "license" TEXT,
    "copyright" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "songs_artistId_fkey" FOREIGN KEY ("artistId") REFERENCES "artists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "songs_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_songs" ("album", "artistId", "attribution", "bpm", "copyright", "coverImage", "createdAt", "createdById", "description", "difficulty", "duration", "id", "isFeatured", "license", "musicalKey", "ratingAvg", "ratingCount", "releaseYear", "searchTags", "searchTitle", "slug", "source", "status", "tags", "title", "updatedAt", "viewCount") SELECT "album", "artistId", "attribution", "bpm", "copyright", "coverImage", "createdAt", "createdById", "description", "difficulty", "duration", "id", "isFeatured", "license", "musicalKey", "ratingAvg", "ratingCount", "releaseYear", "searchTags", "searchTitle", "slug", "source", "status", "tags", "title", "updatedAt", "viewCount" FROM "songs";
DROP TABLE "songs";
ALTER TABLE "new_songs" RENAME TO "songs";
CREATE UNIQUE INDEX "songs_slug_key" ON "songs"("slug");
CREATE INDEX "songs_artistId_idx" ON "songs"("artistId");
CREATE INDEX "songs_status_idx" ON "songs"("status");
CREATE INDEX "songs_difficulty_idx" ON "songs"("difficulty");
CREATE INDEX "songs_musicalKey_idx" ON "songs"("musicalKey");
CREATE INDEX "songs_bpm_idx" ON "songs"("bpm");
CREATE INDEX "songs_viewCount_idx" ON "songs"("viewCount");
CREATE INDEX "songs_ratingAvg_idx" ON "songs"("ratingAvg");
CREATE INDEX "songs_createdAt_idx" ON "songs"("createdAt");
CREATE INDEX "songs_searchTitle_idx" ON "songs"("searchTitle");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
