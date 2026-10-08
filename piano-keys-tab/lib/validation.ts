import { z } from "zod";
import {
  COMMENT_STATUSES,
  DIFFICULTIES,
  SONG_STATUSES,
  USER_ROLES,
  isMusicalKey,
  normalizeKey,
  MUSICAL_KEYS,
} from "@/lib/constants";

/* ========================================================================== *
 * Shared primitives
 * ========================================================================== */

/** Note names use scientific pitch notation: C4, C#4, Bb3, F#5 … */
export const NOTE_PATTERN = /^[A-G][#b]?\d$/;

export const noteSchema = z
  .string()
  .regex(NOTE_PATTERN, "Use scientific pitch notation, e.g. C4 or F#3");

export const difficultySchema = z.enum(DIFFICULTIES);
export const statusSchema = z.enum(SONG_STATUSES);

export const musicalKeySchema = z
  .string()
  .trim()
  .min(1, "Pick a musical key")
  .transform(normalizeKey)
  .refine(isMusicalKey, {
    message: `Key must be one of: ${MUSICAL_KEYS.slice(0, 12).join(", ")} (or their minor forms)`,
  });

export const bpmSchema = z.coerce
  .number({ message: "BPM must be a number" })
  .int("BPM must be a whole number")
  .min(20, "BPM must be at least 20")
  .max(300, "BPM cannot exceed 300");

/** Accepts http(s) URLs or site-relative paths — never arbitrary schemes. */
export const imageUrlSchema = z
  .string()
  .trim()
  .max(500, "Image URL is too long")
  .refine(
    (v) => /^(https?:\/\/|\/)[^\s]+$/.test(v),
    "Must be an http(s) URL or a path starting with /"
  );

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^(https?:\/\/|\/)[^\s]+$/.test(v), "Invalid URL")
  .optional()
  .transform((v) => (v ? v : undefined));

/* ========================================================================== *
 * Authentication
 * ========================================================================== */

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(24, "Username must be at most 24 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Only letters, numbers and underscores are allowed"
  );

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .refine((v) => /[a-zA-Z]/.test(v), "Include at least one letter")
  .refine((v) => /[0-9]/.test(v), "Include at least one number");

export const registerSchema = z
  .object({
    username: usernameSchema,
    email: z.email("Enter a valid email address").max(254).transform((v) =>
      v.toLowerCase()
    ),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Enter your email or username")
    .max(254),
  password: z.string().min(1, "Enter your password").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

/* ========================================================================== *
 * Songs
 * ========================================================================== */

export const songCoreSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(160),
  artistId: z
    .string()
    .trim()
    .optional()
    .transform((v) => v || undefined),
  album: z.string().trim().max(160).optional().transform((v) => v || undefined),
  releaseYear: z.coerce
    .number()
    .int()
    .min(1900)
    .max(2100)
    .optional()
    .transform((v) => v || undefined)
    .or(z.literal("").transform(() => undefined)),
  difficulty: difficultySchema,
  musicalKey: musicalKeySchema,
  bpm: bpmSchema,
  duration: z.coerce
    .number()
    .int()
    .min(1)
    .max(36_000)
    .optional()
    .transform((v) => v || undefined),
  description: z.string().trim().max(4000).optional().transform((v) => v || undefined),
  tags: z.string().trim().max(300).optional().transform((v) => v ?? ""),
  coverImage: optionalUrl,
  attribution: z.string().trim().max(300).optional().transform((v) => v || undefined),
  source: z.string().trim().max(300).optional().transform((v) => v || undefined),
  license: z.string().trim().max(120).optional().transform((v) => v || undefined),
  copyright: z.string().trim().max(300).optional().transform((v) => v || undefined),
});

/* ========================================================================== *
 * Arrangements (structured piano tab data)
 * ========================================================================== */

export const arrangementEventSchema = z
  .object({
    hand: z.enum(["right", "left"]),
    notes: z.array(noteSchema).max(10, "A chord can have at most 10 notes"),
    duration: z
      .enum([
        "whole",
        "dotted-half",
        "half",
        "dotted-quarter",
        "quarter",
        "eighth",
        "sixteenth",
      ])
      .optional(),
    beat: z.coerce.number().int().min(1).max(64).optional(),
    bar: z.coerce.number().int().min(1).max(999).optional(),
    chord: z.string().trim().max(12).optional(),
    velocity: z.coerce.number().int().min(1).max(127).optional(),
    rest: z.boolean().optional(),
  })
  .refine((e) => e.rest === true || e.notes.length > 0, {
    message: "A note event needs at least one note",
  });

