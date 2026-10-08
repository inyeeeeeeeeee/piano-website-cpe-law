import Link from "next/link";
import type { Metadata } from "next";
import { buttonClasses } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <SearchX className="h-7 w-7" aria-hidden="true" />
      </span>
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight">404 — Page not found</h1>
      <p className="mt-3 text-muted-foreground">
        The page you are looking for does not exist, or the arrangement was removed from the
        catalogue.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/songs" className={buttonClasses("primary", "md")}>
          Browse songs
        </Link>
        <Link href="/" className={buttonClasses("outline", "md")}>
          Back home
        </Link>
      </div>
    </div>
  );
}
