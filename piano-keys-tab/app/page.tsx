import Link from "next/link";
import { db } from "@/lib/db";
import { buttonClasses } from "@/components/ui/button";
import { DifficultyBadge, Badge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { EmptyState } from "@/components/ui/skeleton";
import { initials, formatDuration } from "@/lib/utils";
import {
  ArrowRight,
  BarChart3,
  BookMarked,
  CheckCircle2,
  Keyboard,
  Lock,
  MessageSquare,
  Palette,
  Search,
  Sparkles,
  Upload,
} from "lucide-react";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: Search, title: "Lightning search", text: "Full-text search across titles, artists, tags and genres, with filters, sorting and pagination." },
  { icon: Keyboard, title: "Practice studio", text: "Transpose, a built-in metronome, autoscroll, adjustable layout and fullscreen focus mode." },
  { icon: BookMarked, title: "Songbooks", text: "Organise arrangements into personal songbooks and keep your repertoire in one place." },
  { icon: MessageSquare, title: "Community", text: "Rate arrangements, leave comments and report anything that breaks the rules." },
  { icon: Upload, title: "Submissions", text: "Publish your own arrangements and get them reviewed by our moderation team." },
  { icon: BarChart3, title: "Admin analytics", text: "A full moderation suite with audit logs and usage analytics for administrators." },
  { icon: Palette, title: "Dark mode", text: "A hand-crafted light and dark theme that follows your system preference." },
  { icon: Lock, title: "Secure by design", text: "Hashed passwords, HTTP-only sessions, CSRF checks and server-side authorisation everywhere." },
];

const STEPS = [
  { n: "01", title: "Find a song", text: "Search the catalogue or browse artists to find the arrangement you want to learn." },
  { n: "02", title: "Open the practice view", text: "Transpose to an easier key, set the tempo and switch on the metronome." },
  { n: "03", title: "Save your progress", text: "Add it to a songbook, rate it and come back whenever you practise." },
];

