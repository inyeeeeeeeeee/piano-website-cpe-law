"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteJson, postJson, ApiError } from "@/lib/api-client";
import { Heart, Plus } from "lucide-react";

/** Save/unsave a song, with an optional "add to songbook" popover. */
export function SaveButtons({
  songId,
  initialSaved,
  signedIn,
  songbooks,
}: {
  songId: string;
  initialSaved: boolean;
  signedIn: boolean;
  songbooks: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggleSave() {
    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    const next = !saved;
    setSaved(next);
    try {
      if (next) await postJson(`/api/songs/${songId}/save`, {});
      else await deleteJson(`/api/songs/${songId}/save`);
      toast.success(next ? "Saved to your library" : "Removed from your library");
      router.refresh();
    } catch (error) {
      setSaved(!next);
      toast.error(error instanceof ApiError ? error.message : "Could not update your library");
    }
  }

  async function addToSongbook(songbookId: string, name: string) {
    setOpen(false);
    setBusy(true);
    try {
      await postJson(`/api/songs/${songId}/save`, { songbookId });
      setSaved(true);
      toast.success(`Added to “${name}”`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add to that songbook");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant={saved ? "secondary" : "outline"} onClick={toggleSave} aria-pressed={saved}>
        <Heart className={cnHeart(saved)} aria-hidden="true" />
        {saved ? "Saved" : "Save"}
      </Button>

      {signedIn && songbooks.length > 0 ? (
        <div className="relative">
          <Button variant="outline" onClick={() => setOpen((v) => !v)} disabled={busy} aria-expanded={open}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Songbook
          </Button>
          {open ? (
            <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-border bg-card p-1 shadow-lg">
              {songbooks.map((book) => (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => void addToSongbook(book.id, book.name)}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-muted"
                >
                  {book.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function cnHeart(saved: boolean): string {
  return saved ? "h-4 w-4 fill-destructive text-destructive" : "h-4 w-4";
}
