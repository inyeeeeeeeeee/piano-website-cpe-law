import Link from "next/link";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/constants";

/** Piano-key mark used across the app. */
export function PianoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={cn("h-8 w-8", className)}
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#0f172a" />
      <g fill="#f8fafc">
        <rect x="5" y="8" width="5" height="16" rx="1.2" />
        <rect x="11" y="8" width="5" height="16" rx="1.2" />
        <rect x="17" y="8" width="5" height="16" rx="1.2" />
        <rect x="23" y="8" width="4" height="16" rx="1.2" />
      </g>
      <g fill="#111827">
        <rect x="8.4" y="8" width="3.4" height="9.5" rx="1" />
        <rect x="14.4" y="8" width="3.4" height="9.5" rx="1" />
        <rect x="20.4" y="8" width="3.4" height="9.5" rx="1" />
      </g>
      <circle cx="26.5" cy="21.5" r="2.4" fill="#818cf8" />
    </svg>
  );
}

/** Wordmark + mark, links to the landing page. */
export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "flex items-center gap-2 text-foreground transition-opacity hover:opacity-80",
        className
      )}
      aria-label={`${APP_NAME} home`}
    >
      <PianoMark />
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">
          Piano Keys <span className="text-primary">Tab</span>
        </span>
        <span className="hidden text-[10px] font-medium uppercase tracking-widest text-muted-foreground sm:block">
          Your songs. Your keys. Your way.
        </span>
      </span>
    </Link>
  );
}