function MiniKeyboard() {
  const whiteCount = 14;
  const blackAfter = new Set([0, 1, 3, 4, 5, 7, 8, 10, 11, 12]);
  const labels = ["C3", "C4", "C5"];

  return (
    <div className="relative select-none" aria-hidden="true">
      <div className="flex h-40 w-full overflow-hidden rounded-xl border border-border bg-background shadow-md sm:h-52">
        {Array.from({ length: whiteCount }, (_, i) => (
          <div
            key={i}
            className={`relative flex-1 border-r border-slate-300/70 last:border-r-0 ${
              [2, 6, 9].includes(i)
                ? "bg-gradient-to-b from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900"
                : "bg-gradient-to-b from-white to-slate-100 dark:from-slate-100 dark:to-slate-300"
            }`}
          >
            {i % 7 === 0 ? (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-slate-500">
                {labels[Math.floor(i / 7)]}
              </span>
            ) : null}
          </div>
        ))}
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex h-full">
        {Array.from({ length: whiteCount - 1 }, (_, i) => (
          <div key={i} className="relative flex-1">
            {blackAfter.has(i) ? (
              <div className="absolute right-0 top-0 z-10 h-[62%] w-[62%] translate-x-1/2 rounded-b-md bg-gradient-to-b from-slate-700 to-slate-950 shadow-md" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function HomePage() {
  const [songCount, artistCount, arrangementCount, popular, artists] = await Promise.all([
    db.song.count({ where: { status: "PUBLISHED" } }),
    db.artist.count(),
    db.songVersion.count({ where: { status: "PUBLISHED" } }),
    db.song.findMany({
      where: { status: "PUBLISHED" },
      include: { artist: { select: { name: true } } },
      orderBy: [{ viewCount: "desc" }, { ratingAvg: "desc" }],
      take: 6,
    }),
    db.artist.findMany({ orderBy: { name: "asc" }, take: 6 }),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(79,70,229,0.12),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
          <div className="text-center lg:text-left">
            <Badge className="mb-5 bg-primary-soft text-primary ring-primary/20">
              <Sparkles className="h-3 w-3" aria-hidden="true" /> Community piano tab library
            </Badge>
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-balance sm:text-5xl lg:text-6xl">
              Learn any song on the <span className="text-primary">piano keys</span>, one tab at a time.
            </h1>
            <p className="mt-5 text-lg text-balance text-muted-foreground">
              Piano Keys Tab is a community library of searchable, practice-ready piano arrangements — with
              transposition, metronome, autoscroll and songbooks built right in.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Link href="/register" className={buttonClasses("primary", "lg")}>
                Create free account <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/songs" className={buttonClasses("outline", "lg")}>
                Browse the library
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center lg:text-left">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Songs</dt>
                <dd className="text-2xl font-bold">{songCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Versions</dt>
                <dd className="text-2xl font-bold">{arrangementCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Artists</dt>
                <dd className="text-2xl font-bold">{artistCount}</dd>
              </div>
            </dl>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/20 to-transparent blur-2xl" />
            <div className="relative rounded-[2rem] border border-border bg-card p-4 shadow-lg">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="text-sm font-semibold">Practice view</span>
                <Badge className="bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900">
                  Transposed +2
                </Badge>
              </div>
              <MiniKeyboard />
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted px-3 py-2 text-center">
                  <div className="font-semibold">120 BPM</div>
                  <div className="text-muted-foreground">Metronome</div>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-center">
                  <div className="font-semibold">C major</div>
                  <div className="text-muted-foreground">Target key</div>
                </div>
                <div className="rounded-lg bg-muted px-3 py-2 text-center">
                  <div className="font-semibold">Autoscroll</div>
                  <div className="text-muted-foreground">On</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to practise smarter</h2>
          <p className="mt-3 text-muted-foreground">
            From discovery to mastery — the whole workflow lives in one place.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular songs */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Popular right now</h2>
            <p className="mt-2 text-muted-foreground">The arrangements the community practises the most.</p>
          </div>
          <Link href="/songs" className={buttonClasses("ghost", "md", "shrink-0")}>
            View all <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        {popular.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              icon={<Sparkles className="h-6 w-6" aria-hidden="true" />}
              title="No songs published yet"
              description="Run the database seed to load the demo library."
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((song) => (
              <Link
                key={song.id}
                href={`/songs/${song.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="h-36 w-full overflow-hidden rounded-none">
                  <CoverImage title={song.title} artist={song.artist.name} src={song.coverImage} />
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="truncate font-semibold leading-tight group-hover:text-primary">
                        {song.title}
                      </h3>
                      <p className="truncate text-sm text-muted-foreground">{song.artist.name}</p>
                    </div>
                    <DifficultyBadge value={song.difficulty} showIntensity={false} className="shrink-0" />
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3 text-xs text-muted-foreground">
                    <span>
                      {song.musicalKey} · {formatDuration(song.duration)}
                    </span>
                    <span>★ {song.ratingAvg.toFixed(1)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Artists */}
      <section className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Artists in the library</h2>
              <p className="mt-2 text-muted-foreground">Browse arrangements by artist.</p>
            </div>
            <Link href="/artists" className={buttonClasses("ghost", "md", "shrink-0")}>
              All artists <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {artists.map((artist) => (
              <Link
                key={artist.id}
                href={`/artists/${artist.slug}`}
                className="group rounded-2xl border border-border bg-card p-4 text-center transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft text-lg font-bold text-primary">
                  {initials(artist.name)}
                </div>
                <p className="mt-3 truncate text-sm font-semibold group-hover:text-primary">{artist.name}</p>
                <p className="text-xs text-muted-foreground">
                  {artist.biography ? "Profile" : "Artist"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-foreground text-background">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to start practising?</h2>
          <p className="mt-4 text-background/70">
            Create a free account to save songbooks, submit arrangements and join the community.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/register"
              className={buttonClasses("primary", "lg", "bg-primary hover:bg-primary/90")}
            >
              Get started — it&apos;s free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/about"
              className={buttonClasses(
                "outline",
                "lg",
                "border-background/30 bg-transparent text-background hover:bg-background/10"
              )}
            >
              Learn more
            </Link>
          </div>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-background/70">
            {["No credit card", "Open source", "Ad free", "Original content only"].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
