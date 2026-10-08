import { cn, coverHue } from "@/lib/utils";
import { Music2 } from "lucide-react";

/**
 * Deterministic generated cover art.
 *
 * The platform never ships copyrighted artwork: covers are generated from the
 * song/artist name (gradient + initials + note glyph), or rendered from an
 * author-supplied site-relative/remote URL when one exists.
 */
export function CoverImage({
  title,
  artist,
  src,
  className,
  rounded = "rounded-lg",
  priority = false,
}: {
  title: string;
  artist?: string;
  src?: string | null;
  className?: string;
  rounded?: string;
  priority?: boolean;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary author URL
      <img
        src={src}
        alt={`Cover art for ${title}`}
        loading={priority ? "eager" : "lazy"}
        className={cn("h-full w-full object-cover", rounded, className)}
      />
    );
  }

  const seed = `${title}${artist ?? ""}`;
  const hue = coverHue(seed);
  const hue2 = (hue + 42) % 360;
  const letters = title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

  return (
    <div
      role="img"
      aria-label={`Generated cover art for ${title}`}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        rounded,
        className
      )}
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 55% 32%) 0%, hsl(${hue2} 65% 48%) 100%)`,
      }}
    >
      {/* Subtle keyboard motif */}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 flex h-1/3 opacity-25"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="relative h-full flex-1 bg-white"
            style={{ borderRight: "1px solid rgba(15,23,42,0.35)" }}
          >
            {i % 7 !== 2 && i % 7 !== 6 ? (
              <div className="absolute inset-y-0 left-1/2 z-10 w-1/2 -translate-x-1/2 bg-slate-900" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-1 text-white drop-shadow">
        <span className="text-3xl font-bold tracking-tight">{letters || "♪"}</span>
        <Music2 aria-hidden="true" className="h-4 w-4 opacity-80" />
      </div>
    </div>
  );
}
