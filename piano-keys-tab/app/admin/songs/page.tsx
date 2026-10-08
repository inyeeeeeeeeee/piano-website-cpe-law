import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { searchable, timeAgo } from "@/lib/utils";
import { SONG_STATUSES } from "@/lib/constants";
import { Pagination } from "@/components/ui/pagination";
import { DifficultyBadge, FeaturedBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { SongRowActions } from "@/components/admin/song-row-actions";
import {
  FilterBar,
  SelectFilter,
  TableShell,
  Td,
  TextFilter,
  Th,
  Tr,
} from "@/components/admin/table";
import { SearchX } from "lucide-react";

export const metadata = { title: "Songs" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 20;

export default async function AdminSongsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const q = str(raw.q).trim();
  const status = str(raw.status).trim();
  const page = Math.max(1, Number.parseInt(str(raw.page), 10) || 1);

  const and: Record<string, unknown>[] = [];
  if (q) and.push({ searchTitle: { contains: searchable(q) } });
  if (status && status !== "ALL") and.push({ status });
  const where = and.length > 0 ? { AND: and } : {};

  const [total, songs] = await Promise.all([
    db.song.count({ where }),
    db.song.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        isFeatured: true,
        difficulty: true,
        musicalKey: true,
        bpm: true,
        ratingAvg: true,
        ratingCount: true,
        viewCount: true,
        createdAt: true,
        artist: { select: { name: true, slug: true } },
        createdBy: { select: { username: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Songs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Publish, feature or remove catalogue entries. Status changes apply to
          every version of the song.
        </p>
      </div>

      <FilterBar resetHref="/admin/songs">
        <TextFilter
          label="Search title"
          name="q"
          value={q}
          placeholder="Title…"
        />
        <SelectFilter
          label="Status"
          name="status"
          value={status || "ALL"}
          options={[
            { value: "ALL", label: "All statuses" },
            ...SONG_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
      </FilterBar>

      {songs.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" aria-hidden />}
          title="No songs match"
          description="Try a different search term or status filter."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} song{total === 1 ? "" : "s"} found
          </p>
          <TableShell minWidth={1000}>
            <thead>
              <tr>
                <Th>Song</Th>
                <Th>Status</Th>
                <Th>Difficulty</Th>
                <Th>Rating</Th>
                <Th>Views</Th>
                <Th>Author</Th>
                <Th>Created</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <Tr key={song.id}>
                  <Td>
                    <Link
                      href={`/songs/${song.slug}`}
                      className="flex items-center gap-2 font-medium hover:text-primary"
                    >
                      {song.title}
                      {song.isFeatured ? <FeaturedBadge /> : null}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <Link href={`/artists/${song.artist.slug}`} className="hover:text-primary">
                        {song.artist.name}
                      </Link>{" "}
                      · {song.musicalKey} · {song.bpm} BPM
                    </p>
                  </Td>
                  <Td>
                    <StatusBadge value={song.status} />
                  </Td>
                  <Td>
                    <DifficultyBadge value={song.difficulty} showIntensity={false} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    ★ {song.ratingAvg.toFixed(1)}{" "}
                    <span className="text-xs">({song.ratingCount})</span>
                  </Td>
                  <Td className="text-muted-foreground">
                    {song.viewCount.toLocaleString()}
                  </Td>
                  <Td className="text-muted-foreground">
                    {song.createdBy?.username ?? "—"}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(song.createdAt)}
                  </Td>
                  <Td>
                    <SongRowActions
                      id={song.id}
                      title={song.title}
                      status={song.status}
                      isFeatured={song.isFeatured}
                    />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin/songs"
              params={{
                q: q || undefined,
                status: status && status !== "ALL" ? status : undefined,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
