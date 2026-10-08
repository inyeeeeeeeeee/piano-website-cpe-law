import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Sitemap: static routes + every published song and artist.
 * Unpublished/removed content is never advertised to crawlers.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/songs`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/artists`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${baseUrl}/songbooks`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${baseUrl}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${baseUrl}/contact`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${baseUrl}/login`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${baseUrl}/register`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const [songs, artists] = await Promise.all([
    db.song.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000,
    }),
    db.artist.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { name: "asc" },
      take: 2000,
    }),
  ]);

  return [
    ...staticRoutes,
    ...songs.map((song) => ({
      url: `${baseUrl}/songs/${song.slug}`,
      lastModified: song.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...artists.map((artist) => ({
      url: `${baseUrl}/artists/${artist.slug}`,
      lastModified: artist.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
