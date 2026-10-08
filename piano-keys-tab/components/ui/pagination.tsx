import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  else search.delete("page");
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

function pageList(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (current >= total - 2) [total - 1, total - 2, total - 3].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: Array<number | "…"> = [];
  let previous = 0;
  for (const p of sorted) {
    if (previous && p - previous > 1) out.push("…");
    out.push(p);
    previous = p;
  }
  return out;
}

/** Server-rendered pagination that preserves the current query string. */
export function Pagination({
  page,
  totalPages,
  basePath,
  params,
  className,
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params: Record<string, string | undefined>;
  className?: string;
}) {
  if (totalPages <= 1) return null;

  const itemClass =
    "inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-border px-2 text-sm font-medium text-foreground transition-colors hover:bg-muted";
  const disabledClass = "pointer-events-none opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex flex-wrap items-center justify-center gap-1.5", className)}
    >
      <Link
        href={pageHref(basePath, params, Math.max(1, page - 1))}
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={cn(itemClass, page <= 1 && disabledClass)}
        rel="prev"
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Link>

      {pageList(page, totalPages).map((entry, i) =>
        entry === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={pageHref(basePath, params, entry)}
            aria-current={entry === page ? "page" : undefined}
            className={cn(
              itemClass,
              entry === page &&
                "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {entry}
          </Link>
        )
      )}

      <Link
        href={pageHref(basePath, params, Math.min(totalPages, page + 1))}
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={cn(itemClass, page >= totalPages && disabledClass)}
        rel="next"
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Link>
    </nav>
  );
}
