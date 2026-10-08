import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { searchable, timeAgo, truncate } from "@/lib/utils";
import { COMMENT_STATUSES } from "@/lib/constants";
import { Avatar } from "@/components/ui/avatar";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/skeleton";
import { CommentRowActions } from "@/components/admin/comment-row-actions";
import {
  FilterBar,
  SelectFilter,
  TableShell,
  Td,
  TextFilter,
  Th,
  Tr,
} from "@/components/admin/table";
import { MessageSquare } from "lucide-react";

export const metadata = { title: "Comments" };
export const dynamic = "force-dynamic";

type RawSearchParams = { [key: string]: string | string[] | undefined };

function str(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

const PAGE_SIZE = 20;

export default async function AdminCommentsPage({
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
  if (status && status !== "ALL") and.push({ status });
  if (q) {
    const needle = searchable(q);
    and.push({
      OR: [
        { content: { contains: needle } },
        { user: { username: { contains: needle } } },
        { song: { title: { contains: needle } } },
      ],
    });
  }
  const where = and.length > 0 ? { AND: and } : {};

  const [total, comments] = await Promise.all([
    db.comment.count({ where }),
    db.comment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        song: { select: { id: true, title: true, slug: true } },
      },
    }),
  ]);

  // Open reports are counted separately (generic entityType/entityId table).
  const ids = comments.map((c) => c.id);
  const grouped = ids.length
    ? await db.report.groupBy({
        by: ["entityId"],
        where: { entityType: "COMMENT", entityId: { in: ids }, status: "PENDING" },
        _count: { _all: true },
      })
    : [];
  const reportCount = new Map(grouped.map((g) => [g.entityId, g._count._all]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Comments</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Hide, restore or remove comments. Hidden comments stay in the database
          but disappear from song pages.
        </p>
      </div>

      <FilterBar resetHref="/admin/comments">
        <TextFilter
          label="Search"
          name="q"
          value={q}
          placeholder="Comment, user or song…"
        />
        <SelectFilter
          label="Status"
          name="status"
          value={status || "ALL"}
          options={[
            { value: "ALL", label: "All statuses" },
            ...COMMENT_STATUSES.map((value) => ({ value, label: value })),
          ]}
        />
      </FilterBar>

      {comments.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-6 w-6" aria-hidden />}
          title="No comments match"
          description="Try a different search or status filter."
        />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground">
            {total} comment{total === 1 ? "" : "s"}
          </p>
          <TableShell minWidth={940}>
            <thead>
              <tr>
                <Th>Comment</Th>
                <Th>Author</Th>
                <Th>Song</Th>
                <Th>Status</Th>
                <Th>Posted</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <Tr key={comment.id}>
                  <Td className="max-w-md">
                    <p className="line-clamp-2">{comment.content}</p>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2">
                      <Avatar
                        name={comment.user.username}
                        src={comment.user.avatar}
                        size={26}
                      />
                      <span className="text-sm">{comment.user.username}</span>
                    </div>
                  </Td>
                  <Td>
                    <Link
                      href={`/songs/${comment.song.slug}`}
                      className="text-sm font-medium hover:text-primary"
                    >
                      {comment.song.title}
                    </Link>
                  </Td>
                  <Td>
                    <StatusBadge value={comment.status} />
                    {comment.status === "PENDING" ? (
                      <Badge className="ml-1 bg-muted text-muted-foreground ring-border">
                        auto
                      </Badge>
                    ) : null}
                  </Td>
                  <Td className="whitespace-nowrap text-muted-foreground">
                    {timeAgo(comment.createdAt)}
                  </Td>
                  <Td>
                    <CommentRowActions
                      id={comment.id}
                      preview={truncate(comment.content, 60)}
                      status={comment.status}
                      reportCount={reportCount.get(comment.id) ?? 0}
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
              basePath="/admin/comments"
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
