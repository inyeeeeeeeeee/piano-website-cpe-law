"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Modal } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import {
  artistSchema,
  type ArtistInput,
  type ArtistInputRaw,
} from "@/lib/validation";
import { deleteJson, postJson, putJson, ApiError } from "@/lib/api-client";
import { Pencil, Plus, Trash2 } from "lucide-react";

export interface ArtistRow {
  id: string;
  name: string;
  biography: string | null;
  image: string | null;
  songCount: number;
}

function ArtistForm({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing: ArtistRow | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ArtistInputRaw, unknown, ArtistInput>({
    resolver: zodResolver(artistSchema),
    defaultValues: { name: "", biography: "", image: "" },
  });

  // Re-seed the form whenever the dialog opens for a different artist.
  useEffect(() => {
    if (!open) return;
    reset({
      name: editing?.name ?? "",
      biography: editing?.biography ?? "",
      image: editing?.image ?? "",
    });
  }, [open, editing, reset]);

  async function submit(values: ArtistInput) {
    setBusy(true);
    try {
      if (editing) {
        await putJson(`/api/artists/${editing.id}`, values);
        toast.success("Artist updated");
      } else {
        await postJson("/api/artists", values);
        toast.success("Artist created");
      }
      onClose();
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not save the artist"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={editing ? `Edit ${editing.name}` : "New artist"}
      description="Artists group the arrangements in the catalogue."
      size="sm"
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <Field label="Name" htmlFor="artist-name" error={errors.name?.message} required>
          <Input
            id="artist-name"
            {...register("name")}
            invalid={!!errors.name}
            placeholder="Artist or band name"
          />
        </Field>
        <Field
          label="Biography"
          htmlFor="artist-bio"
          error={errors.biography?.message}
          hint="Optional — shown on the artist page."
        >
          <Textarea
            id="artist-bio"
            {...register("biography")}
            invalid={!!errors.biography}
            className="min-h-24"
            maxLength={4000}
          />
        </Field>
        <Field
          label="Image URL"
          htmlFor="artist-image"
          error={errors.image?.message}
          hint="Optional. A generated cover is used otherwise."
        >
          <Input
            id="artist-image"
            {...register("image")}
            invalid={!!errors.image}
            placeholder="https://example.com/artist.jpg"
          />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? "Saving…" : editing ? "Save changes" : "Create artist"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Create / edit / delete artists from the admin table. */
export function ArtistRowActions({ artist }: { artist: ArtistRow }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function remove() {
    try {
      const res = await deleteJson<{ deletedSongs: number }>(
        `/api/artists/${artist.id}`
      );
      toast.success(
        `“${artist.name}” deleted${
          res.deletedSongs ? ` with ${res.deletedSongs} song(s)` : ""
        }`
      );
      setDeleting(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete the artist"
      );
    }
  }

  return (
    <>
      <div className="flex items-center justify-end gap-1">
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setDeleting(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Delete {artist.name}</span>
        </Button>
      </div>

      <ArtistForm
        open={editing}
        editing={artist}
        onClose={() => setEditing(false)}
      />

      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        onConfirm={remove}
        title={`Delete “${artist.name}”?`}
        description={`This cascades to ${artist.songCount} song(s) and everything beneath them (versions, ratings, comments). This cannot be undone.`}
        confirmLabel="Delete artist and songs"
        destructive
      />
    </>
  );
}

/** “New artist” button + dialog, rendered above the artist table. */
export function NewArtistButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden /> New artist
      </Button>
      <ArtistForm
        open={open}
        editing={null}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