export const sectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(60),
  content: z.string().max(20_000, "Section content is too long").optional().default(""),
  events: z
    .array(arrangementEventSchema)
    .max(2000, "Too many note events in one section")
    .optional()
    .default([]),
});

export const versionSchema = z.object({
  name: z.string().trim().min(1, "Version name is required").max(80),
  description: z.string().trim().max(1000).optional().transform((v) => v || undefined),
  difficulty: difficultySchema,
  musicalKey: musicalKeySchema,
  bpm: bpmSchema,
  status: statusSchema.optional(),
  order: z.coerce.number().int().min(0).max(999).optional(),
  sections: z
    .array(sectionSchema)
    .max(50, "A version can have at most 50 sections")
    .optional()
    .default([]),
});

export const createVersionSchema = versionSchema;
export const updateVersionSchema = versionSchema.partial().extend({
  sections: versionSchema.shape.sections.optional(),
});

/* ========================================================================== *
 * Songs — create / update (declared after versionSchema on purpose)
 * ========================================================================== */

export const createSongSchema = songCoreSchema.extend({
  status: statusSchema.optional(),
  isFeatured: z.boolean().optional(),
  /** New artist created inline (used by the submission flow). */
  newArtistName: z.string().trim().min(2).max(120).optional(),
  /** Initial version + arrangement (optional; admins can add more later). */
  version: versionSchema.optional(),
  /** Submission-flow acknowledgement of content rights. */
  acknowledge: z.boolean().optional(),
});

export const updateSongSchema = createSongSchema;

/* ========================================================================== *
 * Submissions (user-contributed songs)
 * ========================================================================== */

/**
 * The whole submission in one payload: song info + artist (existing or new) +
 * first version with its arrangement sections.
 */
export const submissionSchema = z.object({
  song: songCoreSchema,
  /** Either link an existing artist… */
  artistId: z.string().optional(),
  /** …or create one. */
  newArtistName: z.string().trim().min(2).max(120).optional(),
  version: versionSchema,
  attribution: z.string().trim().max(300).optional(),
  acknowledge: z
    .boolean()
    .refine((v) => v === true, {
      message: "You must confirm you have the right to share this arrangement",
    }),
});

export const moderationSchema = z.object({
  status: z.enum(["PUBLISHED", "REJECTED", "PENDING", "ARCHIVED"]),
  note: z.string().trim().max(500).optional(),
});

/* ========================================================================== *
 * Ratings, comments, reports
 * ========================================================================== */

export const ratingSchema = z.object({
  value: z.coerce
    .number({ message: "Rating must be a number" })
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating must be at most 5"),
});

export const commentSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Write something first")
    .max(1000, "Comments are limited to 1000 characters"),
});

export const commentModerationSchema = z.object({
  status: z.enum(COMMENT_STATUSES),
});

export const reportSchema = z.object({
  entityType: z.enum(["COMMENT", "SONG", "USER"]),
  entityId: z.string().min(1),
  reason: z.string().trim().min(3, "Describe the reason").max(500),
});

/* ========================================================================== *
 * Songbooks & saving
 * ========================================================================== */

export const songbookSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(60),
  description: z.string().trim().max(500).optional().transform((v) => v || undefined),
  coverImage: optionalUrl,
});

export const songbookSongSchema = z.object({
  songId: z.string().min(1, "Song is required"),
});

export const reorderSchema = z.object({
  songIds: z.array(z.string().min(1)).max(500),
});

export const saveSongSchema = z.object({
  songId: z.string().min(1),
  songbookId: z.string().optional(),
});

/** Optional companion body for POST /api/songs/:id/save (songId lives in the URL). */
export const saveBodySchema = z.object({
  songbookId: z.string().optional(),
});

/* ========================================================================== *
 * Artists
 * ========================================================================== */

