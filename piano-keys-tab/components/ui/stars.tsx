import { cn, starSlots } from "@/lib/utils";

/**
 * Read-only star rating. Always rendered with a text alternative so the value
 * is available to screen readers and to users who cannot rely on colour.
 */
export function Stars({
  rating,
  count,
  size = "md",
  className,
}: {
  rating: number;
  count?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const slots = starSlots(rating);
  const glyphClass =
    size === "sm" ? "text-xs" : size === "lg" ? "text-xl" : "text-sm";

  return (
    <span
      className={cn("inline-flex items-center gap-1", className)}
      title={`${rating.toFixed(1)} out of 5${count !== undefined ? ` (${count} ratings)` : ""}`}
    >
      <span aria-hidden="true" className={cn("text-star", glyphClass)}>
        {slots.map((slot, i) => {
          if (slot === "full") return <span key={i}>★</span>;
          if (slot === "empty") return <span key={i}>☆</span>;
          return (
            <span key={i} className="relative inline-block">
              <span className="text-star/30">★</span>
              <span className="absolute inset-y-0 left-0 w-1/2 overflow-hidden text-star">
                ★
              </span>
            </span>
          );
        })}
      </span>
      <span
        className={cn(
          "font-medium text-foreground",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        {rating.toFixed(1)}
      </span>
      <span className="sr-only">
        Rated {rating.toFixed(1)} out of 5
        {count !== undefined ? ` from ${count} ratings` : ""}
      </span>
      {count !== undefined && count > 0 ? (
        <span
          className={cn(
            "text-muted-foreground",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          ({count})
        </span>
      ) : null}
    </span>
  );
}
