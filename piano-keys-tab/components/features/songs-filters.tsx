"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Input, Select } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Search, SlidersHorizontal, X } from "lucide-react";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterValues {
  q: string;
  artist: string;
  difficulty: string;
  key: string;
  tag: string;
  sort: string;
}

interface Props {
  initial: FilterValues;
  artistOptions: FilterOption[];
  difficulties: FilterOption[];
  keys: FilterOption[];
  tags: FilterOption[];
  sorts: FilterOption[];
}

/**
 * Filter panel whose state lives in the URL, so results are shareable and the
 * back button behaves as users expect. The query box is debounced; selects
 * apply immediately.
 */
export function SongsFilters({
  initial,
  artistOptions,
  difficulties,
  keys,
  tags,
  sorts,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState<FilterValues>(initial);
  const [panelOpen, setPanelOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValues(initial);
  }, [initial]);

  function push(next: FilterValues, replace = false) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(next)) {
      if (value && !(key === "sort" && value === "popular")) params.set(key, value);
    }
    const qs = params.toString();
    const url = `/songs${qs ? `?${qs}` : ""}`;
    startTransition(() => {
      if (replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    });
  }

  // Debounced live search while typing.
  useEffect(() => {
    if (values.q === initial.q) return;
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => push({ ...values, q: values.q }, true), 350);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values.q]);

  const dirty = Boolean(values.q || values.artist || values.difficulty || values.key || values.tag);

  function clearAll() {
    const cleared: FilterValues = { q: "", artist: "", difficulty: "", key: "", tag: "", sort: values.sort };
    setValues(cleared);
    push(cleared);
  }

  const selectClass =
    "w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-sm transition-colors focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-ring cursor-pointer";

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <SlidersHorizontal className="h-4 w-4" aria-hidden="true" /> Filters
        </h2>
        <div className="flex items-center gap-3">
          {dirty ? (
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-destructive"
            >
              Clear
            </button>
          ) : null}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground lg:hidden"
            onClick={() => setPanelOpen((open) => !open)}
            aria-expanded={panelOpen}
            aria-controls="song-filter-panel"
          >
            <span className="sr-only">Toggle filter panel</span>
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div id="song-filter-panel" className={`${panelOpen ? "block" : "hidden"} space-y-4 p-4 lg:block`}>
        <div>
          <label htmlFor="filter-q" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Search
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="filter-q"
              value={values.q}
              onChange={(e) => setValues((v) => ({ ...v, q: e.target.value }))}
              placeholder="Title, artist, tag…"
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <label htmlFor="filter-artist" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Artist
          </label>
          <Select
            id="filter-artist"
            value={values.artist}
            onChange={(e) => push({ ...values, artist: e.target.value })}
            className={selectClass}
          >
            <option value="">All artists</option>
            {artistOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-difficulty" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Difficulty
          </label>
          <Select
            id="filter-difficulty"
            value={values.difficulty}
            onChange={(e) => push({ ...values, difficulty: e.target.value })}
            className={selectClass}
          >
            <option value="">Any difficulty</option>
            {difficulties.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-key" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Key
          </label>
          <Select
            id="filter-key"
            value={values.key}
            onChange={(e) => push({ ...values, key: e.target.value })}
            className={selectClass}
          >
            <option value="">Any key</option>
            {keys.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-tag" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Tag / genre
          </label>
          <Select
            id="filter-tag"
            value={values.tag}
            onChange={(e) => push({ ...values, tag: e.target.value })}
            className={selectClass}
          >
            <option value="">Any tag</option>
            {tags.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="filter-sort" className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Sort by
          </label>
          <Select
            id="filter-sort"
            value={values.sort}
            onChange={(e) => push({ ...values, sort: e.target.value })}
            className={selectClass}
          >
            {sorts.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <Button className="w-full" onClick={() => push(values)} disabled={isPending}>
          {isPending ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" /> Applying…
            </>
          ) : (
            "Apply filters"
          )}
        </Button>
      </div>
    </div>
  );
}
