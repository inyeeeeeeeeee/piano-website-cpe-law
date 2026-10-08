# Piano Keys Tab

> **Your songs. Your keys. Your way.**
> A community library of searchable, practice-ready piano arrangements — with
> transposition, a metronome, autoscroll, an interactive keyboard and songbooks
> built in.

Piano Keys Tab is a full-stack Next.js application: browse and search an
arrangement catalogue, open any song in a **practice studio**, save it to a
songbook, rate and comment on it, submit your own arrangement for moderation,
and manage the whole community from an admin console.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start](#quick-start)
- [Scripts](#scripts)
- [Environment variables](#environment-variables)
- [Seed data & local accounts](#seed-data--local-accounts)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Security](#security)
- [Content policy](#content-policy)
- [Quality checks](#quality-checks)
- [Troubleshooting](#troubleshooting)
- [Limitations & future work](#limitations--future-work)

---

## Features

**Public catalogue**
- Landing page, `/songs` catalogue, `/artists` and `/songbooks` directories,
  about / contact / terms / privacy pages.
- Search + filters (artist, difficulty, musical key, tag, rating, BPM range),
  six sort orders, pagination — all server-side and fully usable **without
  JavaScript** (plain GET forms).
- Search-as-you-type suggest endpoint (`/api/search/suggest`).

**Practice studio** (per song, per version)
- Version tabs, difficulty/key/BPM badges, **transpose −12…+12 semitones**
  (visual + audio, original never mutated).
- Metronome with BPM control (30–240), **play-along cursor** that walks the
  arrangement at the current tempo, autoscroll at five speeds, fullscreen.
- Display controls: font size/family, line/note/section spacing — persisted
  per user in `user_settings` (and in `localStorage` for guests).
- Interactive **piano keyboard** driven by the structured arrangement data;
  clicking a note/chord plays it through the Web Audio API.

**Community**
- Accounts, profiles, saved songs, songbooks with ordering, ratings (1–5),
  comments with moderation states, comment reports.
- Submissions wizard (`/submit-song`): song metadata → versions → sections →
  tab text/structured events, submitted as `PENDING`.

**Admin console** (`/admin`, ADMIN role only)
- Overview with queue counts and latest audit entries.
- Submissions moderation (approve / request changes / reject with a note),
  song table with status/feature edits, artist CRUD, comment moderation,
  report resolution, user management (role, active/disabled, delete).
- Analytics (Recharts) computed directly from SQLite — status breakdown,
  difficulty spread, rating distribution, top songs, 12-month growth.
- Append-only audit log of every administrative action.

**Platform**
- Dark/light/system theme (next-themes), toasts (sonner), skeletons and empty
  states everywhere, keyboard-visible focus rings, skip link, ARIA labels on
  icon-only controls, `loading.tsx` / `error.tsx` / `not-found.tsx`.
- SEO: metadata + Open Graph on every route, dynamic `sitemap.xml`,
  `robots.txt`, per-entity `generateMetadata`.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js **16.3.8** (App Router, Route Handlers, Turbopack) |
| UI | React **19.3**, TypeScript **6.0** (strict) |
| Styling | Tailwind CSS **4.3** (CSS-first config, design tokens in `app/globals.css`) |
| Database | SQLite (`prisma/dev.db`) via Prisma **7.10** + `better-sqlite3` driver adapter (no Rust engines) |
| Auth | Auth.js / NextAuth **5.0.0-beta.32** — credentials provider, JWT sessions |
| Validation | Zod **4.6** (server) + React Hook Form **7.89** / `@hookform/resolvers` (client) |
| Charts / icons / misc | Recharts 3.10, Lucide React, date-fns, Sonner, bcryptjs, clsx + tailwind-merge |

---

## Quick start

Requirements: **Node.js ≥ 20.9** (developed on Node 24) and npm.

```bash
git clone <your-repo-url> piano-keys-tab
cd piano-keys-tab
npm install

# 1. Configure the environment
copy .env.example .env      # Windows:  copy .env.example .env
#   macOS/Linux:            cp .env.example .env
#   then set AUTH_SECRET (npx auth secret) and, if needed, DATABASE_URL

# 2. Create the database (apply the committed migrations) and load demo content
npm run db:deploy            # prisma migrate deploy → creates prisma/dev.db
npm run db:seed              # fictional artists/songs + admin & user accounts

# 3. Run it
npm run dev                          # http://localhost:3000
```

Production build:

```bash
npm run build   # prisma generate && next build
npm run start
```

> The SQLite file lives at `prisma/dev.db` (relative to the project root) and
> is git-ignored. Recreate it any time with `npm run db:migrate` + `npm run db:seed`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server (Turbopack) |
| `npm run build` | `prisma generate` then `next build` |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create/apply migrations (`prisma migrate dev`) |
| `npm run db:deploy` | Apply migrations without prompting (CI/production) |
| `npm run db:generate` | Regenerate the Prisma client (`generated/prisma`) |
| `npm run db:seed` | Reset demo data: `tsx prisma/seed.ts` |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Drop + re-apply all migrations (then re-seed) |

## Environment variables

`.env.example` documents every variable:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | SQLite location, e.g. `file:./prisma/dev.db` (resolved against the project root) |
| `AUTH_SECRET` | ✅ | HS256 secret that signs/encrypts the HTTP-only session cookie. Generate with `npx auth secret` |
| `AUTH_URL` | ✅ | Canonical base URL (`http://localhost:3000`) used by Auth.js callbacks |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same base URL, used for canonical/OG/sitemap URLs |
| `NEXT_PUBLIC_APP_NAME` | optional | Display name override (defaults to *Piano Keys Tab*) |

Never commit `.env`. In production, set `NODE_ENV=production` and a long random
`AUTH_SECRET`.

---

## Seed data & local accounts

```bash
npm run db:seed
```

The seed is **destructive** (it clears existing rows first) so it can be run
any time, and it is deterministic — the same input always produces the same
catalogue. It creates:

- **7 fictional artists** and **15 original songs** (12 published, 1 pending
  submission, 1 draft, 1 rejected) with 18 versions, 76 sections and their
  structured arrangements. All music is generated from the progressions in
  `prisma/seed.ts` — **no copyrighted arrangements or lyrics ship with this
  repo**.
- **6 accounts** (1 admin + 5 members) with bcrypt cost-12 password hashes,
  per-user practice settings, songbooks, saved songs, 46 ratings, 13 comments,
  notifications, an audit trail, 3 reports (2 open for the moderation queue)
  and ~3,200 song views spread over 90 days so the analytics charts have real
  history.

### Development credentials

| Role | Email | Password | Username |
| --- | --- | --- | --- |
| **ADMIN** | `admin@pianokeystab.dev` | `Admin2026!` | `admin` |
| USER | `demo@pianokeystab.dev` | `Demo2026!` | `demo` |
| USER | `keyfinder@example.dev` | `Keyfinder2026!` | `keyfinder` |
| USER | `practicehall@example.dev` | `Practice2026!` | `practicehall` |
| USER | `restnotes@example.dev` | `Restnotes2026!` | `restnotes` |
| USER | `sonata_sam@example.dev` | `Sonata2026!` | `sonata_sam` |

> ⚠️ These accounts exist **only** for local development. They are recreated
> (and any account you create locally is deleted) every time you seed. Do not
> reuse these passwords anywhere else.

---

## Architecture

```
piano-keys-tab/
├─ app/                     # App Router
│  ├─ (public pages)        # / , /songs , /artists , /songbooks , legal pages
│  ├─ login/ register/      # guest-only auth screens
│  ├─ dashboard|profile|settings|submit-song   # member area
│  ├─ admin/                # admin console (server components + client actions)
│  ├─ api/                  # 33 route handlers (auth, CRUD, search, admin)
│  ├─ sitemap.ts  robots.ts
│  └─ layout.tsx            # theme provider, header/footer, toaster, metadata
├─ components/
│  ├─ ui/                   # Button, Field, Modal, Dropdown, Badge, Table …
│  ├─ layout/               # header, footer, search bar, notification bell
│  ├─ features/             # cards, filters, forms, wizard, comment section
│  ├─ practice/             # practice provider/toolbar/studio
│  ├─ piano/                # arrangement view + interactive keyboard
│  └─ admin/                # admin action components, table primitives, charts
├─ lib/                     # api wrapper, auth, session, validation, search,
│                            # repo/services, rate limiter, audio, piano notes
├─ types/arrangement.ts     # ArrangementEvent / ArrangementSection
├─ prisma/                  # schema, migrations, seed.ts, dev.db
└─ generated/prisma/        # generated client (git-ignored, excluded from tsc)
├─ proxy.ts                 # route protection (Next.js 16 "proxy" = middleware)
```

### Request flow

```
Browser ─► proxy.ts (fast cookie check, early redirect)
       ─► page/route handler
             ├─ getCurrentUser() / requireUser() / requireAdmin()  ← DB re-verification
             ├─ Zod schema.parse(body)                             ← validation
             ├─ rateLimit(ip + user)                               ← abuse control
             └─ prisma query
```

Every API route is wrapped by `withApi`, which applies, in order: same-origin
(CSRF) check → rate limit → auth/role check → Zod validation → a consistent
`{ error, code, fields? }` JSON envelope.

### Key decisions (and why)

- **Prisma 7 + driver adapter.** `@prisma/adapter-better-sqlite3` means no Rust
  engine download and a real embedded SQLite file; the client is generated to
  `generated/prisma` and excluded from `tsc`.
- **SQLite has no enums.** “Enum-like” columns are `String`s, validated by Zod
  (`lib/validation.ts`) and typed by `lib/constants.ts`. Search columns
  (`searchTitle`, `searchTags`, `searchName`) and `difficultyRank` are
  denormalised lowercase/numeric copies so filtering and sorting stay simple
  and index-friendly.
- **JWT sessions, server-side authorisation.** The cookie carries only a hint
  of the role; `lib/session.ts` re-reads the user from the database on every
  protected page/route. `proxy.ts` is deliberately shallow — it only avoids a
  flash of protected content.
- **Custom auth endpoints.** `/api/auth/login`, `/register` and `/logout` wrap
  Auth.js so the routes can be rate-limited and origin-checked like any other
  API. The client never sees a password hash or a token.
- **No client data library.** Server components read Prisma directly; client
  components mutate through route handlers and call `router.refresh()`. That
  keeps a single source of truth (SQLite) and avoids cache-invalidation bugs.
- **Admin UI = server components + small client action components.** Filter
  forms are plain GET forms (they work with JS disabled); only the mutation
  buttons are client-side.
- **Arrangements stored twice.** `content` (rendered `RH:`/`LH:` text) plus
  `structuredData` (typed `ArrangementEvent[]`). The interactive keyboard and
  play-along cursor use the events; the text remains the fallback — and MIDI
  import/export can be added later without migrating stored songs.
- **CSS animations instead of a motion library**, and **generated gradient
  covers** instead of user uploads — no binary assets, no image pipeline.
- **`components/stream-reveal.tsx` safety net.** React reveals content that
  streamed behind `loading.tsx`/`Suspense` from an inline script scheduled with
  `requestAnimationFrame`, and browsers don't run animation frames for hidden
  documents — so a page loaded in a background tab/window could sit on the
  loading fallback until focused. This tiny client component re-runs React's
  reveal on ordinary timers *while the document is hidden* (timers still fire,
  throttled), and steps aside as soon as the document is visible. It is fully
  feature-detected, so if React drops those internals it no-ops.

---

## Data model

`prisma/schema.prisma` (SQLite):

```
User ─┬─ UserSettings          Notification
      ├─ Song (creator)        AuditLog  (admin actor)
      ├─ SongVersion (creator) SongView
      ├─ Songbook ─ SongbookSong ─ Song ─ Artist
      ├─ Rating (user+song, unique)
      ├─ Comment (status: PENDING|APPROVED|HIDDEN|REJECTED)
      ├─ SavedSong (user+song, unique)
      └─ Report (COMMENT|SONG|USER, status: PENDING|RESOLVED|DISMISSED)

Song ─ SongVersion ─ SongSection ─ Arrangement (content + structuredData)
```

Cascade rules: deleting an artist/song removes its versions, sections and
arrangements; deleting a user removes their content but `Song.createdById`
becomes `NULL` (attribution survives).

---

## Security

| Concern | Implementation |
| --- | --- |
| Password storage | bcrypt, cost **12** (`bcryptjs`); failed logins still run a comparison against a dummy hash so timing doesn't reveal account existence |
| Session | Auth.js JWT in an **HTTP-only, SameSite=Lax, Secure-in-production** cookie; 30-day expiry |
| Authorisation | Re-verified **server-side on every protected page and route** (`requireUser` / `requireAdmin`); client-sent roles are ignored |
| Route protection | `proxy.ts` — member prefixes (`/dashboard /profile /settings /songbooks /submit-song`), `/admin` (ADMIN only, others → `/403`), guest-only `/login /register` |
| CSRF | Same-origin check on every mutation (Origin/Host comparison) + `SameSite=Lax` cookies |
| Validation | Zod on every request body/query **and** on the client form; unknown fields stripped |
| Rate limiting | In-memory sliding window: login 10/min, register 5/10min, comments 10/min, ratings 30/min, submissions 5/hour, search 120/min, generic mutation 60/min |
| SQL injection | Prisma parameterised queries only — no string-built SQL anywhere |
| XSS | React escaping (no `dangerouslySetInnerHTML`); arrangements render as data, not markup |
| Authorization on lists | Unpublished songs are excluded from public queries (`buildSongWhere`), admin tables opt in explicitly |
| Secrets | `.env` is git-ignored; `.env.example` ships placeholder values |
| Abuse handling | Comment/song/user reports with an admin queue; comments can be hidden, users disabled (`isActive`) |

**Known trade-offs:** rate-limit state is per-process (fine for a single-node
deployment — swap in Redis for horizontal scaling), and there is no email
verification/password-reset flow yet.

---

## Content policy

All catalogue content in `prisma/seed.ts` is **original demo material** written
for this project: fictional artists, invented titles, and arrangements
generated from chord progressions defined in the seed itself. Nothing
copyrighted (lyrics, sheet music, recordings) is included.

Every song row carries attribution/licensing fields (`attribution`, `source`,
`license`, `copyright`) that are shown on the song page; the footer repeats
that the platform does not host copyrighted sheet music or lyrics. User
submissions are moderated before they become publicly visible.

---

## Quality checks

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint flat config
npm run build       # prisma generate + next build (type-checks too)
```

Manually verified against the seeded database:

- Landing → catalogue → filters/search (including the empty state) → song page.
- Practice studio: versions, transpose, metronome, autoscroll, display panel,
  interactive keyboard, rating and comment widgets.
- Register → auto sign-in → dashboard; login/logout round-trips; wrong password
  surfaces the API error; member hitting `/admin` is redirected to `/403`.
- Admin: overview counts, submissions queue, **approve a submission** (queue
  empties, contributor notified, audit entry written), audit log, analytics
  charts (status/difficulty/ratings/top/growth).
- Posting a comment as a signed-in user (API returns `201`, list updates).
- `/robots.txt`, `/sitemap.xml`, and the custom 404 page.

> A handful of `react-hooks/purity|immutability|set-state-in-effect|refs`
> warnings are intentionally left at *warning* level in `eslint.config.mjs`:
> they come from React's compiler-era rules and flag patterns that are correct
> in React 19 + Next.js (hydration mount-guards, syncing state to props, full
> page navigation after a credential round-trip).

---

## Troubleshooting

**`npm run db:migrate` fails with "Unable to open the database file"**
Run commands from the project root; `DATABASE_URL` is resolved relative to the
project root, not to `prisma/`.

**`better-sqlite3` / native module errors after switching Node versions**
Rebuild it: `npm rebuild better-sqlite3`. (If your environment blocks package
install scripts, allow them first: `npm approve-scripts better-sqlite3 esbuild prisma @prisma/engines`.)

**`Generated Prisma Client` errors / `@/generated/prisma` not found**
Run `npm run db:generate`. The client is generated into `generated/prisma`
(git-ignored) and is a build input for `npm run build`.

**Port already in use**
`npm run dev -- -p 3001`, and update `AUTH_URL` / `NEXT_PUBLIC_APP_URL`
accordingly (they drive callbacks and the sitemap).

**Want a clean slate**
`npm run db:reset` (drops and re-applies migrations) then `npm run db:seed`.

---

## Limitations & future work

- Email flows (verification, password reset) and OAuth providers are not
  implemented — credentials only.
- Rate limiting is in-memory (single node).
- MIDI import/export and audio playback of whole arrangements are stubbed by
  the data model (`structuredData`) but not surfaced in the UI.
- Cover art is generated (gradient + initials); there is no image upload.
- `npm run db:seed` is a development tool and resets local demo data — never
  run it against a production database.
