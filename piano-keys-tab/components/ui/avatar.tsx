"use client";

import { useState } from "react";
import { cn, coverHue, initials } from "@/lib/utils";

/**
 * Avatar with graceful fallback to generated initials.
 *
 * User-supplied avatar URLs are rendered with a plain <img> (not next/image)
 * on purpose: arbitrary remote hosts would otherwise require opening the
 * image optimizer to every domain. If the image fails to load we fall back to
 * the initials — never a broken-image icon.
 */
export function Avatar({
  name,
  src,
  size = 36,
  className,
}: {
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const hue = coverHue(name || "guest");
  const background = `hsl(${hue} 65% 92%)`;
  const foreground = `hsl(${hue} 45% 32%)`;

  if (src && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- arbitrary user URL
      <img
        src={src}
        alt={`${name}'s avatar`}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold",
        className
      )}
      style={{
        width: size,
        height: size,
        background,
        color: foreground,
        fontSize: Math.max(10, Math.round(size * 0.38)),
      }}
    >
      {initials(name)}
    </span>
  );
}
