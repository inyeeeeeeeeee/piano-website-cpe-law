"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { putJson, deleteJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { DifficultyBadge } from "@/components/ui/badge";
import { CoverImage } from "@/components/ui/cover-image";
import { EmptyState } from "@/components/ui/skeleton";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

export interface SongbookEntry {
  id: string;
  order: number;
  song: {
    id: string;
    title: string;
    slug: string;
    difficulty: string;
    musicalKey: string;
    ratingAvg: number;
    coverImage: string | null;
    status: string;
    artist: { name: string; slug: string };
  };
}

/** Ordered song list of a songbook: remove + reorder (persisted server-side). */
export function SongbookSongs({ songbookId, initial }: { songbookId: string; initial: SongbookEntry[] }) {
  const router = useRouter();
  const [entries, setEntries] = useState(initial);
  const [removing, setRemoving] = useState<SongbookEntry | null>(null);
  const [busy, setBusy] = useState(false);

  async function persist(next: SongbookEntry[]) {
    setBusy(true);
    try {
      await putJson(`/api/songbooks/${songbookId}/reorder`, {
        songIds: next.map((entry) => entry.song.id),
      });
      setEntries(next);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not reorder the list");
      setEntries(entries);
    } finally {
      setBusy(false);
    }
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= entries.length) return;
    const next = [...entries];
    [next[index], next[target]] = [next[target], next[index]];
    void persist(next);
  }

  async function remove() {
    if (!removing) return;
    try {
      await deleteJson(`/api/songbooks/${songbookId}/songs/${removing.song.id}`);
      setEntries((current) => current.filter((entry) => entry.id !== removing.id));
      toast.success("Removed from songbook");
      setRemoving(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not remove that song");
    }
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="This songbook is empty"
        description="Open any song and press “Songbook” to add it here."
        action={
          <Link href="/songs" className="text-sm font-medium text-primary hover:underline">
            Browse songs
          </Link>
        }
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {entries.length} song{entries.length === 1 ? "" : "s"}
        {busy ? " · saving…" : ""}
      </p>
      <ol className="space-y-3">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className="flex items-center gap-4 rounded-xl border border-border bg-card p-3"
          >
            <span className="w-6 shrink-0 text-center text-sm font-semibold text-muted-foreground">
              {index + 1}
            </span>
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg">
              <CoverImage
                title={entry.song.title}
                artist={entry.song.artist.name}
                src={entry.song.coverImage}
                rounded="rounded-lg"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/songs/${entry.song.slug}`}
                className="truncate font-medium hover:text-primary"
              >
                {entry.song.title}
              </Link>
              <p className="truncate text-xs text-muted-foreground">
                {entry.song.artist.name} · {entry.song.musicalKey} · ★ {entry.song.ratingAvg.toFixed(1)}
              </p>
            </div>
            <DifficultyBadge value={entry.song.difficulty} showIntensity={false} className="hidden shrink-0 sm:inline-flex" />
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => move(index, -1)}
                disabled={busy || index === 0}
                aria-label={`Move ${entry.song.title} up`}
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => move(index, 1)}
                disabled={busy || index === entries.length - 1}
                aria-label={`Move ${entry.song.title} down`}
              >
                <ArrowDown className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="iconSm"
                onClick={() => setRemoving(entry)}
                aria-label={`Remove ${entry.song.title} from songbook`}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </li>
        ))}
      </ol>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        onConfirm={remove}
        title={`Remove “${removing?.song.title ?? ""}”?`}
        description="It will no longer appear in this songbook, but stays in your saved songs."
        confirmLabel="Remove"
        destructive
      />
    </div>
  );
}
