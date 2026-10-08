import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { SongbookSongs, type SongbookEntry } from "@/components/features/songbook-songs";
import { BookMarked, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const book = await db.songbook.findUnique({ where: { id }, select: { name: true } });
  return { title: book ? book.name : "Songbook" };
}

export default async function SongbookDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(`/songbooks/${id}`)}`);

  const book = await db.songbook.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true } },
      songs: {
        orderBy: { order: "asc" },
        include: {
          song: {
            select: {
              id: true,
              title: true,
              slug: true,
              difficulty: true,
              musicalKey: true,
              ratingAvg: true,
              coverImage: true,
              status: true,
              artist: { select: { name: true, slug: true } },
            },
          },
        },
      },
    },
  });

  if (!book) notFound();
  const canEdit = book.userId === user.id || user.role === "ADMIN";
  if (!canEdit) redirect("/songbooks");

  const entries: SongbookEntry[] = book.songs.map((entry) => ({
    id: entry.id,
    order: entry.order,
    song: {
      ...entry.song,
      // Drafts are hidden from everyone except their owner/admins.
      status: entry.song.status,
    },
  })).filter((entry) => entry.song.status === "PUBLISHED" || canEdit);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <Link
        href="/songbooks"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All songbooks
      </Link>

      <header className="mt-4 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <BookMarked className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{book.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Owned by {book.user.username} · updated {timeAgo(book.updatedAt)}
          </p>
          {book.description ? (
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{book.description}</p>
          ) : null}
        </div>
      </header>

      <div className="mt-8">
        <SongbookSongs songbookId={book.id} initial={entries} />
      </div>
    </div>
  );
}
