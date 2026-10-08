"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { songbookSchema, type SongbookInput, type SongbookInputRaw } from "@/lib/validation";
import { postJson, putJson, deleteJson, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/modal";
import { Field, Input, Textarea } from "@/components/ui/field";
import { BookMarked, Pencil, Plus, Trash2 } from "lucide-react";

export interface SongbookRow {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
  _count: { songs: number };
}

/** Create / rename / delete songbooks (used by /songbooks). */
export function SongbookManager({ initial }: { initial: SongbookRow[] }) {
  const router = useRouter();
  const [books, setBooks] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<SongbookRow | null>(null);
  const [deleting, setDeleting] = useState<SongbookRow | null>(null);
  const [busy, setBusy] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SongbookInputRaw, unknown, SongbookInput>({
    resolver: zodResolver(songbookSchema),
    defaultValues: { name: "", description: "" },
  });

  function openCreate() {
    reset({ name: "", description: "" });
    setCreating(true);
  }

  function openEdit(book: SongbookRow) {
    reset({ name: book.name, description: book.description ?? "" });
    setEditing(book);
  }

  async function submit(values: SongbookInput) {
    setBusy(true);
    try {
      if (editing) {
        await putJson(`/api/songbooks/${editing.id}`, values);
        setBooks((current) =>
          current.map((b) =>
            b.id === editing.id ? { ...b, ...values, description: values.description ?? null } : b
          )
        );
        toast.success("Songbook updated");
      } else {
        const res = await postJson<{ songbook: SongbookRow }>("/api/songbooks", values);
        setBooks((current) => [res.songbook, ...current]);
        toast.success("Songbook created");
      }
      setCreating(false);
      setEditing(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save the songbook");
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteJson(`/api/songbooks/${deleting.id}`);
      setBooks((current) => current.filter((b) => b.id !== deleting.id));
      toast.success("Songbook deleted");
      setDeleting(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete the songbook");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {books.length} songbook{books.length === 1 ? "" : "s"}
        </p>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" aria-hidden="true" /> New songbook
        </Button>
      </div>

      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((book) => (
          <li
            key={book.id}
            className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition hover:shadow-md"
          >
            <Link href={`/songbooks/${book.id}`} className="flex-1">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <BookMarked className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 className="mt-3 font-semibold group-hover:text-primary">{book.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                {book.description ?? "No description"}
              </p>
              <p className="mt-3 text-xs text-muted-foreground">
                {book._count.songs} song{book._count.songs === 1 ? "" : "s"}
              </p>
            </Link>
            <div className="mt-4 flex items-center gap-1 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => openEdit(book)}>
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleting(book)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={creating || !!editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? "Edit songbook" : "New songbook"}
        description="Songbooks group the arrangements you are working on."
        size="sm"
      >
        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <Field label="Name" htmlFor="songbook-name" error={errors.name?.message} required>
            <Input
              id="songbook-name"
              {...register("name")}
              invalid={!!errors.name}
              placeholder="Wedding repertoire"
            />
          </Field>
          <Field label="Description" htmlFor="songbook-desc" error={errors.description?.message}>
            <Textarea
              id="songbook-desc"
              {...register("description")}
              invalid={!!errors.description}
              placeholder="Optional notes for this collection"
              className="min-h-20"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCreating(false);
                setEditing(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : editing ? "Save changes" : "Create songbook"}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        title={`Delete “${deleting?.name ?? ""}”?`}
        description="The songs inside stay in the catalogue — only this collection is removed."
        confirmLabel="Delete songbook"
        destructive
      />
    </div>
  );
}
