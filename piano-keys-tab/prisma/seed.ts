/**
 * Piano Keys Tab — development seed.
 *
 *   npm run db:seed
 *
 * Builds a complete, self-contained demo catalogue:
 *
 *   • 7 fictional artists and 15 original songs (12 published, 1 pending
 *     submission, 1 draft, 1 rejected) — every arrangement below is generated
 *     from the progressions in this file, so no copyrighted material is
 *     shipped with the repository.
 *   • Versions → sections → arrangements (rendered `content` text plus
 *     `structuredData` event lists consumed by the interactive piano).
 *   • An admin account plus five members (settings, songbooks, saved songs,
 *     ratings, comments, notifications).
 *   • Moderation fixtures: a pending comment + report for the admin queues.
 *   • Analytics history: view rows spread over the last 90 days and content
 *     created across the last 12 months so the admin charts have data.
 *
 * The seed is destructive — it clears existing rows first so it can be re-run
 * at any time. Development data only; never run it against production.
 *
 * Local development credentials (see README §Seed data):
 *   admin@pianokeystab.dev  / Admin2026!   (ADMIN)
 *   demo@pianokeystab.dev   / Demo2026!    (USER)
 *
 * ---------------------------------------------------------------------------
 * `tsx prisma/seed.ts --if-empty` — the non-destructive variant run by
 * `npm start` on a fresh deployment (Railway). It differs in three ways:
 *
 *   • it exits immediately once songs exist, so a restart can never wipe data;
 *   • it never deletes accounts — the bootstrapped admin and real
 *     registrations survive — and it reuses rows that already exist instead of
 *     failing the unique constraints;
 *   • it gives every demo account a random password, so the catalogue can be
 *     published without handing out the documented logins above. Sign in with
 *     the ADMIN_EMAIL / ADMIN_PASSWORD bootstrap account instead.
 * ---------------------------------------------------------------------------
 */

import path from "node:path";
import { randomBytes } from "node:crypto";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client";
import type { ArrangementEvent } from "../types/arrangement";
import { DIFFICULTY_META, NOTE_NAMES, transposeKey } from "../lib/constants";
import { transposeNote, noteToMidi, midiToNote } from "../lib/piano-notes";
import { normalizeTags, searchable, slugify } from "../lib/utils";

/* ========================================================================== *
 * Environment + client
 * ========================================================================== */

// `next dev` loads .env automatically; `tsx prisma/seed.ts` does not.
try {
  process.loadEnvFile();
} catch {
  /* no .env — DATABASE_URL default below is used */
}

function resolveDatabaseUrl(): string {
  const raw = process.env.DATABASE_URL ?? "file:./prisma/dev.db";
  const withoutScheme = raw.replace(/^file:\/\//, "").replace(/^file:/, "");
  const absolute = path.isAbsolute(withoutScheme)
    ? withoutScheme
    : path.join(process.cwd(), withoutScheme);
  return `file:${absolute}`;
}

const adapter = new PrismaBetterSqlite3({ url: resolveDatabaseUrl() });
const db = new PrismaClient({ adapter });

/**
 * Set when `npm start` seeds a brand-new deployment (see the file header).
 * Off for `npm run db:seed`, which stays fully destructive by design.
 */
const IF_EMPTY = process.argv.includes("--if-empty");

/** 32 random, URL-safe bytes — locks a demo account on a live database. */
function lockedPassword(): string {
  return randomBytes(24).toString("base64url");
}

/* ========================================================================== *
 * Small helpers
 * ========================================================================== */

function hashSeed(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic PRNG (mulberry32) so re-seeding produces identical data. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(input: readonly T[], rng: () => number): T[] {
  const items = [...input];
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
  return items;
}

/** Deterministic "n months ago" date (day ≤ 28 so month lengths never bite). */
function monthsAgo(n: number, day = 12, hour = 10): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(hour, (day * 7) % 60, 0, 0);
  date.setMonth(date.getMonth() - n, day);
  return date;
}

function daysAgo(n: number, hour = 9, minute = 15): Date {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  date.setDate(date.getDate() - n);
  return date;
}

/* ========================================================================== *
 * Arrangement builder
 *
 * All music is authored in a single base key (C major / A minor) and
 * transposed to each song's key, so the demo catalogue stays original while
 * remaining internally consistent.
 * ========================================================================== */

interface ChordDef {
  bass: string;
  tones: string[];
}

const CHORDS: Record<string, ChordDef> = {
  C: { bass: "C2", tones: ["C4", "E4", "G4"] },
  Dm: { bass: "D2", tones: ["D4", "F4", "A4"] },
  Em: { bass: "E2", tones: ["E4", "G4", "B4"] },
  F: { bass: "F2", tones: ["F4", "A4", "C5"] },
  G: { bass: "G2", tones: ["G3", "B3", "D4"] },
  Am: { bass: "A2", tones: ["A3", "C4", "E4"] },
};

/** Diatonic scale (base key) used for passing melody notes. */
const SCALE = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];

/**
 * Semitone offset from the authoring key to the song's key.
 * Major songs are authored on C, minor songs on A — both use the same chord
 * pool, so minor keys are offset relative to A.
 */
function keyOffset(key: string): number {
  const minor = key.endsWith("m");
  const pitch = minor ? key.slice(0, -1) : key;
  const index = NOTE_NAMES.indexOf(pitch as (typeof NOTE_NAMES)[number]);
  if (index < 0) return 0;
  return minor ? (index - 9 + 12) % 12 : index;
}

/**
 * Lift a note into the fifth octave (C5–B5 = MIDI 72–83) without changing its
 * pitch class, so every seeded melody stays inside one readable register no
 * matter which key the song is transposed to.
 */
