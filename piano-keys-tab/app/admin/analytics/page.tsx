import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { difficultyMeta, SONG_STATUSES } from "@/lib/constants";
import {
  DifficultyChart,
  GrowthChart,
  RatingDistributionChart,
  StatusBreakdownChart,
  TopSongsChart,
  type NamedCount,
  type TimePoint,
} from "@/components/admin/analytics-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const index = Number(month) - 1;
  return `${names[index] ?? month} ${year.slice(2)}`;
}

/** Last 12 calendar months, oldest first. */
function lastTwelveMonths(): string[] {
  const keys: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return keys;
}

function BigStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold leading-none">{value}</p>
        {hint ? (
          <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function AdminAnalyticsPage() {
  await requireAdmin();

  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 11);
  cutoff.setDate(1);
  cutoff.setHours(0, 0, 0, 0);

  const [
    statusGroups,
    difficultyGroups,
    ratingGroups,
    recentSongs,
    recentUsers,
    topSongs,
    totals,
  ] = await Promise.all([
    db.song.groupBy({ by: ["status"], _count: { _all: true } }),
    db.song.groupBy({
      by: ["difficulty"],
      where: { status: "PUBLISHED" },
      _count: { _all: true },
    }),
    db.rating.groupBy({ by: ["value"], _count: { _all: true } }),
    db.song.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { createdAt: true },
    }),
    db.user.findMany({
      where: { createdAt: { gte: cutoff } },
      select: { createdAt: true },
    }),
    db.song.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { viewCount: "desc" },
      take: 10,
      select: { title: true, viewCount: true },
    }),
    Promise.all([
      db.song.count(),
      db.user.count(),
      db.comment.count(),
      db.rating.aggregate({ _sum: { value: true }, _count: { value: true } }),
      db.song.aggregate({ _sum: { viewCount: true } }),
      db.song.count({ where: { status: "PUBLISHED" } }),
      db.songbook.count(),
      db.song.count({ where: { status: "PENDING" } }),
    ]),
  ]);

  const [
    songCount,
    userCount,
    commentCount,
    ratingAgg,
    viewAgg,
    publishedCount,
    songbookCount,
    pendingCount,
  ] = totals;

  // ---- charts data -------------------------------------------------------
  const statusByName = new Map(statusGroups.map((g) => [g.status, g._count._all]));
  const statusData: NamedCount[] = SONG_STATUSES.map((status) => ({
    name: status,
    value: statusByName.get(status) ?? 0,
  })).filter((d) => d.value > 0);

  const difficultyData: NamedCount[] = ["BEGINNER", "EASY", "INTERMEDIATE", "ADVANCED", "EXPERT"]
    .map((level) => {
      const row = difficultyGroups.find((g) => g.difficulty === level);
      return { name: difficultyMeta(level).label, value: row?._count._all ?? 0 };
    })
    .filter((d) => d.value > 0);

  const ratingData: NamedCount[] = [5, 4, 3, 2, 1].map((star) => {
    const row = ratingGroups.find((g) => g.value === star);
    return { name: `${star}★`, value: row?._count._all ?? 0 };
  });

  const months = lastTwelveMonths();
  const songByMonth = new Map<string, number>();
  const userByMonth = new Map<string, number>();
  for (const song of recentSongs) {
    const key = monthKey(song.createdAt);
    songByMonth.set(key, (songByMonth.get(key) ?? 0) + 1);
  }
  for (const user of recentUsers) {
    const key = monthKey(user.createdAt);
    userByMonth.set(key, (userByMonth.get(key) ?? 0) + 1);
  }
  const growthData: TimePoint[] = months.map((key) => ({
    label: monthLabel(key),
    songs: songByMonth.get(key) ?? 0,
    users: userByMonth.get(key) ?? 0,
  }));

  const topData: NamedCount[] = topSongs.map((song) => ({
    name: song.title.length > 18 ? `${song.title.slice(0, 17)}…` : song.title,
    value: song.viewCount,
  }));

  const avgRating =
    ratingAgg._count.value > 0
      ? ((ratingAgg._sum.value ?? 0) / ratingAgg._count.value).toFixed(2)
      : "—";

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggregated directly from SQLite — no third-party tracking, no client
          analytics scripts.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BigStat label="Songs" value={songCount} hint={`${publishedCount} published · ${pendingCount} pending`} />
        <BigStat label="Members" value={userCount} hint={`${songbookCount} songbooks created`} />
        <BigStat label="Total views" value={(viewAgg._sum.viewCount ?? 0).toLocaleString()} hint="Across every published song" />
        <BigStat
          label="Average rating"
          value={avgRating}
          hint={`${ratingAgg._count.value} ratings · ${commentCount} comments`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <StatusBreakdownChart data={statusData} />
        <DifficultyChart data={difficultyData} />
        <RatingDistributionChart data={ratingData} />
        <TopSongsChart data={topData} />
        <div className="lg:col-span-2">
          <GrowthChart data={growthData} />
        </div>
      </div>
    </div>
  );
}
