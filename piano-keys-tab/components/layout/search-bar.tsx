"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, User as UserIcon, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface SuggestArtist {
  name: string;
  slug: string;
  _count: { songs: number };
}
interface SuggestSong {
  title: string;
  slug: string;
  difficulty: string;
  artist: { name: string; slug: string };
}

/**
 * Header search with grouped autocomplete (Artists / Songs), debounced and
 * keyboard-navigable using the ARIA combobox pattern.
 */
export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<SuggestArtist[]>([]);
  const [songs, setSongs] = useState<SuggestSong[]>([]);
  const [active, setActive] = useState(-1);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced suggestions.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setArtists([]);
      setSongs([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/search/suggest?q=${encodeURIComponent(q)}`,
          { signal: controller.signal }
        );
        if (!res.ok) return;
        const data = (await res.json()) as {
          artists: SuggestArtist[];
          songs: SuggestSong[];
        };
        setArtists(data.artists);
        setSongs(data.songs);
        setOpen(true);
        setActive(-1);
      } catch {
        /* aborted or offline — keep previous results */
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close when clicking outside.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const options: Array<
    | { type: "artist"; href: string; label: string; sub: string }
    | { type: "song"; href: string; label: string; sub: string }
  > = [
    ...artists.map((a) => ({
      type: "artist" as const,
      href: `/artists/${a.slug}`,
      label: a.name,
      sub: `${a._count.songs} song${a._count.songs === 1 ? "" : "s"}`,
    })),
    ...songs.map((s) => ({
      type: "song" as const,
      href: `/songs/${s.slug}`,
      label: s.title,
      sub: s.artist.name,
    })),
  ];

  const goSearch = (value?: string) => {
    const q = (value ?? query).trim();
    setOpen(false);
    inputRef.current?.blur();
    router.push(q ? `/songs?q=${encodeURIComponent(q)}` : "/songs");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && options[active]) {
        setOpen(false);
        router.push(options[active].href);
      } else {
        goSearch();
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showPanel = open && (loading || artists.length > 0 || songs.length > 0 || query.trim().length > 0);

  return (
    <div ref={wrapperRef} className={cn("relative w-full max-w-md", className)}>
      <label htmlFor={`${listId}-input`} className="sr-only">
        Search songs and artists
      </label>
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          id={`${listId}-input`}
          ref={inputRef}
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={
            active >= 0 ? `${listId}-opt-${active}` : undefined
          }
          autoComplete="off"
          placeholder="Search songs, artists…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim() && setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-9 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-colors focus:border-ring focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border bg-card shadow-xl"
        >
          {loading && !artists.length && !songs.length ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">Searching…</p>
          ) : null}

          {artists.length > 0 ? (
            <div className="border-b border-border">
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Artists
              </p>
              {artists.map((a, i) => (
                <Link
                  key={a.slug}
                  href={`/artists/${a.slug}`}
                  id={`${listId}-opt-${i}`}
                  role="option"
                  aria-selected={active === i}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 text-sm",
                    active === i ? "bg-muted" : ""
                  )}
                >
                  <UserIcon aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{a.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {a._count.songs} songs
                  </span>
                </Link>
              ))}
            </div>
          ) : null}

          {songs.length > 0 ? (
            <div>
              <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Songs
              </p>
              {songs.map((s, i) => {
                const optionIndex = artists.length + i;
                return (
                  <Link
                    key={s.slug}
                    href={`/songs/${s.slug}`}
                    id={`${listId}-opt-${optionIndex}`}
                    role="option"
                    aria-selected={active === optionIndex}
                    onClick={() => setOpen(false)}
                    onMouseEnter={() => setActive(optionIndex)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 text-sm",
                      active === optionIndex ? "bg-muted" : ""
                    )}
                  >
                    <Music2 aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {s.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {s.artist.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => goSearch()}
            onMouseEnter={() => setActive(-1)}
            className="flex w-full items-center justify-between border-t border-border px-4 py-2.5 text-left text-sm font-medium text-primary hover:bg-muted"
          >
            <span>
              Search for “{query.trim()}” in songs
            </span>
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