function intoFifthOctave(note: string): string {
  const midi = noteToMidi(note);
  if (midi === null) return note;
  let value = midi;
  while (value < 72) value += 12;
  while (value > 83) value -= 12;
  return midiToNote(value);
}

interface SectionSpec {
  name: string;
  /** One chord symbol per bar (authoring key). */
  chords: string[];
  density?: "sparse" | "full";
}

interface BuiltSection {
  name: string;
  content: string;
  events: ArrangementEvent[];
}

/**
 * Turn a section spec into real arrangement data: four beats per bar with an
 * alternating left-hand bass/chord pattern under a chord-tone melody, plus the
 * pre-rendered RH:/LH: text used as the display fallback.
 */
function buildSections(
  specs: SectionSpec[],
  key: string,
  seed: string
): BuiltSection[] {
  const offset = keyOffset(key);
  const rng = makeRng(hashSeed(seed));

  return specs.map((spec) => {
    const density = spec.density ?? "full";
    const events: ArrangementEvent[] = [];
    const lines: string[] = [];

    spec.chords.forEach((chordName, index) => {
      const chord = CHORDS[chordName];
      if (!chord) return;

      const bar = index + 1;
      const symbol = transposeKey(chordName, offset);
      const bass = transposeNote(chord.bass, offset);
      const tones = chord.tones.map((note) => transposeNote(note, offset));
      const melodyPool = [
        ...tones.map((note) => intoFifthOctave(transposeNote(note, 12))),
        ...SCALE.map((note) => intoFifthOctave(transposeNote(note, offset))),
      ];

      const pick = (): string =>
        melodyPool[Math.floor(rng() * melodyPool.length)];
      const melody: (string | null)[] = [
        pick(),
        density === "sparse" && rng() < 0.35 ? null : pick(),
        pick(),
        density === "sparse" && rng() < 0.5 ? null : pick(),
      ];
      const baseVelocity = density === "sparse" ? 74 : 88;

      for (let beat = 1; beat <= 4; beat += 1) {
        if (beat === 1) {
          events.push({
            hand: "left",
            notes: [bass],
            duration: "half",
            beat,
            bar,
            chord: symbol,
            velocity: 62,
          });
        } else if (beat === 3) {
          events.push({
            hand: "left",
            notes: tones,
            duration: "half",
            beat,
            bar,
            velocity: 58,
          });
        }

        const note = melody[beat - 1];
        if (note === null || note === undefined) {
          events.push({
            hand: "right",
            notes: [],
            duration: "quarter",
            beat,
            bar,
            rest: true,
          });
        } else {
          events.push({
            hand: "right",
            notes: [note],
            duration: "quarter",
            beat,
            bar,
            velocity: Math.min(
              127,
              Math.max(1, baseVelocity + Math.floor(rng() * 13) - 6)
            ),
          });
        }
      }

      lines.push(`Bar ${bar} · ${symbol}`);
      lines.push(`  RH  ${melody.map((n) => n ?? "rest").join("  ")}`);
      lines.push(`  LH  ${bass}  ·  [${tones.join(" ")}]`);
      lines.push("");
    });

    return {
      name: spec.name,
      content: lines.join("\n").trimEnd(),
      events,
    };
  });
}

/** Standard song form built from a four-bar verse and chorus. */
function form(verse: string[], chorus: string[], bridge?: string[]): SectionSpec[] {
  const sections: SectionSpec[] = [
    { name: "Intro", chords: [...verse], density: "sparse" },
    { name: "Verse 1", chords: verse, density: "full" },
    { name: "Chorus", chords: chorus, density: "full" },
  ];
  if (bridge) sections.push({ name: "Bridge", chords: bridge, density: "sparse" });
  sections.push({
    name: "Outro",
    chords: [chorus[0], chorus[3], verse[0], verse[0]],
    density: "sparse",
  });
  return sections;
}

/** Reduced arrangement used for secondary (simplified / practice) versions. */
function simpleForm(verse: string[]): SectionSpec[] {
  return [
    { name: "Intro", chords: [verse[0], verse[3]], density: "sparse" },
    { name: "Verse 1", chords: verse, density: "sparse" },
    { name: "Chorus", chords: [verse[2], verse[3]], density: "sparse" },
  ];
}

/* ========================================================================== *
 * Accounts
 * ========================================================================== */

interface UserSpec {
  key: string;
  username: string;
  email: string;
  password: string;
  role: "USER" | "ADMIN";
  bio: string;
  createdMonthsAgo: number;
}

const USERS: UserSpec[] = [
  {
    key: "admin",
    username: "admin",
    email: "admin@pianokeystab.dev",
    password: "Admin2026!",
    role: "ADMIN",
    bio: "Editorial account — moderates submissions, comments and reports.",
    createdMonthsAgo: 11,
  },
  {
    key: "demo",
    username: "demo",
    email: "demo@pianokeystab.dev",
    password: "Demo2026!",
    role: "USER",
    bio: "Practises 20 minutes a day and keeps every ballad in one songbook.",
    createdMonthsAgo: 10,
  },
  {
    key: "keyfinder",
    username: "keyfinder",
    email: "keyfinder@example.dev",
    password: "Keyfinder2026!",
    role: "USER",
    bio: "Transposes everything down a semitone and refuses to apologise.",
    createdMonthsAgo: 8,
  },
  {
    key: "practicehall",
    username: "practicehall",
    email: "practicehall@example.dev",
    password: "Practice2026!",
    role: "USER",
    bio: "Teacher building a beginner path for adult returners.",
    createdMonthsAgo: 6,
  },
  {
    key: "restnotes",
    username: "restnotes",
    email: "restnotes@example.dev",
    password: "Restnotes2026!",
    role: "USER",
    bio: "Slow reader, enthusiastic arranger, occasional over-editor.",
    createdMonthsAgo: 4,
  },
  {
    key: "sonata_sam",
    username: "sonata_sam",
    email: "sonata_sam@example.dev",
    password: "Sonata2026!",
    role: "USER",
    bio: "Chasing 168 BPM until the metronome begs for mercy.",
    createdMonthsAgo: 2,
  },
];

