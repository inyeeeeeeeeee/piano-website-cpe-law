/**
 * Shared, framework-free constants: difficulty levels, musical keys, statuses,
 * sort options, display preferences and navigation.
 *
 * SQLite has no enum type, so every "enum-like" database column is a String
 * whose allowed values are declared here and enforced by Zod in
 * lib/validation.ts.
 */

/* -------------------------------------------------------------------------- */
/* Difficulty                                                                  */
/* -------------------------------------------------------------------------- */

export const DIFFICULTIES = [
  "BEGINNER",
  "EASY",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export interface DifficultyMeta {
  label: string;
  /** Tailwind classes for the visual badge (always paired with the label text). */
  badge: string;
  /** 1..5 — used for sorting and for the accessible intensity meter. */
  intensity: number;
}

export const DIFFICULTY_META: Record<Difficulty, DifficultyMeta> = {
  BEGINNER: {
    label: "Beginner",
    intensity: 1,
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  EASY: {
    label: "Easy",
    intensity: 2,
    badge:
      "bg-lime-100 text-lime-800 ring-lime-200 dark:bg-lime-950 dark:text-lime-300 dark:ring-lime-900",
  },
  INTERMEDIATE: {
    label: "Intermediate",
    intensity: 3,
    badge:
      "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  },
  ADVANCED: {
    label: "Advanced",
    intensity: 4,
    badge:
      "bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:ring-orange-900",
  },
  EXPERT: {
    label: "Expert",
    intensity: 5,
    badge:
      "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
  },
};

export function isDifficulty(value: unknown): value is Difficulty {
  return DIFFICULTIES.includes(value as Difficulty);
}

export function difficultyMeta(value: string): DifficultyMeta {
  return DIFFICULTY_META[(isDifficulty(value) ? value : "INTERMEDIATE")];
}

/* -------------------------------------------------------------------------- */
/* Musical keys                                                                */
/* -------------------------------------------------------------------------- */

export const MAJOR_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

export const MINOR_KEYS = [
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bm",
] as const;

/** Every supported musical key (canonical sharp spelling). */
export const MUSICAL_KEYS: string[] = [...MAJOR_KEYS, ...MINOR_KEYS];

/** Enharmonic (flat) spellings mapped to their canonical sharp equivalent. */
export const ENHARMONIC_MAP: Record<string, string> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
  "Dbm": "C#m",
  "Ebm": "D#m",
  "Gbm": "F#m",
  "Abm": "G#m",
  "Bbm": "A#m",
};

export const NOTE_NAMES = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

/** Normalise enharmonic spellings to the canonical sharp form. */
export function normalizeKey(key: string): string {
  const trimmed = key.trim();
  return ENHARMONIC_MAP[trimmed] ?? trimmed;
}

export function isMusicalKey(key: string): boolean {
  return MUSICAL_KEYS.includes(normalizeKey(key));
}

export function isMinorKey(key: string): boolean {
  return normalizeKey(key).endsWith("m");
}

/**
 * Transpose a musical key by a number of semitones. The original is never
 * modified — transposition is always computed on the fly for the viewer.
 */
export function transposeKey(key: string, semitones: number): string {
  const normalized = normalizeKey(key);
  const minor = isMinorKey(normalized);
  const pitch = minor ? normalized.slice(0, -1) : normalized;
  const index = NOTE_NAMES.indexOf(pitch as (typeof NOTE_NAMES)[number]);
  if (index < 0) return key;
  const shifted =
    (((index + semitones) % 12) + 12) % 12;
  const name = NOTE_NAMES[shifted];
  return minor ? `${name}m` : name;
}

/* -------------------------------------------------------------------------- */
/* Content / moderation statuses                                               */
/* -------------------------------------------------------------------------- */

export const SONG_STATUSES = [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
  "ARCHIVED",
] as const;
export type SongStatus = (typeof SONG_STATUSES)[number];

export const COMMENT_STATUSES = [
  "PENDING",
  "APPROVED",
  "HIDDEN",
  "REJECTED",
] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const REPORT_STATUSES = ["PENDING", "RESOLVED", "DISMISSED"] as const;

export const USER_ROLES = ["USER", "ADMIN"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const STATUS_META: Record<
  string,
  { label: string; badge: string }
> = {
  DRAFT: {
    label: "Draft",
    badge:
      "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  },
  PENDING: {
    label: "Pending review",
    badge:
      "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
  },
  PUBLISHED: {
    label: "Published",
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  REJECTED: {
    label: "Rejected",
    badge:
      "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:ring-rose-900",
  },
  ARCHIVED: {
    label: "Archived",
    badge:
      "bg-slate-200 text-slate-600 ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800",
  },
  APPROVED: {
    label: "Approved",
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  HIDDEN: {
    label: "Hidden",
    badge:
      "bg-slate-200 text-slate-600 ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800",
  },
  RESOLVED: {
    label: "Resolved",
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:ring-emerald-900",
  },
  DISMISSED: {
    label: "Dismissed",
    badge:
      "bg-slate-200 text-slate-600 ring-slate-300 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-800",
  },
};

/* -------------------------------------------------------------------------- */
/* Song sections                                                               */
/* -------------------------------------------------------------------------- */

/** Standard song structure — custom section names are also allowed. */
export const DEFAULT_SECTIONS = [
  "Intro",
  "Verse 1",
  "Pre-Chorus",
  "Chorus",
  "Verse 2",
  "Pre-Chorus 2",
  "Chorus 2",
  "Bridge",
  "Instrumental",
  "Final Chorus",
  "Outro",
] as const;

/* -------------------------------------------------------------------------- */
/* Search, sort and filters                                                    */
/* -------------------------------------------------------------------------- */

export const SORT_OPTIONS = [
  { value: "popular", label: "Most popular" },
  { value: "rating", label: "Highest rated" },
  { value: "recent", label: "Recently added" },
  { value: "alpha", label: "Alphabetical" },
  { value: "difficulty", label: "Difficulty" },
  { value: "bpm", label: "BPM" },
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export const PAGE_SIZE = 12;

/* -------------------------------------------------------------------------- */
/* Practice: display preferences                                               */
/* -------------------------------------------------------------------------- */

export const FONT_SIZES = {
  SMALL: "text-sm",
  MEDIUM: "text-base",
  LARGE: "text-lg",
  XLARGE: "text-xl",
} as const;
export type FontSizeKey = keyof typeof FONT_SIZES;

export const FONT_FAMILIES = {
  MONO: "font-mono",
  SANS: "font-sans",
  SERIF: "font-serif",
} as const;
export type FontFamilyKey = keyof typeof FONT_FAMILIES;

export const LINE_SPACINGS = {
  TIGHT: "leading-snug",
  NORMAL: "leading-relaxed",
  LOOSE: "leading-loose",
} as const;
export type LineSpacingKey = keyof typeof LINE_SPACINGS;

export const NOTE_SPACINGS = {
  COMPACT: "tracking-tight",
  NORMAL: "tracking-normal",
  WIDE: "tracking-widest",
} as const;
export type NoteSpacingKey = keyof typeof NOTE_SPACINGS;

export const SECTION_SPACINGS = {
  COMPACT: "space-y-4",
  NORMAL: "space-y-8",
  WIDE: "space-y-12",
} as const;
export type SectionSpacingKey = keyof typeof SECTION_SPACINGS;

/* -------------------------------------------------------------------------- */
/* Practice: autoscroll & metronome                                            */
/* -------------------------------------------------------------------------- */

export const AUTOSCROLL_SPEEDS = [
  { value: "VERY_SLOW", label: "Very Slow", pxPerSecond: 14 },
  { value: "SLOW", label: "Slow", pxPerSecond: 28 },
  { value: "MEDIUM", label: "Medium", pxPerSecond: 46 },
  { value: "FAST", label: "Fast", pxPerSecond: 75 },
  { value: "VERY_FAST", label: "Very Fast", pxPerSecond: 115 },
] as const;
export type AutoScrollSpeed = (typeof AUTOSCROLL_SPEEDS)[number]["value"];

export const METRONOME_MIN_BPM = 30;
export const METRONOME_MAX_BPM = 240;
export const TRANSPOSE_MIN = -12;
export const TRANSPOSE_MAX = 12;

/* -------------------------------------------------------------------------- */
/* Navigation                                                                  */
/* -------------------------------------------------------------------------- */

export const MAIN_NAV = [
  { href: "/", label: "Home" },
  { href: "/songs", label: "Songs" },
  { href: "/artists", label: "Artists" },
  { href: "/songbooks", label: "Songbooks" },
  { href: "/about", label: "About" },
] as const;

export const APP_NAME = "Piano Keys Tab";
export const APP_TAGLINE = "Your songs. Your keys. Your way.";
