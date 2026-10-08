import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { timeAgo } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/skeleton";
import { ReportRowActions } from "@/components/admin/report-row-actions";
import {
  FilterBar,
  SelectFilter,
  TableShell,
  Td,
  Th,
  Tr,
} from "@/components/admin/table";
import { Flag } from "lucide-react";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 20;
const STATUSES = ["PENDING", "RESOLVED", "DISMISSED", "ALL"] as const;

export default async function AdminReportsPage({
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

  const [total, reports] = await Promise.all([
    db.report.count({ where }),
    db.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { reporter: { select: { id: true, username: true } } },
    }),
  ]);

  // Resolve the reported object for each report type.
  const commentIds = reports
    .filter((r) => r.entityType === "COMMENT")
    .map((r) => r.entityId);
  const songIds = reports.filter((r) => r.entityType === "SONG").map((r) => r.entityId);
  const userIds = reports.filter((r) => r.entityType === "USER").map((r) => r.entityId);

  const [comments, songs, users] = await Promise.all([
    commentIds.length
      ? db.comment.findMany({
          where: { id: { in: commentIds } },
          select: {
            id: true,
            content: true,
            status: true,
            user: { select: { username: true } },
            song: { select: { title: true, slug: true } },
          },
        })
      : [],
    songIds.length
      ? db.song.findMany({
          where: { id: { in: songIds } },
          select: { id: true, title: true, slug: true, status: true },
        })
      : [],
    userIds.length
      ? db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, isActive: true },
        })
      : [],
  ]);

  const commentById = new Map(comments.map((c) => [c.id, c]));
  const songById = new Map(songs.map((s) => [s.id, s]));
  const userById = new Map(users.map((u) => [u.id, u]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Reports</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          User-flagged content. Resolving a comment report hides the comment and
          records the decision in the audit log.
        </p>
      </div>

      <FilterBar resetHref="/admin/reports">
        <SelectFilter
          label="Status"
          name="status"
          value={status}
          options={[
            { value: "PENDING", label: "Open" },
            { value: "RESOLVED", label: "Resolved" },
            { value: "DISMISSED", label: "Dismissed" },
            { value: "ALL", label: "All" },
          ]}
        />
      </FilterBar>

      {reports.length === 0 ? (
        <EmptyState
          icon={<Flag className="h-6 w-6" aria-hidden />}
          title={status === "PENDING" ? "No open reports" : "No reports"}
          description={
            status === "PENDING"
              ? "Nothing is waiting for a moderation decision."
              : "Try a different status filter."
          }
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} report{total === 1 ? "" : "s"}
          </p>
          <TableShell minWidth={940}>
            <thead>
              <tr>
                <Th>Reason</Th>
                <Th>Reported content</Th>
                <Th>Reporter</Th>
                <Th>Filed</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => {
                const comment = commentById.get(report.entityId);
                const song = songById.get(report.entityId);
                const user = userById.get(report.entityId);
                return (
                  <Tr key={report.id}>
                    <Td className="max-w-xs">
                      <p className="line-clamp-2">{report.reason}</p>
                      <Badge className="mt-1 bg-muted text-muted-foreground ring-border">
                        {report.entityType}
                      </Badge>
                    </Td>
                    <Td className="max-w-sm">
                      {comment ? (
                        <>
                          <p className="line-clamp-2 text-sm">{comment.content}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            by {comment.user.username} on{" "}
                            <Link
                              href={`/songs/${comment.song.slug}`}
                              className="text-primary hover:underline"
                            >
                              {comment.song.title}
                            </Link>
                          </p>
                        </>
                      ) : song ? (
                        <Link
                          href={`/songs/${song.slug}`}
                          className="font-medium hover:text-primary"
                        >
                          {song.title}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {song.status}
                          </span>
                        </Link>
                      ) : user ? (
                        <p className="text-sm">
                          {user.username}
                          <span className="ml-2 text-xs text-muted-foreground">
                            {user.isActive ? "active" : "disabled"}
                          </span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          {report.entityType.toLowerCase()} no longer exists
                        </p>
                      )}
                    </Td>
                    <Td className="text-muted-foreground">
                      {report.reporter?.username ?? "anonymous"}
                    </Td>
                    <Td className="whitespace-nowrap text-muted-foreground">
                      {timeAgo(report.createdAt)}
                    </Td>
                    <Td>
                      <StatusBadge value={report.status} />
                    </Td>
                    <Td>
                      <ReportRowActions id={report.id} status={report.status} />
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </TableShell>

          <div className="mt-6">
            <Pagination
              page={page}
              totalPages={totalPages}
              basePath="/admin/reports"
              params={{ status: status === "PENDING" ? undefined : status }}
            />
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-muted-foreground">
        Reported comments:{" "}
        <Link href="/admin/comments" className="text-primary hover:underline">
          review them in the comment queue
        </Link>
        .
      </p>
    </div>
  );
}