/* ========================================================================== *
 * Catalogue
 * ========================================================================== */

const ARTISTS = [
  {
    name: "Marlowe Vance",
    biography:
      "Folk-trained pianist writing quiet, hymn-like miniatures in a converted boathouse studio.",
  },
  {
    name: "The Ivory Meridian",
    biography:
      "Neoclassical duo building long, patient forms out of two upright pianos and a tape machine.",
  },
  {
    name: "Nadia Okonkwo",
    biography:
      "Composer and bandleader whose piano work sits between highlife grooves and late-night standards.",
  },
  {
    name: "Sunset Cartography",
    biography:
      "Ambient project mapping coastlines with slow chord drift and recorded weather.",
  },
  {
    name: "Jasper & Wren",
    biography:
      "Songwriting duo trading melodies over one borrowed piano in a first-floor flat.",
  },
  {
    name: "The Bellhouse Trio",
    biography: "Ragtime-revival trio known for brisk tempos and crowd-pleasing turnarounds.",
  },
  {
    name: "Cassette Orchard",
    biography: "Bedroom-pop collective that releases everything from a shared four-track.",
  },
];

interface VariantSpec {
  name: string;
  description: string;
  difficulty: keyof typeof DIFFICULTY_META;
  key?: string;
  bpm?: number;
}

interface SongSpec {
  title: string;
  artist: string;
  album?: string;
  year?: number;
  difficulty: keyof typeof DIFFICULTY_META;
  key: string;
  bpm: number;
  duration: number;
  description: string;
  tags: string;
  status: "PUBLISHED" | "PENDING" | "DRAFT" | "REJECTED";
  featured?: boolean;
  views: number;
  createdMonthsAgo: number;
  createdBy: string;
  verse: string[];
  chorus: string[];
  bridge?: string[];
  variants?: VariantSpec[];
}

