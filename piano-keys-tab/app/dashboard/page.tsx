import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { StatusBadge, DifficultyBadge, FeaturedBadge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { EmptyState } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bell,
  BookMarked,
  Heart,
  MessageSquare,
  Music4,
  Plus,
  Upload,
} from "lucide-react";

export const metadata = {
  title: "Dashboard",
  description: "Your activity on Piano Keys Tab — submissions, saved songs and notifications.",
};

export const dynamic = "force-dynamic";

function Stat({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-2xl font-bold leading-none">{value}</span>
        <span className="mt-1 block text-xs text-muted-foreground">{label}</span>
      </span>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();

  const [savedCount, bookCount, submissionCount, commentCount, submissions, saved, notifications] =
    await Promise.all([
      db.savedSong.count({ where: { userId: user.id } }),
      db.songbook.count({ where: { userId: user.id } }),
      db.song.count({ where: { createdById: user.id } }),
      db.comment.count({ where: { userId: user.id } }),
      db.song.findMany({
        where: { createdById: user.id },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          title: true,
          slug: true,
          status: true,
          difficulty: true,
          musicalKey: true,
          isFeatured: true,
          updatedAt: true,
          coverImage: true,
          artist: { select: { name: true } },
        },
      }),
      db.savedSong.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              musicalKey: true,
              ratingAvg: true,
              coverImage: true,
              artist: { select: { name: true } },
            },
          },
        },
      }),
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 8,
      }),
    ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.username}</h1>
          <p className="mt-2 text-muted-foreground">
            Everything you have saved, submitted and been notified about.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/songs" className={buttonClasses("outline", "md")}>
            <Music4 className="h-4 w-4" aria-hidden="true" /> Find a song
          </Link>
          <Link href="/submit-song" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Submit arrangement
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={<Heart className="h-5 w-5" aria-hidden="true" />} label="Saved songs" value={savedCount} href="/songs?sort=recent" />
        <Stat icon={<BookMarked className="h-5 w-5" aria-hidden="true" />} label="Songbooks" value={bookCount} href="/songbooks" />
        <Stat icon={<Upload className="h-5 w-5" aria-hidden="true" />} label="My submissions" value={submissionCount} href="/submit-song" />
        <Stat icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />} label="Comments written" value={commentCount} href="/songs" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Submissions */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>My submissions</CardTitle>
            <Link href="/submit-song" className="text-sm font-medium text-primary hover:underline">
              New submission
            </Link>
          </CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <EmptyState
                icon={<Upload className="h-6 w-6" aria-hidden="true" />}
                title="You have not submitted anything yet"
                description="Share an original arrangement — a moderator will review it before it goes live."
                action={
                  <Link href="/submit-song" className={buttonClasses("primary", "md")}>
                    Start a submission
                  </Link>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {submissions.map((song) => (
                  <li key={song.id} className="flex items-center gap-3 py-3 first:pt-0">
                    <div className="h-11 w-11 shrink-0 overflow-hidden rounded-lg">
                      <CoverImage
                        title={song.title}
                        artist={song.artist.name}
                        src={song.coverImage}
                        rounded="rounded-lg"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/songs/${song.slug}`}
                        className="truncate font-medium hover:text-primary"
                      >
                        {song.title}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {song.artist.name} · {song.musicalKey} · updated {timeAgo(song.updatedAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {song.isFeatured ? <FeaturedBadge /> : null}
                      <DifficultyBadge value={song.difficulty} showIntensity={false} />
                      <StatusBadge value={song.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" aria-hidden="true" /> Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing yet — moderation decisions and comments will show up here.
              </p>
            ) : (
              <ul className="space-y-3">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <Link
                      href={notification.link ?? "#"}
                      className="block rounded-xl border border-border p-3 transition hover:border-primary/40 hover:bg-muted"
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium">{notification.title}</span>
                        {!notification.isRead ? (
                          <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />
                        ) : null}
                      </span>
                      {notification.body ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {notification.body}
                        </span>
                      ) : null}
                      <span className="mt-1 block text-[11px] text-muted-foreground">
                        {timeAgo(notification.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saved songs */}
      <section className="mt-8" aria-labelledby="saved-heading">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="saved-heading" className="text-xl font-bold">
            Recently saved
          </h2>
          <Link href="/profile" className="text-sm font-medium text-primary hover:underline">
            View profile
          </Link>
        </div>

        {saved.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-6 w-6" aria-hidden="true" />}
            title="No saved songs yet"
            description="Press “Save” on any song page to keep it here."
            action={
              <Link href="/songs" className={buttonClasses("primary", "md")}>
                Browse songs
              </Link>
            }
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={`/songs/${entry.song.slug}`}
                  className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition hover:shadow-md"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
                    <CoverImage
                      title={entry.song.title}
                      artist={entry.song.artist.name}
                      src={entry.song.coverImage}
                      rounded="rounded-lg"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium group-hover:text-primary">
                      {entry.song.title}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {entry.song.artist.name} · {entry.song.musicalKey} · ★{" "}
                      {entry.song.ratingAvg.toFixed(1)}
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
