import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow } from "date-fns";

/** Merge Tailwind class names without conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** URL-safe slug from an arbitrary string. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Lowercased text used for case-insensitive search columns. */
export function searchable(input: string): string {
  return input.toLowerCase().trim();
}

/** Turn "a,b, c" into a normalised comma separated tag string. */
export function normalizeTags(input: string): string {
  return Array.from(
    new Set(
      input
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
  )
    .slice(0, 20)
    .join(",");
}

export function truncate(input: string, max: number): string {
  if (input.length <= max) return input;
  return `${input.slice(0, max - 1).trimEnd()}…`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Parse JSON safely, returning a fallback on malformed data. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

/** "12:05" style duration from seconds. */
export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Human friendly relative time, e.g. "3 days ago". */
export function timeAgo(date: Date | string | number): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/** Exact date for tooltips, e.g. "Oct 6, 2026". */
export function formatDate(date: Date | string | number): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Initials for avatars — "Ada Lovelace" -> "AL". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Convert an average rating into 5 display slots (full / half / empty).
 * Rounding to the nearest half star keeps ★ rendering predictable.
 */
export function starSlots(rating: number): Array<"full" | "half" | "empty"> {
  const rounded = Math.round(clamp(rating, 0, 5) * 2) / 2;
  return Array.from({ length: 5 }, (_, i) => {
    const filled = rounded - i;
    if (filled >= 1) return "full";
    if (filled >= 0.5) return "half";
    return "empty";
  });
}

/** Random readable suffix used when de-duplicating slugs. */
export function randomSuffix(length = 4): string {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Convert "Hello World" -> "HW" style cover fallbacks. */
export function coverHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  }
  return hash;
}
