import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { formatDuration, initials } from "@/lib/utils";
import { DifficultyBadge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { EmptyState } from "@/components/ui/skeleton";
import { buttonClasses } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { slug: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const artist = await db.artist.findUnique({ where: { slug } });
  if (!artist) return { title: "Artist not found" };
  return {
    title: artist.name,
    description:
      artist.biography ??
      `Browse every piano arrangement of ${artist.name} available in the library.`,
  };
}

export default async function ArtistPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const artist = await db.artist.findUnique({
    where: { slug },
    include: {
      songs: {
        where: { status: "PUBLISHED" },
        orderBy: [{ viewCount: "desc" }, { title: "asc" }],
        select: {
          id: true,
          title: true,
          slug: true,
          difficulty: true,
          musicalKey: true,
          bpm: true,
          duration: true,
          ratingAvg: true,
          viewCount: true,
          coverImage: true,
        },
      },
    },
  });

  if (!artist) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/artists"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All artists
      </Link>

      <header className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-primary-soft text-3xl font-bold text-primary">
          {initials(artist.name)}
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{artist.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {artist.songs.length} published arrangement{artist.songs.length === 1 ? "" : "s"}
          </p>
          {artist.biography ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {artist.biography}
            </p>
          ) : null}
        </div>
      </header>

      <section className="mt-10" aria-labelledby="artist-songs">
        <h2 id="artist-songs" className="text-xl font-bold">
          Arrangements
        </h2>

        {artist.songs.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              title="No arrangements yet"
              description="Nothing has been published for this artist. Why not submit one?"
              action={
                <Link href="/submit-song" className={buttonClasses("primary", "md")}>
                  Submit an arrangement
                </Link>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {artist.songs.map((song) => (
              <li key={song.id}>
                <Link
                  href={`/songs/${song.slug}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="h-32 w-full overflow-hidden">
                    <CoverImage title={song.title} artist={artist.name} src={song.coverImage} />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold group-hover:text-primary">
                          {song.title}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {song.musicalKey} · {song.bpm} BPM · {formatDuration(song.duration)}
                        </p>
                      </div>
                      <DifficultyBadge value={song.difficulty} showIntensity={false} className="shrink-0" />
                    </div>
                    <p className="mt-auto pt-3 text-xs text-muted-foreground">
                      ★ {song.ratingAvg.toFixed(1)} · {song.viewCount} views
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