const SONGS: SongSpec[] = [
  {
    title: "Paper Lanterns",
    artist: "Marlowe Vance",
    album: "Boathouse Hymns",
    year: 2021,
    difficulty: "EASY",
    key: "G",
    bpm: 72,
    duration: 198,
    description:
      "A slow, open-fifth study written for students moving from single notes to a walking left hand.",
    tags: "folk, ballad, calm, slow",
    status: "PUBLISHED",
    featured: true,
    views: 412,
    createdMonthsAgo: 9,
    createdBy: "admin",
    verse: ["C", "G", "Am", "F"],
    chorus: ["F", "G", "C", "C"],
    bridge: ["Am", "F", "C", "G"],
    variants: [
      {
        name: "Simplified (right hand only)",
        description: "Melody line only — a first step before adding the left hand.",
        difficulty: "BEGINNER",
      },
    ],
  },
  {
    title: "Harbour Lights",
    artist: "Marlowe Vance",
    album: "Boathouse Hymns",
    year: 2021,
    difficulty: "INTERMEDIATE",
    key: "D",
    bpm: 88,
    duration: 242,
    description:
      "Rolling arpeggios under a long melody line; the chorus asks for a wider hand span.",
    tags: "folk, evening, melodic, rolling",
    status: "PUBLISHED",
    views: 268,
    createdMonthsAgo: 9,
    createdBy: "admin",
    verse: ["C", "G", "Em", "Am"],
    chorus: ["F", "C", "G", "G"],
    bridge: ["Dm", "Em", "F", "G"],
  },
  {
    title: "Meridian Waltz",
    artist: "The Ivory Meridian",
    album: "Longitudes",
    year: 2023,
    difficulty: "ADVANCED",
    key: "Am",
    bpm: 104,
    duration: 312,
    description:
      "Four-bar phrases that keep lifting by a step — a study in even voicing and quiet pedalling.",
    tags: "neoclassical, waltz, voices, expressive",
    status: "PUBLISHED",
    featured: true,
    views: 196,
    createdMonthsAgo: 7,
    createdBy: "admin",
    verse: ["Am", "C", "F", "G"],
    chorus: ["Dm", "Am", "F", "G"],
    bridge: ["Em", "Am", "Dm", "G"],
  },
  {
    title: "Glasswork",
    artist: "The Ivory Meridian",
    album: "Longitudes",
    year: 2023,
    difficulty: "EXPERT",
    key: "F#m",
    bpm: 152,
    duration: 224,
    description:
      "Fast broken chords in both hands with a syncopated top line — the technical peak of the record.",
    tags: "neoclassical, arpeggio, fast, technical",
    status: "PUBLISHED",
    views: 154,
    createdMonthsAgo: 7,
    createdBy: "admin",
    verse: ["Am", "Em", "F", "C"],
    chorus: ["Dm", "Am", "G", "G"],
  },
  {
    title: "Oku's Lullaby",
    artist: "Nadia Okonkwo",
    album: "Harmattan Sessions",
    year: 2022,
    difficulty: "BEGINNER",
    key: "C",
    bpm: 66,
    duration: 160,
    description:
      "Four chords, a hand-span of melody, and nowhere to be in a hurry. Built for week one.",
    tags: "lullaby, beginner, gentle, short",
    status: "PUBLISHED",
    featured: true,
    views: 377,
    createdMonthsAgo: 6,
    createdBy: "admin",
    verse: ["C", "F", "C", "G"],
    chorus: ["F", "G", "C", "C"],
    variants: [
      {
        name: "Left-hand foundation",
        description: "Left-hand pattern only, for the first week of practice.",
        difficulty: "BEGINNER",
        bpm: 60,
      },
    ],
  },
  {
    title: "Harmattan Dawn",
    artist: "Nadia Okonkwo",
    album: "Harmattan Sessions",
    year: 2022,
    difficulty: "INTERMEDIATE",
    key: "Am",
    bpm: 108,
    duration: 266,
    description:
      "A repeating groove with a chorus that opens into wider chords and a stronger backbeat.",
    tags: "groove, jazzy, upbeat, hands-independent",
    status: "PUBLISHED",
    views: 301,
    createdMonthsAgo: 6,
    createdBy: "admin",
    verse: ["Am", "F", "C", "G"],
    chorus: ["F", "G", "Am", "Am"],
    bridge: ["Dm", "Em", "F", "G"],
  },
  {
    title: "Cartography of Clouds",
    artist: "Sunset Cartography",
    album: "Tidal Charts",
    year: 2024,
    difficulty: "EASY",
    key: "F",
    bpm: 76,
    duration: 304,
    description:
      "Long sustained chords with very little melody — practice for pedal timing and listening.",
    tags: "ambient, slow, spacious, pedal",
    status: "PUBLISHED",
    views: 188,
    createdMonthsAgo: 4,
    createdBy: "admin",
    verse: ["C", "F", "Am", "G"],
    chorus: ["F", "C", "G", "G"],
  },
  {
    title: "Northern Line",
    artist: "Sunset Cartography",
    album: "Tidal Charts",
    year: 2024,
    difficulty: "INTERMEDIATE",
    key: "Em",
    bpm: 92,
    duration: 252,
    description:
      "A steady pulse in the left hand while the right hand wanders through minor thirds.",
    tags: "ambient, minor, steady, focused",
    status: "PUBLISHED",
    views: 143,
    createdMonthsAgo: 4,
    createdBy: "admin",
    verse: ["Am", "C", "F", "G"],
    chorus: ["Dm", "Am", "F", "G"],
    bridge: ["Em", "F", "C", "G"],
  },
  {
    title: "Wren Song",
    artist: "Jasper & Wren",
    album: "Two Streets",
    year: 2020,
    difficulty: "BEGINNER",
    key: "G",
    bpm: 84,
    duration: 142,
    description:
      "Two minutes, four chords and one memorable tune — the most requested starter arrangement here.",
    tags: "beginner, short, melodic, catchy",
    status: "PUBLISHED",
    views: 356,
    createdMonthsAgo: 11,
    createdBy: "admin",
    verse: ["C", "G", "Am", "F"],
    chorus: ["F", "G", "C", "C"],
  },
  {
    title: "Two Streets Over",
    artist: "Jasper & Wren",
    album: "Two Streets",
    year: 2020,
    difficulty: "ADVANCED",
    key: "Am",
    bpm: 124,
    duration: 238,
    description:
      "Syncopated right-hand figures over a stride-leaning left hand. Count carefully before speeding up.",
    tags: "syncopated, stride, intermediate-plus, rhythmic",
    status: "PUBLISHED",
    views: 233,
    createdMonthsAgo: 11,
    createdBy: "admin",
    verse: ["Am", "Em", "F", "C"],
    chorus: ["Dm", "G", "C", "Am"],
    bridge: ["F", "G", "Em", "Am"],
  },
  {
    title: "The Bellhouse Reel",
    artist: "The Bellhouse Trio",
    album: "Last Set at the Bellhouse",
    year: 2019,
    difficulty: "EXPERT",
    key: "C",
    bpm: 168,
    duration: 186,
    description:
      "Full-speed tavern piece with a turnaround every two bars. Learn it at half tempo, then negotiate.",
    tags: "ragtime, uptempo, swing, showpiece",
    status: "PUBLISHED",
    featured: true,
    views: 421,
    createdMonthsAgo: 10,
    createdBy: "admin",
    verse: ["C", "F", "G", "C"],
    chorus: ["C", "Am", "Dm", "G"],
    bridge: ["F", "G", "C", "C"],
    variants: [
      {
        name: "Half-time practice",
        description: "Same notes at 84 BPM with rests on beat four.",
        difficulty: "INTERMEDIATE",
        bpm: 84,
      },
    ],
  },
  {
    title: "Quiet Carriage",
    artist: "The Bellhouse Trio",
    album: "Last Set at the Bellhouse",
    year: 2019,
    difficulty: "EASY",
    key: "D",
    bpm: 78,
    duration: 210,
    description:
      "The trio's slow closer: a simple melody with a bass line that only moves when it has to.",
    tags: "ballad, easy, warm, closing",
    status: "PUBLISHED",
    views: 129,
    createdMonthsAgo: 10,
    createdBy: "admin",
    verse: ["C", "G", "Am", "F"],
    chorus: ["F", "C", "G", "G"],
  },
  {
    title: "Midnight Tram",
    artist: "Cassette Orchard",
    album: "Four-Track Diaries",
    year: 2025,
    difficulty: "INTERMEDIATE",
    key: "Em",
    bpm: 100,
    duration: 214,
    description:
      "Community submission: a chorus-first arrangement with a deliberately muddy left hand.",
    tags: "bedroom pop, submission, chorus-first",
    status: "PENDING",
    views: 12,
    createdMonthsAgo: 1,
    createdBy: "demo",
    verse: ["Am", "C", "F", "G"],
    chorus: ["Em", "Am", "C", "G"],
  },
  {
    title: "Rain Study",
    artist: "Sunset Cartography",
    album: "Tidal Charts",
    year: 2024,
    difficulty: "BEGINNER",
    key: "C",
    bpm: 60,
    duration: 168,
    description:
      "Unfinished draft kept private while the ending is still being rewritten.",
    tags: "draft, ambient, study",
    status: "DRAFT",
    views: 0,
    createdMonthsAgo: 2,
    createdBy: "restnotes",
    verse: ["C", "F", "C", "G"],
    chorus: ["F", "C", "G", "G"],
  },
  {
    title: "Sketch for Two Pianos",
    artist: "Cassette Orchard",
    difficulty: "EXPERT",
    key: "Bm",
    bpm: 180,
    duration: 202,
    description:
      "Rejected submission: the arrangement only notates one of the two piano parts.",
    tags: "sketch, rejected, two pianos",
    status: "REJECTED",
    views: 0,
    createdMonthsAgo: 3,
    createdBy: "demo",
    verse: ["Am", "Em", "F", "C"],
    chorus: ["Dm", "G", "Am", "Am"],
  },
];

