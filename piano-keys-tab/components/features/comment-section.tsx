"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/skeleton";
import { postJson, deleteJson, ApiError } from "@/lib/api-client";
import { timeAgo } from "@/lib/utils";
import { Flag, MessageSquare, Trash2 } from "lucide-react";

export interface CommentItem {
  id: string;
  content: string;
  status: string;
  createdAt: string;
  user: { id: string; username: string; avatar: string | null };
}

const MAX = 1000;

/** Threaded-free comment list + composer + report/delete actions. */
export function CommentSection({
  songKey,
  initialComments,
  signedIn,
  currentUserId,
  isAdmin,
}: {
  /** Song slug (or id) used in the API path. */
  songKey: string;
  initialComments: CommentItem[];
  signedIn: boolean;
  currentUserId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentItem[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState<CommentItem | null>(null);
  const [reason, setReason] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;

    if (!signedIn) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/songs/${songKey}`)}`);
      return;
    }

    setBusy(true);
    try {
      const res = await postJson<{ comment: CommentItem }>(`/api/songs/${songKey}/comments`, {
        content,
      });
      setComments((current) => [res.comment, ...current]);
      setDraft("");
      toast.success("Comment posted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not post your comment");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await deleteJson(`/api/comments/${id}`);
      setComments((current) => current.filter((c) => c.id !== id));
      toast.success("Comment deleted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not delete that comment");
    }
  }

  async function sendReport() {
    if (!reporting || reason.trim().length < 3) return;
    try {
      await postJson(`/api/comments/${reporting.id}/report`, {
        entityType: "COMMENT",
        entityId: reporting.id,
        reason: reason.trim(),
      });
      toast.success("Report sent — a moderator will review it");
      setReporting(null);
      setReason("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not send the report");
    }
  }

  return (
    <section aria-labelledby="comments-heading" className="space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 id="comments-heading" className="text-xl font-bold">
          Comments <span className="text-muted-foreground">({comments.length})</span>
        </h2>
      </div>

      <form onSubmit={submit} className="space-y-2">
        <Field
          label={signedIn ? "Add a comment" : "Sign in to comment"}
          htmlFor="comment-draft"
          hint={`${draft.length}/${MAX} characters`}
        >
          <Textarea
            id="comment-draft"
            value={draft}
            maxLength={MAX}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Share a tip about this arrangement…"
            className="min-h-24"
          />
        </Field>
        <div className="flex justify-end">
          <Button type="submit" disabled={busy || draft.trim().length === 0}>
            {busy ? "Posting…" : "Post comment"}
          </Button>
        </div>
      </form>

      {comments.length === 0 ? (
        <EmptyState
          title="No comments yet"
          description="Be the first to leave a tip or a word of encouragement."
        />
      ) : (
        <ul className="space-y-4">
          {comments.map((comment) => {
            const mine = currentUserId === comment.user.id;
            return (
              <li
                key={comment.id}
                className="rounded-xl border border-border bg-card p-4"
                data-status={comment.status}
              >
                <div className="flex items-start gap-3">
                  <Avatar
                    src={comment.user.avatar}
                    name={comment.user.username}
                    size={36}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 text-sm">
                      <span className="font-semibold">{comment.user.username}</span>
                      <time
                        dateTime={comment.createdAt}
                        className="text-xs text-muted-foreground"
                      >
                        {timeAgo(comment.createdAt)}
                      </time>
                      {comment.status !== "APPROVED" ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Awaiting review
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm">{comment.content}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {mine || isAdmin ? (
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => void remove(comment.id)}
                        aria-label="Delete comment"
                        title="Delete comment"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" aria-hidden="true" />
                      </Button>
                    ) : null}
                    {!mine && signedIn ? (
                      <Button
                        variant="ghost"
                        size="iconSm"
                        onClick={() => setReporting(comment)}
                        aria-label="Report comment"
                        title="Report comment"
                      >
                        <Flag className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Modal
        open={!!reporting}
        onClose={() => setReporting(null)}
        title="Report comment"
        description="Reports are reviewed by moderators. Please explain what is wrong."
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setReporting(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => void sendReport()}
              disabled={reason.trim().length < 3}
              variant="destructive"
            >
              Send report
            </Button>
          </>
        }
      >
        <Field label="Reason" htmlFor="report-reason" error={reason.length > 0 && reason.trim().length < 3 ? "Describe the reason (min 3 characters)" : undefined}>
          <Textarea
            id="report-reason"
            value={reason}
            maxLength={500}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Spam, off-topic, offensive…"
          />
        </Field>
        <p className="mt-3 text-xs text-muted-foreground">
          False reports may lead to restrictions on your account.{" "}
          <Link href="/contact" className="text-primary hover:underline">
            Contact us
          </Link>{" "}
          if you are unsure.
        </p>
      </Modal>
    </section>
  );
}