export const artistSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  biography: z.string().trim().max(4000).optional().transform((v) => v || undefined),
  image: optionalUrl,
});

/* ========================================================================== *
 * Profile, settings, users
 * ========================================================================== */

export const profileSchema = z.object({
  username: usernameSchema.optional(),
  bio: z.string().trim().max(500).optional().transform((v) => v ?? ""),
  avatar: optionalUrl,
});

export const settingsSchema = z.object({
  fontSize: z.enum(["SMALL", "MEDIUM", "LARGE", "XLARGE"]),
  fontFamily: z.enum(["MONO", "SANS", "SERIF"]),
  lineSpacing: z.enum(["TIGHT", "NORMAL", "LOOSE"]),
  noteSpacing: z.enum(["COMPACT", "NORMAL", "WIDE"]),
  sectionSpacing: z.enum(["COMPACT", "NORMAL", "WIDE"]),
  autoScrollSpeed: z.enum([
    "VERY_SLOW",
    "SLOW",
    "MEDIUM",
    "FAST",
    "VERY_FAST",
  ]),
  theme: z.enum(["LIGHT", "DARK", "SYSTEM"]),
  metronomeBpm: z.coerce.number().int().min(30).max(240),
  transpose: z.coerce.number().int().min(-12).max(12),
  showKeyboard: z.boolean(),
});

export const adminUserUpdateSchema = z
  .object({
    role: z.enum(USER_ROLES).optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.role !== undefined || v.isActive !== undefined, {
    message: "Nothing to update",
  });

/* ========================================================================== *
 * Search & pagination
 * ========================================================================== */

const pageNumber = z
  .union([z.string(), z.number()])
  .transform((v, ctx) => {
    const n = typeof v === "number" ? v : Number.parseInt(v, 10);
    if (!Number.isFinite(n) || n < 1) {
      ctx.addIssue({ code: "custom", message: "Invalid page" });
      return z.NEVER;
    }
    return Math.min(n, 10_000);
  })
  .default(1);

const optionalNumber = (min: number, max: number) =>
  z
    .union([z.string(), z.number()])
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n) || n < min || n > max) {
        ctx.addIssue({ code: "custom", message: `Expected a number ${min}–${max}` });
        return z.NEVER;
      }
      return n;
    });

export const searchParamsSchema = z.object({
  q: z
    .string()
    .trim()
    .max(120, "Search terms are too long")
    .optional()
    .transform((v) => v || undefined),
  page: pageNumber,
  sort: z
    .enum(["popular", "rating", "recent", "alpha", "difficulty", "bpm"])
    .optional()
    .default("popular"),
  difficulty: z.enum(DIFFICULTIES).optional(),
  key: z
    .string()
    .optional()
    .transform((v) => (v && isMusicalKey(v) ? normalizeKey(v) : undefined)),
  artist: z.string().trim().max(120).optional().transform((v) => v || undefined),
  bpmMin: optionalNumber(20, 300),
  bpmMax: optionalNumber(20, 300),
  minRating: optionalNumber(1, 5),
  tag: z.string().trim().max(60).optional().transform((v) => v || undefined),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/* ========================================================================== *
 * Inferred types
 * ========================================================================== */

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type SongCoreInput = z.infer<typeof songCoreSchema>;
export type CreateSongInput = z.infer<typeof createSongSchema>;
export type UpdateSongInput = z.infer<typeof updateSongSchema>;
export type ArrangementEventInput = z.infer<typeof arrangementEventSchema>;
export type SectionInput = z.infer<typeof sectionSchema>;
export type VersionInput = z.infer<typeof versionSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
export type RatingInput = z.infer<typeof ratingSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type SongbookInput = z.infer<typeof songbookSchema>;
/** Untransformed form values (react-hook-form's `TFieldValues`). */
export type SongbookInputRaw = z.input<typeof songbookSchema>;
export type ArtistInput = z.infer<typeof artistSchema>;
/** Untransformed form values (react-hook-form's `TFieldValues`). */
export type ArtistInputRaw = z.input<typeof artistSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
/** Untransformed form values (react-hook-form's `TFieldValues`). */
export type ProfileInputRaw = z.input<typeof profileSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
export type ReportInput = z.infer<typeof reportSchema>;