/* ========================================================================== *
 * Social fixtures
 * ========================================================================== */

const RATING_POOL = [5, 5, 5, 4, 4, 4, 3, 3, 2, 1];
const RATING_VOTERS = ["demo", "keyfinder", "practicehall", "restnotes", "sonata_sam"];

const COMMENTS: Array<{
  song: string;
  user: string;
  body: string;
  status?: "PENDING" | "HIDDEN";
  daysAgo: number;
}> = [
  {
    song: "Oku's Lullaby",
    user: "practicehall",
    body: "Used this with an adult returner in her first lesson — four chords is exactly the right amount of ambition.",
    daysAgo: 54,
  },
  {
    song: "Oku's Lullaby",
    user: "keyfinder",
    body: "Try it down a whole tone if C feels bright on an upright. The voicing survives it.",
    daysAgo: 41,
  },
  {
    song: "Paper Lanterns",
    user: "demo",
    body: "The intro rests are doing a lot of work here. I slowed the metronome to 60 and it finally locked in.",
    daysAgo: 33,
  },
  {
    song: "Paper Lanterns",
    user: "sonata_sam",
    body: "Great example of a left hand that stays interesting without getting busy.",
    daysAgo: 27,
  },
  {
    song: "The Bellhouse Reel",
    user: "practicehall",
    body: "Half-time version first, always. The jump between beat 3 and 4 is the whole piece.",
    daysAgo: 25,
  },
  {
    song: "The Bellhouse Reel",
    user: "keyfinder",
    body: "Autoscroll at medium speed matches 168 BPM better than I expected it to.",
    daysAgo: 19,
  },
  {
    song: "Harmattan Dawn",
    user: "demo",
    body: "The chorus needs a much firmer backbeat than the verse. Easy to flatten if you're not listening.",
    daysAgo: 16,
  },
  {
    song: "Glasswork",
    user: "sonata_sam",
    body: "Practised the first two bars for a week. Still not there, but it's finally even.",
    daysAgo: 12,
  },
  {
    song: "Wren Song",
    user: "practicehall",
    body: "Short enough that students finish it. That matters more than people think.",
    daysAgo: 9,
  },
  {
    song: "Meridian Waltz",
    user: "demo",
    body: "Transposed +2 for a darker colour — the left-hand pattern still reads clearly.",
    daysAgo: 6,
  },
  {
    song: "Northern Line",
    user: "restnotes",
    body: "The minor thirds in the right hand are a lovely hand-independence exercise.",
    daysAgo: 4,
  },
  {
    song: "Midnight Tram",
    user: "keyfinder",
    body: "Pending review, but the chorus-first structure is a neat trick. Curious what the ending becomes.",
    status: "PENDING",
    daysAgo: 2,
  },
  {
    song: "Harbour Lights",
    user: "sonata_sam",
    body: "Wide span in the chorus — I swap to a spread voicing and nobody notices.",
    status: "HIDDEN",
    daysAgo: 3,
  },
];

const SONGBOOKS: Array<{
  owner: string;
  name: string;
  description: string;
  songs: string[];
}> = [
  {
    owner: "demo",
    name: "Evening warm-ups",
    description: "Twenty quiet minutes before anything else gets decided.",
    songs: ["Oku's Lullaby", "Paper Lanterns", "Quiet Carriage", "Wren Song"],
  },
  {
    owner: "practicehall",
    name: "Adult returner path",
    description: "Ordered roughly by difficulty for lessons with returning players.",
    songs: ["Wren Song", "Oku's Lullaby", "Paper Lanterns", "Cartography of Clouds"],
  },
  {
    owner: "sonata_sam",
    name: "Fast hands",
    description: "Everything that punishes a lazy metronome setting.",
    songs: ["The Bellhouse Reel", "Glasswork", "Two Streets Over", "Northern Line"],
  },
];

const SAVED: Array<{ user: string; songs: string[] }> = [
  {
    user: "demo",
    songs: ["Paper Lanterns", "Harmattan Dawn", "Meridian Waltz", "Quiet Carriage"],
  },
  { user: "keyfinder", songs: ["Glasswork", "Two Streets Over"] },
  { user: "practicehall", songs: ["Wren Song", "Oku's Lullaby"] },
  { user: "sonata_sam", songs: ["The Bellhouse Reel", "Harbour Lights"] },
];

