import Link from "next/link";
import { db } from "@/lib/db";
import { initials } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { buttonClasses } from "@/components/ui/button";
import { SearchX } from "lucide-react";
import { Suspense } from "react";

export const metadata = {
  title: "Artists",
  description: "Browse every artist with arrangements in the Piano Keys Tab library.",
};

const PAGE_SIZE = 24;

type Raw = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

async function ArtistGrid({ q, page }: { q: string; page: number }) {
  const where = q
    ? {
        OR: [
          { searchName: { contains: q.toLowerCase() } },
          { name: { contains: q } },
        ],
      }
    : {};

  const [total, artists] = await Promise.all([
    db.artist.count({ where }),
    db.artist.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { _count: { select: { songs: { where: { status: "PUBLISHED" } } } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  if (artists.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
        title="No artists found"
        description="Try a different search term."
        action={
          <Link href="/artists" className="text-sm font-medium text-primary hover:underline">
            Clear search
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {total} artist{total === 1 ? "" : "s"}
      </p>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {artists.map((artist) => (
          <li key={artist.id}>
            <Link
              href={`/artists/${artist.slug}`}
              className="group flex flex-col items-center rounded-2xl border border-border bg-card p-5 text-center transition hover:-translate-y-1 hover:shadow-md"
            >
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft text-xl font-bold text-primary">
                {initials(artist.name)}
              </span>
              <span className="mt-3 w-full truncate text-sm font-semibold group-hover:text-primary">
                {artist.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {artist._count.songs} arrangement{artist._count.songs === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/artists"
          params={q ? { q } : {}}
        />
      </div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card p-5">
          <Skeleton className="mx-auto h-16 w-16 rounded-full" />
          <Skeleton className="mx-auto mt-3 h-4 w-2/3" />
          <Skeleton className="mx-auto mt-2 h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<Raw> }) {
  const raw = await searchParams;
  const q = str(raw.q).trim();
  const page = Math.max(1, Number(str(raw.page) || "1") || 1);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Artists</h1>
          <p className="mt-2 text-muted-foreground">
            Every artist with at least one arrangement in the library.
          </p>
        </div>
        <form className="flex items-center gap-2" action="/artists">
          <label htmlFor="artist-search" className="sr-only">
            Search artists
          </label>
          <input
            id="artist-search"
            name="q"
            defaultValue={q}
            placeholder="Search artists…"
            className="h-9 w-56 rounded-lg border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-2 focus-visible:outline-ring"
          />
          <button type="submit" className={buttonClasses("secondary", "md")}>
            Search
          </button>
        </form>
      </div>

      <Suspense key={`${q}:${page}`} fallback={<GridSkeleton />}>
        <ArtistGrid q={q} page={page} />
      </Suspense>
    </div>
  );
}
