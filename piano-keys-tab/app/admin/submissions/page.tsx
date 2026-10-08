import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Pagination } from "@/components/ui/pagination";
import { DifficultyBadge, StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import { SubmissionActions } from "@/components/admin/submission-actions";
import { FilterBar, SelectFilter, TableShell, Td, Th, Tr } from "@/components/admin/table";
import { Inbox } from "lucide-react";

export const metadata = { title: "Submissions" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 15;
const STATUSES = ["PENDING", "PUBLISHED", "REJECTED", "ARCHIVED", "ALL"] as const;

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();
  const raw = await searchParams;

  const status = (STATUSES as readonly string[]).includes(str(raw.status))
    ? str(raw.status)
    : "PENDING";
  const page = Math.max(1, Number.parseInt(str(raw.page), 10) || 1);

  const where = status === "ALL" ? {} : { status };

  const [total, songs] = await Promise.all([
    db.song.count({ where }),
    db.song.findMany({
      where,
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        difficulty: true,
        musicalKey: true,
        createdAt: true,
        updatedAt: true,
        artist: { select: { name: true } },
        createdBy: { select: { username: true } },
        _count: { select: { versions: true, comments: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Submissions</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Review community arrangements. Approving publishes the song and every
          version; the contributor is notified either way.
        </p>
      </div>

      <FilterBar resetHref="/admin/submissions">
        <SelectFilter
          label="Status"
          name="status"
          value={status}
          options={[
            { value: "PENDING", label: "Pending review" },
            { value: "PUBLISHED", label: "Published" },
            { value: "REJECTED", label: "Rejected" },
            { value: "ARCHIVED", label: "Archived" },
            { value: "ALL", label: "All statuses" },
          ]}
        />
      </FilterBar>

      {songs.length === 0 ? (
        <EmptyState
          icon={<Inbox className="h-6 w-6" aria-hidden />}
          title={status === "PENDING" ? "Nothing waiting for review" : "No submissions"}
          description={
            status === "PENDING"
              ? "New community submissions will appear here."
              : "Try a different status filter."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} submission{total === 1 ? "" : "s"} in this view · oldest first,
            so nothing waits too long.
          </p>
          <TableShell minWidth={920}>
            <thead>
              <tr>
                <Th>Song</Th>
                <Th>Contributor</Th>
                <Th>Versions</Th>
                <Th>Difficulty</Th>
                <Th>Submitted</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {songs.map((song) => (
                <Tr key={song.id}>
                  <Td>
                    <Link
                      href={`/songs/${song.slug}`}
                      className="font-medium hover:text-primary"
                    >
                      {song.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {song.artist.name} · {song.musicalKey}
                    </p>
                  </Td>
                  <Td>{song.createdBy?.username ?? "—"}</Td>
                  <Td>
                    {song._count.versions} version{song._count.versions === 1 ? "" : "s"}
                    <p className="text-xs text-muted-foreground">
                      {song._count.comments} comment
                      {song._count.comments === 1 ? "" : "s"}
                    </p>
                  </Td>
                  <Td>
                    <DifficultyBadge value={song.difficulty} showIntensity={false} />
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(song.createdAt)}
                    <p className="text-xs">updated {timeAgo(song.updatedAt)}</p>
                  </Td>
                  <Td>
                    <StatusBadge value={song.status} />
                  </Td>
                  <Td>
                    <SubmissionActions songId={song.id} title={song.title} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </TableShell>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin/submissions"
              params={{ status: status === "PENDING" ? undefined : status }}
            />
          </div>
        </>
      )}
    </div>
  );
}