const NOTIFICATIONS: Array<{
  user: string;
  type: "INFO" | "SUBMISSION" | "COMMENT" | "RATING" | "SYSTEM";
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  daysAgo: number;
}> = [
  {
    user: "demo",
    type: "SUBMISSION",
    title: '"Midnight Tram" is waiting for review',
    body: "An editor will approve or request changes within a few days.",
    link: "/dashboard",
    isRead: false,
    daysAgo: 21,
  },
  {
    user: "demo",
    type: "SUBMISSION",
    title: '"Sketch for Two Pianos" was not approved',
    body: "Only one of the two piano parts was notated. Resubmit once both hands are written out.",
    link: "/dashboard",
    isRead: true,
    daysAgo: 74,
  },
  {
    user: "demo",
    type: "COMMENT",
    title: "practicehall replied to your comment",
    body: "On Paper Lanterns — “the intro rests are doing a lot of work here”.",
    link: "/songs/paper-lanterns",
    isRead: false,
    daysAgo: 5,
  },
  {
    user: "admin",
    type: "INFO",
    title: "Moderation queue is not empty",
    body: "1 submission and 1 comment are waiting for a decision.",
    link: "/admin/submissions",
    isRead: false,
    daysAgo: 1,
  },
  {
    user: "keyfinder",
    type: "RATING",
    title: "You rated Glasswork 5 stars",
    body: "Added to your activity history.",
    link: "/songs/glasswork",
    isRead: true,
    daysAgo: 12,
  },
  {
    user: "practicehall",
    type: "SYSTEM",
    title: "Welcome to Piano Keys Tab",
    body: "Songbooks let you order arrangements into a lesson path.",
    link: "/songbooks",
    isRead: true,
    daysAgo: 170,
  },
  {
    user: "sonata_sam",
    type: "SYSTEM",
    title: "Practice mode now remembers your settings",
    body: "Metronome tempo and font size persist on the Settings page.",
    link: "/settings",
    isRead: false,
    daysAgo: 3,
  },
];

const AUDIT_ENTRIES: Array<{
  action: string;
  entityType: string;
  entityTitle: string;
  metadata?: Record<string, unknown>;
  daysAgo: number;
}> = [
  {
    action: "ADMIN_MODERATED_SUBMISSION",
    entityType: "Song",
    entityTitle: "Paper Lanterns",
    metadata: { decision: "PUBLISHED", note: "Clean submission, no changes needed." },
    daysAgo: 240,
  },
  {
    action: "ADMIN_UPDATED_SONG",
    entityType: "Song",
    entityTitle: "The Bellhouse Reel",
    metadata: { isFeatured: true },
    daysAgo: 96,
  },
  {
    action: "ADMIN_MODERATED_COMMENT",
    entityType: "Comment",
    entityTitle: "Harbour Lights",
    metadata: { status: "HIDDEN", reason: "Duplicate posting." },
    daysAgo: 18,
  },
  {
    action: "ADMIN_RESOLVED_REPORT",
    entityType: "SONG",
    entityTitle: "Sketch for Two Pianos",
    metadata: { outcome: "Rejected with feedback." },
    daysAgo: 70,
  },
  {
    action: "ADMIN_UPDATED_USER",
    entityType: "User",
    entityTitle: "restnotes",
    metadata: { field: "bio" },
    daysAgo: 9,
  },
];

/* ========================================================================== *
 * Seed
 * ========================================================================== */

async function wipe(options: { keepUsers?: boolean } = {}) {
  await db.auditLog.deleteMany();
  await db.report.deleteMany();
  await db.notification.deleteMany();
  await db.songView.deleteMany();
  await db.savedSong.deleteMany();
  await db.songbookSong.deleteMany();
  await db.songbook.deleteMany();
  await db.rating.deleteMany();
  await db.comment.deleteMany();
  await db.arrangement.deleteMany();
  await db.songSection.deleteMany();
  await db.songVersion.deleteMany();
  await db.song.deleteMany();
  await db.artist.deleteMany();
  // Accounts (and their settings) are only removed by the destructive
  // development seed — `--if-empty` must preserve the bootstrapped admin.
  if (!options.keepUsers) {
    await db.userSettings.deleteMany();
    await db.user.deleteMany();
  }
}

async function createVersion(
  songId: string,
  options: {
    name: string;
    description?: string;
    difficulty: keyof typeof DIFFICULTY_META;
    musicalKey: string;
    bpm: number;
    status: string;
    order: number;
    createdById: string | null;
    sections: SectionSpec[];
    seed: string;
  }
): Promise<string> {
  const version = await db.songVersion.create({
    data: {
      songId,
      name: options.name,
      description: options.description,
      difficulty: options.difficulty,
      musicalKey: options.musicalKey,
      bpm: options.bpm,
      status: options.status,
      order: options.order,
      createdById: options.createdById,
    },
  });

  const built = buildSections(options.sections, options.musicalKey, options.seed);
  for (const [index, section] of built.entries()) {
    const row = await db.songSection.create({
      data: { versionId: version.id, name: section.name, order: index + 1 },
    });
    await db.arrangement.create({
      data: {
        sectionId: row.id,
        content: section.content,
        structuredData: JSON.stringify(section.events),
      },
    });
  }

  return version.id;
}

