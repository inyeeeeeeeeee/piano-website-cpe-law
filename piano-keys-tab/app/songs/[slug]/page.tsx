import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { getOrCreateSettings, recordSongView } from "@/lib/services";
import { parseJson, formatDuration, timeAgo } from "@/lib/utils";
import { difficultyMeta } from "@/lib/constants";
import type { SettingsInput } from "@/lib/validation";
import type { ArrangementEvent } from "@/types/arrangement";
import { Badge, DifficultyBadge, FeaturedBadge, KeyBadge, StatusBadge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { EmptyState } from "@/components/ui/skeleton";
import { SongPractice, type PracticeVersion } from "@/components/practice/song-practice";
import { RatingControl } from "@/components/features/rating-control";
import { SaveButtons } from "@/components/features/save-buttons";
import {
  CommentSection,
  type CommentItem,
} from "@/components/features/comment-section";
import {
  Album,
  Calendar,
  Clock,
  Eye,
  Gauge,
  Music4,
  User as UserIcon,
} from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { slug: string };

async function loadSong(slug: string) {
  return db.song.findFirst({
    where: { OR: [{ slug }, { id: slug }] },
    include: {
      artist: true,
      createdBy: { select: { id: true, username: true } },
      versions: {
        orderBy: { order: "asc" },
        include: {
          sections: {
            orderBy: { order: "asc" },
            include: { arrangement: true },
          },
        },
      },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await loadSong(slug);
  if (!song) return { title: "Song not found" };

  return {
    title: `${song.title} — ${song.artist.name}`,
    description:
      song.description ??
      `Practise “${song.title}” by ${song.artist.name} — transpose, metronome, autoscroll and an interactive keyboard.`,
    openGraph: {
      title: `${song.title} — ${song.artist.name}`,
      description: `Piano tab arrangement in ${song.musicalKey} · ${difficultyMeta(song.difficulty).label}`,
    },
  };
}

export default async function SongPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const song = await loadSong(slug);
  if (!song) notFound();

  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";
  const isOwner = !!user && song.createdById === user.id;
  const canView = song.status === "PUBLISHED" || isAdmin || isOwner;
  if (!canView) notFound();

  // Count the view once per request (server-side, never from client state).
  await recordSongView(song.id, user?.id ?? null);

  const [comments, myRating, saved, songbooks, settings] = await Promise.all([
    db.comment.findMany({
      where: {
        songId: song.id,
        ...(isAdmin ? {} : { status: "APPROVED" }),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { id: true, username: true, avatar: true } } },
    }),
    user
      ? db.rating.findUnique({
          where: { userId_songId: { userId: user.id, songId: song.id } },
        })
      : null,
    user
      ? db.savedSong.findUnique({
          where: { userId_songId: { userId: user.id, songId: song.id } },
        })
      : null,
    user
      ? db.songbook.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true },
        })
      : [],
    user ? getOrCreateSettings(user.id) : null,
  ]);

  const related = await db.song.findMany({
    where: { artistId: song.artistId, status: "PUBLISHED", id: { not: song.id } },
    orderBy: { viewCount: "desc" },
    take: 4,
    select: {
      id: true,
      title: true,
      slug: true,
      difficulty: true,
      musicalKey: true,
      ratingAvg: true,
      coverImage: true,
    },
  });

  const visibleVersions = song.versions.filter(
    (version) => isAdmin || isOwner || version.status === "PUBLISHED"
  );

  const practiceVersions: PracticeVersion[] = visibleVersions.map((version) => ({
    id: version.id,
    name: version.name,
    description: version.description,
    difficulty: version.difficulty,
    musicalKey: version.musicalKey,
    bpm: version.bpm,
    sections: version.sections.map((section) => ({
      name: section.name,
      content: section.arrangement?.content ?? "",
      events: parseJson<ArrangementEvent[]>(section.arrangement?.structuredData, []),
    })),
  }));

  const commentItems: CommentItem[] = comments.map((comment) => ({
    id: comment.id,
    content: comment.content,
    status: comment.status,
    createdAt: comment.createdAt.toISOString(),
    user: comment.user,
  }));

  const tags = song.tags ? song.tags.split(",").filter(Boolean) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <nav aria-label="Breadcrumb" className="mb-6 text-sm text-muted-foreground">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/songs" className="hover:text-primary">
              Songs
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/artists/${song.artist.slug}`} className="hover:text-primary">
              {song.artist.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-foreground">{song.title}</li>
        </ol>
      </nav>

      {/* Header */}
      <header className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="h-56 w-full overflow-hidden rounded-2xl border border-border lg:h-48">
          <CoverImage
            title={song.title}
            artist={song.artist.name}
            src={song.coverImage}
            rounded="rounded-2xl"
            priority
          />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            {song.status !== "PUBLISHED" ? <StatusBadge value={song.status} /> : null}
            {song.isFeatured ? <FeaturedBadge /> : null}
          </div>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {song.title}
          </h1>
          <p className="mt-1 text-lg text-muted-foreground">
            by{" "}
            <Link href={`/artists/${song.artist.slug}`} className="font-medium text-primary hover:underline">
              {song.artist.name}
            </Link>
            {song.album ? <span className="text-muted-foreground"> · {song.album}</span> : null}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <DifficultyBadge value={song.difficulty} />
            <KeyBadge value={song.musicalKey} />
            <Badge className="bg-muted text-muted-foreground ring-border">
              <Gauge className="h-3 w-3" aria-hidden="true" /> {song.bpm} BPM
            </Badge>
            <Badge className="bg-muted text-muted-foreground ring-border">
              <Clock className="h-3 w-3" aria-hidden="true" /> {formatDuration(song.duration)}
            </Badge>
            <Badge className="bg-muted text-muted-foreground ring-border">
              <Eye className="h-3 w-3" aria-hidden="true" /> {song.viewCount} views
            </Badge>
            <Badge className="bg-muted text-muted-foreground ring-border">
              ★ {song.ratingAvg.toFixed(1)} ({song.ratingCount})
            </Badge>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <SaveButtons
              songId={song.id}
              initialSaved={!!saved}
              signedIn={!!user}
              songbooks={songbooks}
            />
            {(isAdmin || (isOwner && song.status !== "PUBLISHED")) ? (
              <Link
                href={isAdmin ? `/admin/songs?edit=${song.id}` : `/submit-song?edit=${song.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Edit arrangement
              </Link>
            ) : null}
          </div>

          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {song.description ?? "No description has been written for this arrangement yet."}
          </p>

          {tags.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
              {tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/songs?tag=${encodeURIComponent(tag)}`}>
                    <Badge className="bg-primary-soft text-primary ring-primary/20 hover:ring-primary/50">
                      #{tag}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </header>

      {/* Practice studio */}
      <section aria-labelledby="practice-heading" className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Music4 className="h-5 w-5 text-primary" aria-hidden="true" />
          <h2 id="practice-heading" className="text-xl font-bold">
            Practice studio
          </h2>
        </div>

        {practiceVersions.length === 0 ? (
          <EmptyState
            title="No published arrangement yet"
            description="This song is waiting for an approved version. Check back soon."
          />
        ) : (
          <SongPractice
            versions={practiceVersions}
            songKey={song.musicalKey}
            signedIn={!!user}
            // UserSettings mirrors the Zod `settingsSchema` shape (enforced on
            // every write), so the row can be handed straight to the client.
            // Visitors without saved settings start at the arrangement's
            // written tempo instead of the generic default.
            initialSettings={
              settings
                ? (settings as unknown as SettingsInput)
                : { metronomeBpm: practiceVersions[0].bpm }
            }
          />
        )}
      </section>

      {/* Details */}
      <section aria-labelledby="details-heading" className="mt-10 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 id="details-heading" className="text-lg font-bold">
            About this arrangement
          </h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-2 text-sm">
              <UserIcon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="text-muted-foreground">Arranged by</dt>
              <dd className="font-medium">
                {song.createdBy ? (
                  <Link href={`/artists/${song.artist.slug}`} className="hover:text-primary">
                    {song.createdBy.username}
                  </Link>
                ) : (
                  "Piano Keys Tab editors"
                )}
              </dd>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <dt className="text-muted-foreground">Published</dt>
              <dd className="font-medium">{timeAgo(song.createdAt)}</dd>
            </div>
            {song.album ? (
              <div className="flex items-center gap-2 text-sm">
                <Album className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <dt className="text-muted-foreground">Album</dt>
                <dd className="font-medium">{song.album}</dd>
              </div>
            ) : null}
            {song.releaseYear ? (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <dt className="text-muted-foreground">Release year</dt>
                <dd className="font-medium">{song.releaseYear}</dd>
              </div>
            ) : null}
          </dl>

          {song.attribution || song.source || song.license || song.copyright ? (
            <div className="mt-5 rounded-xl bg-muted p-4 text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground">Attribution & licensing</p>
              <ul className="mt-1 space-y-0.5">
                {song.attribution ? <li>{song.attribution}</li> : null}
                {song.source ? <li>Source: {song.source}</li> : null}
                {song.license ? <li>License: {song.license}</li> : null}
                {song.copyright ? <li>{song.copyright}</li> : null}
              </ul>
            </div>
          ) : null}

          <div className="mt-5">
            <h3 className="text-sm font-semibold">Rate this arrangement</h3>
            <div className="mt-2">
              <RatingControl
                songId={song.id}
                userRating={myRating?.value ?? null}
                signedIn={!!user}
                ratingAvg={song.ratingAvg}
                ratingCount={song.ratingCount}
              />
            </div>
          </div>
        </div>

        <aside className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-bold">More from {song.artist.name}</h2>
          {related.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              This is the only arrangement from this artist so far.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/songs/${item.slug}`}
                    className="group flex items-center gap-3 rounded-xl p-1.5 transition hover:bg-muted"
                  >
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                      <CoverImage title={item.title} src={item.coverImage} rounded="rounded-lg" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium group-hover:text-primary">
                        {item.title}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {item.musicalKey} · ★ {item.ratingAvg.toFixed(1)}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>

      {/* Comments */}
      <div className="mt-12">
        <CommentSection
          songKey={song.slug}
          initialComments={commentItems}
          signedIn={!!user}
          currentUserId={user?.id ?? null}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}
