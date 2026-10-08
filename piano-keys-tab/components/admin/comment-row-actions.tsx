"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/modal";
import { Select } from "@/components/ui/field";
import { deleteJson, patchJson, ApiError } from "@/lib/api-client";
import { COMMENT_STATUSES } from "@/lib/constants";
import { Flag, Trash2 } from "lucide-react";

/** Status change + deletion for one comment in the moderation queue. */
export function CommentRowActions({
  id,
  preview,
  status,
  reportCount,
}: {
  id: string;
  preview: string;
  status: string;
  reportCount: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function updateStatus(next: string) {
    if (next === status) return;
    setBusy(true);
    try {
      await patchJson(`/api/admin/comments/${id}`, { status: next });
      toast.success(`Comment marked ${next.toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not update the comment"
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    try {
      await deleteJson(`/api/admin/comments/${id}`);
      toast.success("Comment deleted");
      setConfirming(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Could not delete the comment"
      );
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        {reportCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive ring-1 ring-inset ring-destructive/20">
            <Flag className="h-3 w-3" aria-hidden /> {reportCount} open
          </span>
        ) : null}
        <Select
          aria-label="Comment status"
          value={status}
          disabled={busy}
          onChange={(e) => void updateStatus(e.target.value)}
          className="h-8 w-auto min-w-28 rounded-md px-2 py-1 text-xs"
        >
          {COMMENT_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </Select>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => setConfirming(true)}
          disabled={busy}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
          <span className="sr-only">Delete comment</span>
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        title="Delete this comment?"
        description={`“${preview}” will be permanently removed.`}
        confirmLabel="Delete comment"
        destructive
      />
    </>
  );
}
