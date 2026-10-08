"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Stars } from "@/components/ui/stars";
import { postJson, putJson, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Star } from "lucide-react";

/**
 * Interactive 1–5 star rating.
 * The read-only <Stars> summary is always shown next to it so the aggregate
 * stays visible while the user hovers their own score.
 */
export function RatingControl({
  songId,
  userRating,
  signedIn,
  ratingAvg,
  ratingCount,
}: {
  songId: string;
  userRating: number | null;
  signedIn: boolean;
  ratingAvg: number;
  ratingCount: number;
}) {
  const router = useRouter();
  const [hovered, setHovered] = useState(0);
  const [value, setValue] = useState(userRating ?? 0);
  const [busy, setBusy] = useState(false);

  async function rate(next: number) {
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (next < 1 || next > 5 || busy) return;

    const previous = value;
    setValue(next);
    setBusy(true);
    try {
      const method = userRating ? putJson : postJson;
      await method(`/api/songs/${songId}/rating`, { value: next });
      toast.success(userRating ? "Rating updated" : "Thanks for rating!");
      // The server recomputes the cached average — re-render with fresh data.
      router.refresh();
    } catch (error) {
      setValue(previous);
      toast.error(error instanceof ApiError ? error.message : "Could not save your rating");
    } finally {
      setBusy(false);
    }
  }

  const shown = hovered || value;

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div
        className="flex items-center gap-1"
        role="radiogroup"
        aria-label="Rate this arrangement"
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((slot) => (
          <button
            key={slot}
            type="button"
            role="radio"
            aria-checked={value === slot}
            aria-label={`Rate ${slot} out of 5`}
            disabled={busy}
            onMouseEnter={() => setHovered(slot)}
            onFocus={() => setHovered(slot)}
            onBlur={() => setHovered(0)}
            onClick={() => void rate(slot)}
            className="p-0.5 transition disabled:opacity-50"
          >
            <Star
              aria-hidden="true"
              className={cn(
                "h-6 w-6 transition-colors",
                slot <= shown ? "fill-star text-star" : "text-muted-foreground/40"
              )}
            />
          </button>
        ))}
      </div>
      <Stars rating={ratingAvg} count={ratingCount} />
      <p className="text-xs text-muted-foreground">
        {value ? `You rated this ${value} out of 5` : "Sign in to rate this arrangement"}
      </p>
    </div>
  );
}
