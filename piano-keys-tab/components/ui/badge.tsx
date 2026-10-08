import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import {
  DIFFICULTY_META,
  STATUS_META,
  difficultyMeta,
  isDifficulty,
} from "@/lib/constants";

/** Generic pill badge. Text is always present (never colour alone). */
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        className
      )}
      {...props}
    />
  );
}

/**
 * Difficulty badge with an accessible intensity meter.
 * Colour is supplementary — the label text carries the meaning.
 */
export function DifficultyBadge({
  value,
  className,
  showIntensity = true,
}: {
  value: string;
  className?: string;
  showIntensity?: boolean;
}) {
  const meta = difficultyMeta(value);
  return (
    <Badge className={cn(meta.badge, className)} title={`Difficulty: ${meta.label}`}>
      <span>{meta.label}</span>
      {showIntensity ? (
        <span className="flex items-center gap-px" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((step) => (
            <span
              key={step}
              className={cn(
                "h-1 w-1 rounded-full",
                step <= meta.intensity ? "bg-current" : "bg-current opacity-25"
              )}
            />
          ))}
        </span>
      ) : null}
      <span className="sr-only">
        (difficulty {meta.intensity} of 5)
      </span>
    </Badge>
  );
}

/** Moderation / publication status badge. */
export function StatusBadge({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const meta =
    STATUS_META[value] ?? {
      label: value,
      badge: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300",
    };
  return (
    <Badge className={cn(meta.badge, className)}>
      <span>{meta.label}</span>
    </Badge>
  );
}

/** Musical key badge (e.g. C, Am, F#m). */
export function KeyBadge({ value, className }: { value: string; className?: string }) {
  return (
    <Badge
      className={cn(
        "bg-primary-soft text-primary ring-primary/20",
        className
      )}
      title={`Musical key: ${value}`}
    >
      <span aria-hidden="true">♪</span>
      <span>{value}</span>
    </Badge>
  );
}

export function FeaturedBadge({ className }: { className?: string }) {
  return (
    <Badge
      className={cn(
        "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:ring-amber-900",
        className
      )}
    >
      ★ Featured
    </Badge>
  );
}

export { DIFFICULTY_META, isDifficulty };
