import Link from "next/link";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { timeAgo, formatDate } from "@/lib/utils";
import { buttonClasses } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/skeleton";
import {
  BarChart3,
  Flag,
  Inbox,
  MessageSquare,
  Music4,
  ScrollText,
  TrendingUp,
  Users,
} from "lucide-react";

export const metadata = { title: "Overview" };
export const dynamic = "force-dynamic";

function Stat({
  icon,
  label,
  value,
  href,
  tone = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  href: string;
  tone?: "default" | "alert";
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span
        className={
          tone === "alert"
            ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive"
            : "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary"
        }
      >
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-2xl font-bold leading-none">{value}</span>
        <span className="mt-1 block truncate text-xs text-muted-foreground">
          {label}
        </span>
      </span>
    </Link>
  );
}

function auditSummary(entry: {
  action: string;
  entityType: string;
  metadata: string | null;
}): string {
  const meta = entry.metadata ? (JSON.parse(entry.metadata) as Record<string, unknown>) : {};
  const title = typeof meta.title === "string" ? ` “${meta.title}”` : "";
  const name = typeof meta.name === "string" ? ` “${meta.name}”` : "";
  return `${entry.action.replace(/_/g, " ").toLowerCase()}${title}${name}`;
}

export default async function AdminOverviewPage() {
  await requireAdmin();

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    newUsersWeek,
    totalSongs,
    publishedSongs,
    pendingSongs,
    pendingReports,
    totalComments,
    totalViews,
    recentAudit,
    pendingList,
    topSongs,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: since } } }),
    db.song.count(),
    db.song.count({ where: { status: "PUBLISHED" } }),
    db.song.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
        difficulty: true,
        artist: { select: { name: true } },
        createdBy: { select: { username: true } },
      },
    }),
    db.report.count({ where: { status: "PENDING" } }),
    db.comment.count(),
    db.song.aggregate({ _sum: { viewCount: true } }),
    db.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { admin: { select: { username: true } } },
    }),
    db.song.count({ where: { status: "PENDING" } }),
    db.song.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        slug: true,
        viewCount: true,
        ratingAvg: true,
        artist: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Catalogue health, moderation queues and the latest administrative
          actions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          icon={<Users className="h-5 w-5" aria-hidden />}
          label={`Members (${newUsersWeek} new this week)`}
          value={totalUsers}
          href="/admin/users"
        />
        <Stat
          icon={<Music4 className="h-5 w-5" aria-hidden />}
          label={`Songs (${publishedSongs} published)`}
          value={totalSongs}
          href="/admin/songs"
        />
        <Stat
          icon={<Inbox className="h-5 w-5" aria-hidden />}
          label="Awaiting moderation"
          value={pendingList}
          href="/admin/submissions"
          tone={pendingList > 0 ? "alert" : "default"}
        />
        <Stat
          icon={<Flag className="h-5 w-5" aria-hidden />}
          label="Open reports"
          value={pendingReports}
          href="/admin/reports"
          tone={pendingReports > 0 ? "alert" : "default"}
        />
        <Stat
          icon={<MessageSquare className="h-5 w-5" aria-hidden />}
          label="Comments"
          value={totalComments}
          href="/admin/comments"
        />
        <Stat
          icon={<TrendingUp className="h-5 w-5" aria-hidden />}
          label="Total song views"
          value={totalViews._sum.viewCount ?? 0}
          href="/admin/analytics"
        />
        <Stat
          icon={<BarChart3 className="h-5 w-5" aria-hidden />}
          label="Analytics"
          value="Open"
          href="/admin/analytics"
        />
        <Stat
          icon={<ScrollText className="h-5 w-5" aria-hidden />}
          label="Audit trail"
          value="Open"
          href="/admin/audit"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Moderation queue */}
        <section aria-labelledby="queue-heading" className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="queue-heading" className="font-semibold">
              Moderation queue
            </h2>
            <Link
              href="/admin/submissions"
              className="text-sm font-medium text-primary hover:underline"
            >
              Review all
            </Link>
          </div>

          {pendingSongs.length === 0 ? (
            <EmptyState
              icon={<Inbox className="h-6 w-6" aria-hidden />}
              title="Queue is clear"
              description="No submissions are waiting for review."
            />
          ) : (
            <ul className="divide-y divide-border">
              {pendingSongs.map((song) => (
                <li key={song.id} className="flex items-center gap-3 py-3 first:pt-0">
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/songs/${song.slug}`}
                      className="truncate font-medium hover:text-primary"
                    >
                      {song.title}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {song.artist.name} · by{" "}
                      {song.createdBy?.username ?? "unknown"} ·{" "}
                      {timeAgo(song.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value="PENDING" />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent audit */}
        <section aria-labelledby="audit-heading" className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 id="audit-heading" className="font-semibold">
              Recent admin actions
            </h2>
            <Link
              href="/admin/audit"
              className="text-sm font-medium text-primary hover:underline"
            >
              Full audit log
            </Link>
          </div>

          {recentAudit.length === 0 ? (
            <EmptyState
              icon={<ScrollText className="h-6 w-6" aria-hidden />}
              title="No actions yet"
              description="Administrative changes will appear here."
            />
          ) : (
            <ul className="space-y-3">
              {recentAudit.map((entry) => (
                <li key={entry.id} className="flex items-start gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate">
                      <span className="font-medium">{entry.admin.username}</span>{" "}
                      {auditSummary(entry)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry.entityType} · {formatDate(entry.createdAt)} ·{" "}
                      {timeAgo(entry.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Top songs */}
      <section aria-labelledby="top-heading" className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="top-heading" className="font-semibold">
            Most viewed published songs
          </h2>
          <Link href="/admin/analytics" className={buttonClasses("ghost", "sm")}>
            See analytics
          </Link>
        </div>
        <ol className="divide-y divide-border">
          {topSongs.map((song, index) => (
            <li key={song.id} className="flex items-center gap-3 py-3 first:pt-0">
              <span className="w-6 shrink-0 text-sm font-semibold text-muted-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Link
                  href={`/songs/${song.slug}`}
                  className="truncate font-medium hover:text-primary"
                >
                  {song.title}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {song.artist.name}
                </p>
              </div>
              <span className="shrink-0 text-sm text-muted-foreground">
                {song.viewCount.toLocaleString()} views · ★{" "}
                {song.ratingAvg.toFixed(1)}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
