import Link from "next/link";
import { Suspense } from "react";
import { db } from "@/lib/db";
import { buildSongOrderBy, buildSongWhere } from "@/lib/search";
import { searchParamsSchema, type SearchParams } from "@/lib/validation";
import {
  DIFFICULTIES,
  MUSICAL_KEYS,
  PAGE_SIZE,
  SORT_OPTIONS,
  difficultyMeta,
} from "@/lib/constants";
import { formatDuration } from "@/lib/utils";
import { EmptyState, Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/ui/pagination";
import { DifficultyBadge, FeaturedBadge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { SongsFilters, type FilterOption } from "@/components/features/songs-filters";
import { SearchX } from "lucide-react";

export const metadata = {
  title: "Browse songs",
  description:
    "Search and filter the community piano tab library by artist, difficulty, key and tag.",
};

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function parse(raw: RawSearchParams): SearchParams {
  return searchParamsSchema.parse({
    q: str(raw.q) || undefined,
    artist: str(raw.artist) || undefined,
    difficulty: str(raw.difficulty) || undefined,
    key: str(raw.key) || undefined,
    tag: str(raw.tag) || undefined,
    sort: str(raw.sort) || undefined,
    page: str(raw.page) || undefined,
  });
}

/** Query-string builder that keeps every active filter when paginating. */
function paginationParams(raw: RawSearchParams): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const key of ["q", "artist", "difficulty", "key", "tag", "sort"]) {
    const value = str(raw[key]);
    if (value) out[key] = value;
  }
  return out;
}

async function Results({ raw }: { raw: RawSearchParams }) {
  const params = parse(raw);
  const where = buildSongWhere(params);
  const orderBy = buildSongOrderBy(params.sort);
  const page = params.page;

  const [total, songs] = await Promise.all([
    db.song.count({ where }),
    db.song.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        musicalKey: true,
        duration: true,
        bpm: true,
        tags: true,
        ratingAvg: true,
        ratingCount: true,
        viewCount: true,
        coverImage: true,
        isFeatured: true,
        artist: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE);

  if (songs.length === 0) {
    return (
      <EmptyState
        icon={<SearchX className="h-6 w-6" aria-hidden="true" />}
        title="No songs match those filters"
        description="Try a broader search term, or clear some filters to see the full catalogue."
        action={
          <Link href="/songs" className="text-sm font-medium text-primary hover:underline">
            Clear all filters
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        Showing <span className="font-medium text-foreground">{from}–{to}</span> of{" "}
        <span className="font-medium text-foreground">{total}</span> song{total === 1 ? "" : "s"}
      </p>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {songs.map((song) => (
          <Link
            key={song.id}
            href={`/songs/${song.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="relative h-32 w-full overflow-hidden">
              <CoverImage title={song.title} artist={song.artist.name} src={song.coverImage} rounded="rounded-none" />
              {song.isFeatured ? (
                <span className="absolute left-2 top-2">
                  <FeaturedBadge />
                </span>
              ) : null}
            </div>
            <div className="flex flex-1 flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold leading-tight group-hover:text-primary">
                    {song.title}
                  </h2>
                  <p className="truncate text-sm text-muted-foreground">{song.artist.name}</p>
                </div>
                <DifficultyBadge value={song.difficulty} showIntensity={false} className="shrink-0" />
              </div>

              {song.tags ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {song.tags
                    .split(",")
                    .filter(Boolean)
                    .slice(0, 3)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              ) : null}

              <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                <span>
                  {song.musicalKey} · {song.bpm} BPM · {formatDuration(song.duration)}
                </span>
                <span aria-label={`Rated ${song.ratingAvg} out of 5 from ${song.ratingCount} ratings`}>
                  ★ {song.ratingAvg.toFixed(1)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Pagination
          page={page}
          totalPages={totalPages}
          basePath="/songs"
          params={paginationParams(raw)}
        />
      </div>
    </div>
  );
}

export function ResultsSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-4 w-48" />
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-border bg-card">
            <Skeleton className="h-32 rounded-none" />
            <div className="space-y-2 p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function SongsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const raw = await searchParams;

  const [artists, tagRows] = await Promise.all([
    db.artist.findMany({
      orderBy: { name: "asc" },
      select: { slug: true, name: true },
    }),
    db.song.findMany({
      where: { status: "PUBLISHED" },
      select: { tags: true },
    }),
  ]);

  const artistOptions: FilterOption[] = artists.map((a) => ({ value: a.slug, label: a.name }));
  const tagOptions: FilterOption[] = Array.from(
    new Set(
      tagRows
        .flatMap((row) => row.tags.split(","))
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  )
    .sort()
    .map((tag) => ({ value: tag, label: tag }));

  const difficultyOptions: FilterOption[] = DIFFICULTIES.map((d) => ({
    value: d,
    label: difficultyMeta(d).label,
  }));
  const keyOptions: FilterOption[] = MUSICAL_KEYS.map((k) => ({ value: k, label: k }));
  const sortOptions: FilterOption[] = SORT_OPTIONS.map((s) => ({ value: s.value, label: s.label }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Browse songs</h1>
        <p className="mt-2 text-muted-foreground">
          Search the community library and filter by artist, difficulty, key and tag.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SongsFilters
            initial={{
              q: str(raw.q),
              artist: str(raw.artist),
              difficulty: str(raw.difficulty),
              key: str(raw.key),
              tag: str(raw.tag),
              sort: str(raw.sort) || "popular",
            }}
            artistOptions={artistOptions}
            difficulties={difficultyOptions}
            keys={keyOptions}
            tags={tagOptions}
            sorts={sortOptions}
          />
        </aside>

        <section aria-label="Search results" aria-busy="true">
          <Suspense key={JSON.stringify(raw)} fallback={<ResultsSkeleton />}>
            <Results raw={raw} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
