"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import { deleteJson, patchJson, ApiError } from "@/lib/api-client";
import { SONG_STATUSES } from "@/lib/constants";
import { Star, Trash2 } from "lucide-react";

/**
 * Row controls for the admin song table: publication status, featuring and
 * deletion. Status/feature changes go through PATCH /api/admin/songs/:id
 * (ADMIN-only server-side, audited, versions kept in sync); deletion goes
 * through DELETE /api/songs/:id.
 */
export function SongRowActions({
  id,
  title,
  status,
  isFeatured,
}: {
  id: string;
  title: string;
  status: string;
  isFeatured: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function updateStatus(next: string) {
    if (next === status) return;
    setBusy(true);
    try {
      await patchJson(`/api/admin/songs/${id}`, { status: next });
      toast.success(`“${title}” is now ${next.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the status"
      );
    } finally {
      setBusy(false);
    }
  }

  async function toggleFeatured() {
    setBusy(true);
    try {
      await patchJson(`/api/admin/songs/${id}`, { isFeatured: !isFeatured });
      toast.success(
        isFeatured ? `“${title}” removed from featured` : `“${title}” featured`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the song"
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await deleteJson(`/api/songs/${id}`);
      toast.success(`“${title}” deleted`);
      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete the song"
      );
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Select
          aria-label={`Status for ${title}`}
          value={status}
          disabled={busy}
          onChange={(e) => void updateStatus(e.target.value)}
          className="h-8 w-auto min-w-28 rounded-md px-2 py-1 text-xs"
        >
          {SONG_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>

        <Button
          size="sm"
          variant={isFeatured ? "primary" : "outline"}
          onClick={() => void toggleFeatured()}
          disabled={busy}
          aria-pressed={isFeatured}
          title={isFeatured ? "Remove from featured" : "Feature on the homepage"}
        >
          <Star
            className={isFeatured ? "h-3.5 w-3.5 fill-current" : "h-3.5 w-3.5"}
            aria-hidden
          />
          {isFeatured ? "Featured" : "Feature"}
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Delete {title}</span>
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title={`Delete “${title}”?`}
        description="This permanently removes the song with every version, rating, comment and save. It cannot be undone."
        confirmLabel="Delete permanently"
        destructive
      />
    </>
  );
}
