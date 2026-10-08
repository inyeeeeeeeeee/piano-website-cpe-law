import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { searchable, timeAgo } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/skeleton";
import {
  ArtistRowActions,
  NewArtistButton,
  type ArtistRow,
} from "@/components/admin/artist-actions";
import {
  FilterBar,
  TableShell,
  Td,
  TextFilter,
  Th,
  Tr,
} from "@/components/admin/table";
import { Library } from "lucide-react";

export const metadata = { title: "Artists" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 20;

export default async function AdminArtistsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const q = str(raw.q).trim();
  const page = Math.max(1, Number.parseInt(str(raw.page), 10) || 1);

  const where = q ? { searchName: { contains: searchable(q) } } : {};

  const [total, artists] = await Promise.all([
    db.artist.count({ where }),
    db.artist.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        slug: true,
        biography: true,
        image: true,
        createdAt: true,
        _count: { select: { songs: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows: ArtistRow[] = artists.map((a) => ({
    id: a.id,
    name: a.name,
    biography: a.biography,
    image: a.image,
    songCount: a._count.songs,
  }));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Artists</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The artist index. Deleting an artist cascades to their songs, so the
            confirmation spells out the blast radius.
          </p>
        </div>
        <NewArtistButton />
      </div>

      <FilterBar resetHref="/admin/artists">
        <TextFilter
          label="Search name"
          name="q"
          value={q}
          placeholder="Artist name…"
        />
      </FilterBar>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Library className="h-6 w-6" aria-hidden />}
          title={q ? "No artists match" : "No artists yet"}
          description={
            q
              ? "Try a different search term."
              : "Create the first artist to start catalogue entries."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} artist{total === 1 ? "" : "s"}
          </p>
          <TableShell minWidth={820}>
            <thead>
              <tr>
                <Th>Artist</Th>
                <Th>Songs</Th>
                <Th>Biography</Th>
                <Th>Added</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {artists.map((artist) => (
                <Tr key={artist.id}>
                  <Td>
                    <Link
                      href={`/artists/${artist.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {artist.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">/{artist.slug}</p>
                  </Td>
                  <Td className="text-muted-foreground">
                    {artist._count.songs} song{artist._count.songs === 1 ? "" : "s"}
                  </Td>
                  <Td className="max-w-xs">
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {artist.biography ?? "—"}
                    </p>
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(artist.createdAt)}
                  </Td>
                  <Td>
                    <ArtistRowActions
                      artist={rows.find((r) => r.id === artist.id)!}
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
              basePath="/admin/artists"
              params={{ q: q || undefined }}
            />
          </div>
        </>
      )}
    </div>
  );
}