async function main() {
  console.log("Seeding Piano Keys Tab…");

  if (IF_EMPTY) {
    const existing = await db.song.count();
    if (existing > 0) {
      console.log(`  ✓ ${existing} songs already in the database — nothing to do.`);
      return;
    }
    // Brand-new database: add the catalogue, but keep every account that is
    // already there (the bootstrapped admin, any real registrations).
    await wipe({ keepUsers: true });
  } else {
    await wipe();
  }

  /* ---------------- users ---------------- */
  const userIds = new Map<string, string>();
  for (const spec of USERS) {
    // On a live database the demo accounts are created with an unusable
    // password so only the ADMIN_EMAIL / ADMIN_PASSWORD admin can sign in.
    const password = IF_EMPTY ? lockedPassword() : spec.password;
    const clash = IF_EMPTY
      ? await db.user.findFirst({
          where: { OR: [{ username: spec.username }, { email: spec.email }] },
          select: { id: true },
        })
      : null;

    const user = clash ?? {
      id: (
        await db.user.create({
          data: {
            username: spec.username,
            email: spec.email,
            passwordHash: await hash(password, 12),
            role: spec.role,
            bio: spec.bio,
            createdAt: monthsAgo(spec.createdMonthsAgo, 3),
          },
        })
      ).id,
    };
    userIds.set(spec.key, user.id);
    await db.userSettings.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, metronomeBpm: spec.role === "ADMIN" ? 90 : 100 },
    });
  }
  console.log(
    IF_EMPTY
      ? `  • ${userIds.size} demo accounts (random passwords — use your bootstrapped admin to sign in)`
      : `  • ${userIds.size} accounts (admin + members)`
  );

  /* ---------------- artists ---------------- */
  const artistIds = new Map<string, string>();
  for (const spec of ARTISTS) {
    const artist = await db.artist.create({
      data: {
        name: spec.name,
        searchName: searchable(spec.name),
        slug: slugify(spec.name),
        biography: spec.biography,
        createdAt: monthsAgo(11, 4),
      },
    });
    artistIds.set(spec.name, artist.id);
  }
  console.log(`  • ${artistIds.size} artists`);

  /* ---------------- songs + arrangements ---------------- */
  const songIds = new Map<string, string>();
  let versionCount = 0;

  for (const spec of SONGS) {
    const artistId = artistIds.get(spec.artist);
    const createdById = userIds.get(spec.createdBy) ?? null;
    if (!artistId) throw new Error(`Unknown artist: ${spec.artist}`);

    const tags = normalizeTags(spec.tags);
    const song = await db.song.create({
      data: {
        title: spec.title,
        searchTitle: searchable(spec.title),
        slug: slugify(spec.title),
        artistId,
        createdById,
        album: spec.album,
        releaseYear: spec.year,
        difficulty: spec.difficulty,
        difficultyRank: DIFFICULTY_META[spec.difficulty].intensity,
        musicalKey: spec.key,
        bpm: spec.bpm,
        duration: spec.duration,
        description: spec.description,
        tags,
        searchTags: tags,
        status: spec.status,
        isFeatured: spec.featured ?? false,
        viewCount: spec.views,
        attribution: `${spec.artist} — original demo arrangement`,
        source: "Original composition written for the Piano Keys Tab demo catalogue",
        license: "CC0 1.0 (demo content)",
        copyright: `© ${spec.year ?? 2026} ${spec.artist} — demo content, no third-party rights asserted`,
        createdAt: monthsAgo(spec.createdMonthsAgo, 14),
      },
    });
    songIds.set(spec.title, song.id);

    await createVersion(song.id, {
      name: "Original arrangement",
      description: "Full arrangement as submitted by the artist.",
      difficulty: spec.difficulty,
      musicalKey: spec.key,
      bpm: spec.bpm,
      status: spec.status,
      order: 0,
      createdById,
      sections: form(spec.verse, spec.chorus, spec.bridge),
      seed: `version-${spec.title}`,
    });
    versionCount += 1;

    for (const [index, variant] of (spec.variants ?? []).entries()) {
      await createVersion(song.id, {
        name: variant.name,
        description: variant.description,
        difficulty: variant.difficulty,
        musicalKey: variant.key ?? spec.key,
        bpm: variant.bpm ?? spec.bpm,
        status: spec.status === "PUBLISHED" ? "PUBLISHED" : spec.status,
        order: index + 1,
        createdById,
        sections: simpleForm(spec.verse),
        seed: `variant-${spec.title}-${index}`,
      });
      versionCount += 1;
    }
  }
  console.log(`  • ${songIds.size} songs, ${versionCount} versions with arrangements`);

  const published = SONGS.filter((s) => s.status === "PUBLISHED");
  const pendingSong = SONGS.find((s) => s.status === "PENDING");

  /* ---------------- ratings ---------------- */
  let ratingCount = 0;
  for (const spec of published) {
    const songId = songIds.get(spec.title)!;
    const rng = makeRng(hashSeed(`ratings-${spec.title}`));
    const creatorId = userIds.get(spec.createdBy);
    const voters = shuffle(RATING_VOTERS, rng).slice(0, 2 + Math.floor(rng() * 4));
    let sum = 0;

    for (const [index, voter] of voters.entries()) {
      const userId = userIds.get(voter)!;
      if (userId === creatorId) continue;
      const value = RATING_POOL[Math.floor(rng() * RATING_POOL.length)];
      await db.rating.create({
        data: {
          userId,
          songId,
          value,
          createdAt: daysAgo(2 + Math.floor(rng() * 120) + index, 20, 5),
        },
      });
      sum += value;
      ratingCount += 1;
    }

    const rated = voters.filter((v) => userIds.get(v) !== creatorId).length;
    if (rated > 0) {
      await db.song.update({
        where: { id: songId },
        data: { ratingCount: rated, ratingAvg: Math.round((sum / rated) * 10) / 10 },
      });
    }
  }
  console.log(`  • ${ratingCount} ratings`);

  /* ---------------- comments + reports ---------------- */
  let commentCount = 0;
  let pendingCommentId: string | null = null;

  for (const entry of COMMENTS) {
    const songId = songIds.get(entry.song);
    const userId = userIds.get(entry.user);
    if (!songId || !userId) continue;
    const created = await db.comment.create({
      data: {
        userId,
        songId,
        content: entry.body,
        status: entry.status ?? "APPROVED",
        createdAt: daysAgo(entry.daysAgo, 11, 30),
      },
    });
    if (entry.status === "PENDING") pendingCommentId = created.id;
    commentCount += 1;
  }

  const sketchId = songIds.get("Sketch for Two Pianos")!;
  const tramId = pendingSong ? songIds.get(pendingSong.title)! : null;

  await db.report.create({
    data: {
      reporterId: userIds.get("practicehall"),
      entityType: "SONG",
      entityId: sketchId,
      reason: "Only one piano part is notated — the second hand is missing entirely.",
      status: "RESOLVED",
      createdAt: daysAgo(72, 15, 40),
    },
  });
  if (pendingCommentId) {
    await db.report.create({
      data: {
        reporterId: userIds.get("sonata_sam"),
        entityType: "COMMENT",
        entityId: pendingCommentId,
        reason: "Looks like a duplicate of an earlier comment on the same song.",
        status: "PENDING",
        createdAt: daysAgo(2, 8, 5),
      },
    });
  }
  if (tramId) {
    await db.report.create({
      data: {
        reporterId: userIds.get("keyfinder"),
        entityType: "SONG",
        entityId: tramId,
        reason: "Possible duplicate of an older submission from the same artist.",
        status: "PENDING",
        createdAt: daysAgo(6, 19, 20),
      },
    });
  }
  console.log(`  • ${commentCount} comments, 3 reports`);

  /* ---------------- songbooks + saved songs ---------------- */
  for (const spec of SONGBOOKS) {
    const ownerId = userIds.get(spec.owner);
    if (!ownerId) continue;
    const book = await db.songbook.create({
      data: {
        userId: ownerId,
        name: spec.name,
        description: spec.description,
        createdAt: monthsAgo(3, 7, 16),
      },
    });
    for (const [index, title] of spec.songs.entries()) {
      const songId = songIds.get(title);
      if (!songId) continue;
      await db.songbookSong.create({
        data: { songbookId: book.id, songId, order: index + 1 },
      });
    }
  }

  for (const spec of SAVED) {
    const userId = userIds.get(spec.user);
    if (!userId) continue;
    for (const title of spec.songs) {
      const songId = songIds.get(title);
      if (!songId) continue;
      await db.savedSong.create({ data: { userId, songId } });
    }
  }
  console.log(`  • ${SONGBOOKS.length} songbooks, ${SAVED.reduce((n, s) => n + s.songs.length, 0)} saved songs`);

  /* ---------------- notifications ---------------- */
  for (const spec of NOTIFICATIONS) {
    const userId = userIds.get(spec.user);
    if (!userId) continue;
    await db.notification.create({
      data: {
        userId,
        type: spec.type,
        title: spec.title,
        body: spec.body,
        link: spec.link,
        isRead: spec.isRead,
        createdAt: daysAgo(spec.daysAgo, 9, 45),
      },
    });
  }

  /* ---------------- audit trail ---------------- */
  const adminId = userIds.get("admin")!;
  for (const spec of AUDIT_ENTRIES) {
    const songId = songIds.get(spec.entityTitle);
    const userId = userIds.get(spec.entityTitle);
    await db.auditLog.create({
      data: {
        adminId,
        action: spec.action,
        entityType: spec.entityType,
        entityId: songId ?? userId ?? spec.entityTitle,
        metadata: spec.metadata ? JSON.stringify(spec.metadata) : null,
        createdAt: daysAgo(spec.daysAgo, 13, 10),
      },
    });
  }
  console.log(`  • ${NOTIFICATIONS.length} notifications, ${AUDIT_ENTRIES.length} audit entries`);

  /* ---------------- view history ---------------- */
  const viewRows: Array<{
    songId: string;
    userId: string | null;
    createdAt: Date;
  }> = [];
  const memberIds = USERS.map((u) => u.key).map((k) => userIds.get(k)!);

  for (const spec of published) {
    const songId = songIds.get(spec.title)!;
    const rng = makeRng(hashSeed(`views-${spec.title}`));
    for (let i = 0; i < spec.views; i += 1) {
      const r = rng();
      const viewer = rng() < 0.35 ? memberIds[Math.floor(rng() * memberIds.length)] : null;
      viewRows.push({
        songId,
        userId: viewer,
        createdAt: new Date(Date.now() - Math.floor(r * 90 * 24 * 60 * 60 * 1000)),
      });
    }
  }
  if (viewRows.length > 0) {
    for (let i = 0; i < viewRows.length; i += 500) {
      await db.songView.createMany({ data: viewRows.slice(i, i + 500) });
    }
  }
  console.log(`  • ${viewRows.length} song views across the last 90 days`);

  const totals = {
    users: await db.user.count(),
    artists: await db.artist.count(),
    songs: await db.song.count(),
    published: await db.song.count({ where: { status: "PUBLISHED" } }),
    pending: await db.song.count({ where: { status: "PENDING" } }),
    versions: await db.songVersion.count(),
    sections: await db.songSection.count(),
    ratings: await db.rating.count(),
    comments: await db.comment.count(),
  };
  console.log("Seed complete:", totals);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
